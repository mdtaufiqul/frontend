"use client";

import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, Video, User, Phone, Mail, XCircle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import api from '@/utils/api';
import { usePermissionApi } from '@/hooks/usePermissionApi';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/hooks/useSocket';
import { Button } from '@/components/ui/button';
import Badge from '@/components/ui/badge';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Appointment {
    id: string;
    date: string;
    type: 'online' | 'in-person';
    status: string;
    notes?: string;
    doctor: {
        id: string;
        name: string;
        email: string;
    };
    service?: {
        id: string;
        name: string;
        duration: string;
    };
    clinic?: {
        id: string;
        name: string;
        address: string;
    };
}

const PatientAppointments: React.FC = () => {
    const { user } = useAuth();
    const { get, patch, can } = usePermissionApi();
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming');
    const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
    const [appointmentIdToCancel, setAppointmentIdToCancel] = useState<string | null>(null);

    const fetchAppointments = React.useCallback(async () => {
        if (!user) return;
        try {
            const response = await get('view_appointments', '/appointments');
            if (response) {
                setAppointments(response.data);
            }
        } catch (error: any) {
            console.error('Failed to fetch appointments:', error);
        } finally {
            setIsLoading(false);
        }
    }, [user, get]);

    useEffect(() => {
        if (user) {
            fetchAppointments();
        }
    }, [user, fetchAppointments]);

    const socket = useSocket();
    useEffect(() => {
        if (!socket) return;

        const handleUpdate = () => {
            console.log('[Appointments] Real-time appointment update received');
            fetchAppointments();
        };

        socket.on('appointmentUpdated', handleUpdate);
        return () => {
            socket.off('appointmentUpdated', handleUpdate);
        };
    }, [socket, fetchAppointments]);

    const handleCancelAppointment = (appointmentId: string) => {
        setAppointmentIdToCancel(appointmentId);
        setIsCancelDialogOpen(true);
    };

    const confirmCancelAppointment = async () => {
        if (!appointmentIdToCancel) return;

        try {
            const res = await patch('manage_appointments', `/appointments/${appointmentIdToCancel}`, { status: 'cancelled' });
            if (res) {
                setAppointments(prev =>
                    prev.map(apt => apt.id === appointmentIdToCancel ? { ...apt, status: 'cancelled' } : apt)
                );
            }
        } catch (error: any) {
            console.error('Failed to cancel appointment:', error);
            // alert('Failed to cancel appointment. You might not have permission.');
        } finally {
            setIsCancelDialogOpen(false);
            setAppointmentIdToCancel(null);
        }
    };

    const now = new Date();
    const filteredAppointments = appointments.filter(apt => {
        const aptDate = new Date(apt.date);
        if (filter === 'upcoming') return aptDate >= now && apt.status !== 'cancelled';
        if (filter === 'past') return aptDate < now || apt.status === 'cancelled';
        return true;
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'scheduled': return 'bg-blue-100 text-blue-700';
            case 'confirmed': return 'bg-green-100 text-green-700';
            case 'completed': return 'bg-gray-100 text-gray-700';
            case 'cancelled': return 'bg-red-100 text-red-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-black text-slate-900 mb-2">My Appointments</h1>
                <p className="text-slate-500">View and manage your upcoming appointments</p>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 mb-6">
                <Button
                    variant={filter === 'upcoming' ? 'default' : 'outline'}
                    onClick={() => setFilter('upcoming')}
                >
                    Upcoming
                </Button>
                <Button
                    variant={filter === 'past' ? 'default' : 'outline'}
                    onClick={() => setFilter('past')}
                >
                    Past
                </Button>
                <Button
                    variant={filter === 'all' ? 'default' : 'outline'}
                    onClick={() => setFilter('all')}
                >
                    All
                </Button>
            </div>

            {/* Appointments List */}
            {isLoading ? (
                <div className="text-center py-20 text-slate-400">Loading appointments...</div>
            ) : filteredAppointments.length === 0 ? (
                <div className="text-center py-20">
                    <Calendar className="mx-auto mb-4 text-slate-300" size={48} />
                    <p className="text-slate-400">No appointments found</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredAppointments.map(appointment => (
                        <div
                            key={appointment.id}
                            className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg transition-shadow"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="p-2 bg-primary-50 rounded-xl">
                                            {appointment.type === 'online' ? (
                                                <Video className="text-primary-600" size={20} />
                                            ) : (
                                                <MapPin className="text-primary-600" size={20} />
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900">
                                                {appointment.service?.name || 'Consultation'}
                                            </h3>
                                            <p className="text-sm text-slate-500">
                                                {appointment.type === 'online' ? 'Online Consultation' : 'In-Person Visit'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                            <Calendar size={16} className="text-slate-400" />
                                            <span>{format(new Date(appointment.date), 'EEEE, MMMM d, yyyy')}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                            <Clock size={16} className="text-slate-400" />
                                            <span>{format(new Date(appointment.date), 'h:mm a')}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                            <User size={16} className="text-slate-400" />
                                            <span>Dr. {appointment.doctor.name}</span>
                                        </div>
                                        {appointment.clinic && (
                                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                                <MapPin size={16} className="text-slate-400" />
                                                <span>{appointment.clinic.name}</span>
                                            </div>
                                        )}
                                    </div>

                                    {appointment.notes && (
                                        <div className="bg-slate-50 rounded-lg p-3 mb-4">
                                            <p className="text-sm text-slate-600">{appointment.notes}</p>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-2">
                                        <Badge className={getStatusColor(appointment.status)}>
                                            {appointment.status}
                                        </Badge>
                                        {appointment.service?.duration && (
                                            <span className="text-xs text-slate-400">
                                                Duration: {appointment.service.duration}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex flex-col gap-2">
                                    {/* Join Meeting Button for Online Appointments */}
                                    {appointment.type === 'online' &&
                                        appointment.status === 'scheduled' &&
                                        new Date(appointment.date) > now && (
                                            <Button
                                                onClick={async () => {
                                                    try {
                                                        const response = await get('view_appointments', `/appointments/${appointment.id}/meeting-url`);
                                                        if (response?.data?.meetingUrl) {
                                                            window.open(response.data.meetingUrl, '_blank');
                                                        } else {
                                                            alert('Meeting link not available yet. Please check back closer to your appointment time.');
                                                        }
                                                    } catch (error: any) {
                                                        console.error('Failed to get meeting URL:', error);
                                                        alert('Failed to get meeting link. Please contact support.');
                                                    }
                                                }}
                                                className="bg-primary-600 hover:bg-primary-700"
                                            >
                                                <Video size={16} className="mr-2" />
                                                Join Meeting
                                            </Button>
                                        )}

                                    {/* Cancel Button - Permission Guarded */}
                                    {can('manage_appointments') && appointment.status === 'scheduled' && new Date(appointment.date) > now && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleCancelAppointment(appointment.id)}
                                            className="text-red-600 hover:bg-red-50"
                                        >
                                            <XCircle size={16} className="mr-1" />
                                            Cancel
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
                <AlertDialogContent className="max-w-[400px]">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Cancel Appointment</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to cancel this appointment? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Keep Appointment</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmCancelAppointment}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            Cancel Appointment
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default PatientAppointments;
