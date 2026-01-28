"use client";

import React, { useEffect, useState } from 'react';
import { Search, Filter, MoreHorizontal, MessageSquare, Mail, AlertTriangle, UserPlus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Badge from '@/components/ui/badge';
import api from '@/utils/api';
import PatientModal from '@/components/ui/PatientModal';
import { useSocket } from '@/hooks/useSocket';
import { usePermissionApi } from '@/hooks/usePermissionApi';
import { useAuth } from '@/context/AuthContext';
import { PERMISSIONS } from '@/config/apiPermissions';
import { toast } from 'sonner';

interface Patient {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    dob?: string;
    gender?: string;
    address?: string;
    createdAt: string;
    // Computed/Front-end fields
    age?: number;
    appointments?: any[];
    status?: 'Active' | 'Inactive';
    risk?: 'Low' | 'Medium' | 'High';
}

const Patients: React.FC = () => {
    const router = useRouter();
    const { can, user } = useAuth();
    const { get: apiGet, post: apiPost } = usePermissionApi();
    const [patients, setPatients] = useState<Patient[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Mock filters for now
    const [filters, setFilters] = useState({
        status: 'All',
        risk: 'All'
    });

    const fetchPatients = async () => {
        setIsLoading(true);
        try {
            // Using PERMISSIONS constants for strict checking
            const response = await apiGet(PERMISSIONS.VIEW_ALL_PATIENTS, '/patients');
            if (!response) return;

            // Enrich with mock status/risk data for UI demo purposes
            const enrichedPatients = response.data.map((p: any) => {
                let displayAge = p.age;
                if (!displayAge && p.dob) {
                    displayAge = new Date().getFullYear() - new Date(p.dob).getFullYear();
                }

                return {
                    ...p,
                    status: 'Active',
                    risk: 'Low',
                    age: displayAge || 'N/A'
                };
            });
            setPatients(enrichedPatients);
        } catch (error) {
            console.error('Failed to fetch patients:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPatients();
    }, []);

    // Real-time updates
    const socket = useSocket();
    useEffect(() => {
        const handleUpdate = () => {
            fetchPatients();
        };
        socket.on('appointmentUpdated', handleUpdate);
        return () => {
            socket.off('appointmentUpdated', handleUpdate);
        };
    }, [socket]);

    const handleCreatePatient = async (data: any) => {
        try {
            await apiPost(PERMISSIONS.MANAGE_PATIENTS, '/patients', {
                name: `${data.firstName} ${data.lastName}`,
                email: data.email,
                phone: data.phone,
                address: data.address,
                age: data.age ? parseInt(data.age, 10) : undefined,
                gender: data.gender || 'Other',
                dob: null // defaulting for now
            });
            fetchPatients();
            setIsCreateModalOpen(false);
        } catch (error) {
            console.error('Failed to create patient:', error);
            alert('Failed to create patient');
        }
    };

    const handleMessageClick = async (e: React.MouseEvent, patientId: string) => {
        e.stopPropagation(); // Prevent row click
        try {
            // Create or retrieve conversation
            // Assuming MANAGE_COMMUNICATIONS or similar permission
            const res = await apiPost(PERMISSIONS.MANAGE_COMMUNICATIONS, '/conversations', { patientId });
            if (res) {
                const conversationId = res.data.id;
                // Redirect to messages
                router.push(`/messages?conversationId=${conversationId}`);
            }
        } catch (error) {
            console.error('Failed to start conversation:', error);
            alert('Failed to start conversation'); // Simple feedback
        }
    };

    const filteredPatients = patients.filter(patient => {
        const matchesSearch = patient.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = filters.status === 'All' || patient.status === filters.status;
        const matchesRisk = filters.risk === 'All' || patient.risk === filters.risk;
        return matchesSearch && matchesStatus && matchesRisk;
    });

    const handleDeletePatient = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this patient record? This action is permanent.')) return;
        try {
            await api.delete(`/patients/${id}`);
            toast.success('Patient record deleted');
            fetchPatients();
        } catch (error) {
            console.error('Failed to delete patient:', error);
            toast.error('Failed to delete patient');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">
                        {user?.role === 'DOCTOR' ? 'Your Patients' : 'Patients'}
                    </h1>
                    <p className="text-slate-500">
                        {user?.role === 'DOCTOR'
                            ? 'Manage patients with clinical relationships or assignments.'
                            : 'Manage your patient directory and recalls.'}
                    </p>
                </div>
                {can(PERMISSIONS.MANAGE_PATIENTS) && (
                    <Button
                        onClick={() => setIsCreateModalOpen(true)}
                    >
                        <UserPlus size={16} className="mr-2" />
                        Add Patient
                    </Button>
                )}
            </div>

            <Card className="p-0">
                {/* Toolbar */}
                <div className="p-4 border-b border-slate-100 flex flex-col gap-4 bg-slate-50/50 transition-all duration-300">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4 flex-1">
                            <div className="relative w-64">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search by name, phone..."
                                    className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-100"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <Button
                                variant={isFilterOpen ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setIsFilterOpen(!isFilterOpen)}
                            >
                                <Filter size={14} className="mr-2" />
                                Filters {isFilterOpen ? '(On)' : ''}
                            </Button>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500">Showing {filteredPatients.length} patients</span>
                        </div>
                    </div>

                    {/* Filter Panel */}
                    {isFilterOpen && (
                        <div className="pt-4 border-t border-slate-200 grid grid-cols-2 gap-8 animate-in slide-in-from-top-2 duration-200">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Status</label>
                                <div className="flex items-center gap-2">
                                    {['All', 'Active', 'Inactive'].map(status => (
                                        <button
                                            key={status}
                                            onClick={() => setFilters(prev => ({ ...prev, status }))}
                                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors border ${filters.status === status
                                                ? 'bg-slate-800 text-white border-slate-800'
                                                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                                                }`}
                                        >
                                            {status}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Risk Level</label>
                                <div className="flex items-center gap-2">
                                    {['All', 'Low', 'Medium', 'High'].map(risk => (
                                        <button
                                            key={risk}
                                            onClick={() => setFilters(prev => ({ ...prev, risk }))}
                                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors border ${filters.risk === risk
                                                ? 'bg-slate-800 text-white border-slate-800'
                                                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                                                }`}
                                        >
                                            {risk}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 font-medium">
                            <tr>
                                <th className="px-6 py-3">Patient Name</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3">Last Scheduled</th>
                                <th className="px-6 py-3">Schedule Status</th>
                                <th className="px-6 py-3">No-Show Risk</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                                        Loading patients...
                                    </td>
                                </tr>
                            ) : filteredPatients.length > 0 ? (
                                filteredPatients.map((patient) => (
                                    <tr
                                        key={patient.id}
                                        onClick={() => router.push(`/patients/${patient.id}`)}
                                        className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold text-xs">
                                                    {patient.name.split(' ').map((n: string) => n[0]).join('')}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-900">{patient.name}</p>
                                                    <p className="text-xs text-slate-500">Age: {patient.age}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge variant={patient.status === 'Active' ? 'success' : 'neutral'}>{patient.status || 'Active'}</Badge>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            {patient.appointments?.[0] ? new Date(patient.appointments[0].createdAt).toLocaleDateString() : <span className="text-slate-400 italic">No history</span>}
                                        </td>
                                        <td className="px-6 py-4">
                                            {(() => {
                                                const apt = patient.appointments?.[0];
                                                if (!apt) return <span className="text-slate-400 italic">No Schedule</span>;

                                                const tz = apt.doctor?.timezone || user?.timezone || undefined;
                                                const aptDate = new Date(apt.date);

                                                // Format parts to compare "today" in the target timezone
                                                const formatOptions: Intl.DateTimeFormatOptions = {
                                                    year: 'numeric', month: '2-digit', day: '2-digit', timeZone: tz
                                                };

                                                const aptFormatted = new Intl.DateTimeFormat('en-CA', formatOptions).format(aptDate);
                                                const todayFormatted = new Intl.DateTimeFormat('en-CA', formatOptions).format(new Date());

                                                const isToday = aptFormatted === todayFormatted;

                                                if (isToday) return <Badge variant="success">Scheduled Today</Badge>;
                                                if (new Date() < aptDate) return <span className="text-primary-600 font-medium">{aptDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: tz })}</span>;
                                                return <span className="text-slate-400">Passed</span>;
                                            })()}
                                        </td>
                                        <td className="px-6 py-4">
                                            {patient.risk === 'High' && (
                                                <div className="flex items-center text-red-600 text-xs font-bold bg-red-50 px-2 py-1 rounded w-fit">
                                                    <AlertTriangle size={12} className="mr-1" /> High Risk
                                                </div>
                                            )}
                                            {(patient.risk === 'Medium' || !patient.risk) && <span className="text-orange-500 text-xs font-medium">Medium</span>}
                                            {patient.risk === 'Low' && <span className="text-green-500 text-xs font-medium">Low</span>}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={(e) => handleMessageClick(e, patient.id)}
                                                    className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded"
                                                    title="Send Message"
                                                >
                                                    <MessageSquare size={16} />
                                                </button>
                                                {(user?.role === 'SYSTEM_ADMIN' || user?.role === 'SAAS_OWNER') && (
                                                    <button
                                                        onClick={(e) => handleDeletePatient(e, patient.id)}
                                                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"
                                                        title="Delete Patient"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                                <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"><MoreHorizontal size={16} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                                        No patients found matching your filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {can(PERMISSIONS.MANAGE_COMMUNICATIONS) && (
                <div className="flex justify-end">
                    <Button variant="secondary"><Mail size={16} className="mr-2" />Run Smart Recall (2 Inactive)</Button>
                </div>
            )}

            <PatientModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSave={handleCreatePatient}
            />
        </div>
    );
};

export default Patients;
