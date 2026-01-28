"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Users,
    Clock,
    Calendar,
    MapPin,
    Video,
    Phone,
    Mail,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    ArrowRight,
    Filter,
    Search,
    Trash2
} from 'lucide-react';
import clsx from 'clsx';
import api from '@/utils/api';
import { toast } from 'sonner';
import Modal from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';
import Badge from '@/components/ui/badge';

interface WaitlistEntry {
    id: string;
    patient?: { name: string; email?: string; phone?: string };
    guestName?: string;
    guestEmail?: string;
    guestPhone?: string;
    type: string;
    priority?: number;
    waitlistAddedAt?: string;
    waitlistReason?: string;
    service?: { name: string };
    createdAt: string;
}

export default function WaitlistPage() {
    const router = useRouter();
    const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
    const [filteredWaitlist, setFilteredWaitlist] = useState<WaitlistEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [priorityFilter, setPriorityFilter] = useState<string>('all');
    const [selectedEntry, setSelectedEntry] = useState<WaitlistEntry | null>(null);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [assignDate, setAssignDate] = useState('');
    const [assignTime, setAssignTime] = useState('');

    useEffect(() => {
        fetchWaitlist();
    }, []);

    useEffect(() => {
        filterWaitlist();
    }, [waitlist, searchQuery, priorityFilter]);

    const fetchWaitlist = async () => {
        try {
            const response = await api.get('/appointments/waitlist/all');
            setWaitlist(response.data);
        } catch (error) {
            console.error('Failed to fetch waitlist:', error);
            toast.error('Failed to load waitlist');
        } finally {
            setLoading(false);
        }
    };

    const filterWaitlist = () => {
        let filtered = [...waitlist];

        if (searchQuery) {
            filtered = filtered.filter(entry => {
                const name = entry.patient?.name || entry.guestName || '';
                const email = entry.patient?.email || entry.guestEmail || '';
                const phone = entry.patient?.phone || entry.guestPhone || '';
                return name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    phone.toLowerCase().includes(searchQuery.toLowerCase());
            });
        }

        if (priorityFilter !== 'all') {
            const priorityRange = priorityFilter === 'high' ? [1, 3] :
                priorityFilter === 'medium' ? [4, 7] : [8, 10];
            filtered = filtered.filter(entry =>
                entry.priority && entry.priority >= priorityRange[0] && entry.priority <= priorityRange[1]
            );
        }

        setFilteredWaitlist(filtered);
    };

    const handleAssignToSchedule = (entry: WaitlistEntry) => {
        setSelectedEntry(entry);
        setIsAssignModalOpen(true);
    };

    const handleDeleteEntry = async (id: string) => {
        if (!confirm('Are you sure you want to remove this patient from the waitlist?')) return;

        try {
            await api.delete(`/appointments/${id}`);
            toast.success('Patient removed from waitlist');
            fetchWaitlist();
        } catch (error) {
            console.error('Failed to remove from waitlist:', error);
            toast.error('Failed to remove from waitlist');
        }
    };

    const confirmAssignment = async () => {
        if (!selectedEntry || !assignDate || !assignTime) {
            toast.error('Please select both date and time');
            return;
        }

        try {
            const dateTime = new Date(`${assignDate}T${assignTime}`);
            await api.patch(`/appointments/${selectedEntry.id}/activate`, { date: dateTime.toISOString() });

            toast.success('Patient rescheduled successfully');
            setIsAssignModalOpen(false);
            setSelectedEntry(null);
            setAssignDate('');
            setAssignTime('');
            fetchWaitlist();
        } catch (error) {
            console.error('Failed to reschedule:', error);
            toast.error('Failed to reschedule patient');
        }
    };

    const updatePriority = async (id: string, newPriority: number) => {
        try {
            await api.patch(`/appointments/${id}/priority`, { priority: newPriority });
            toast.success('Priority updated');
            fetchWaitlist();
        } catch (error) {
            console.error('Failed to update priority:', error);
            toast.error('Failed to update priority');
        }
    };

    const getPriorityBadge = (priority?: number) => {
        if (!priority) return <Badge variant="neutral" className="text-xs">No Priority</Badge>;
        if (priority <= 3) return <Badge variant="danger" className="text-xs">High Priority</Badge>;
        if (priority <= 7) return <Badge variant="warning" className="text-xs">Medium Priority</Badge>;
        return <Badge variant="success" className="text-xs">Low Priority</Badge>;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                    <p className="text-slate-600">Loading waitlist...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
                            <Users className="text-primary-600" size={32} />
                            Waitlist Management
                        </h1>
                        <p className="text-slate-600 mt-2">Manage patients waiting for appointments</p>
                    </div>
                    <div className="bg-white rounded-xl px-6 py-3 border border-slate-200 shadow-sm">
                        <p className="text-sm text-slate-600">Total Waiting</p>
                        <p className="text-3xl font-black text-primary-600">{waitlist.length}</p>
                    </div>
                </div>

                <div className="flex gap-4 items-center bg-white p-4 rounded-xl border border-slate-200">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by name, email, or phone..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-100 focus:border-primary-300 outline-none"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter size={18} className="text-slate-400" />
                        <select
                            value={priorityFilter}
                            onChange={(e) => setPriorityFilter(e.target.value)}
                            className="px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-100 focus:border-primary-300 outline-none"
                        >
                            <option value="all">All Priorities</option>
                            <option value="high">High Priority</option>
                            <option value="medium">Medium Priority</option>
                            <option value="low">Low Priority</option>
                        </select>
                    </div>
                </div>
            </div>

            {filteredWaitlist.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                    <Users size={48} className="mx-auto text-slate-300 mb-4" />
                    <h3 className="text-xl font-bold text-slate-900 mb-2">No patients in waitlist</h3>
                    <p className="text-slate-600">Patients added to the waitlist will appear here</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {filteredWaitlist.map((entry) => {
                        const patientName = entry.patient?.name || entry.guestName || 'Unknown Patient';
                        const patientEmail = entry.patient?.email || entry.guestEmail;
                        const patientPhone = entry.patient?.phone || entry.guestPhone;

                        return (
                            <div
                                key={entry.id}
                                className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg transition-shadow"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 text-primary-700 flex items-center justify-center font-bold text-lg">
                                                {patientName.split(' ').map(n => n[0]).join('')}
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-slate-900">{patientName}</h3>
                                                <div className="flex items-center gap-2 mt-1">
                                                    {getPriorityBadge(entry.priority)}
                                                    <Badge variant={entry.type === 'video' ? 'info' : 'neutral'} className="text-xs">
                                                        {entry.type === 'video' ? <Video size={12} className="mr-1" /> : <MapPin size={12} className="mr-1" />}
                                                        {entry.type === 'video' ? 'Virtual' : 'In-person'}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 mb-4">
                                            {patientEmail && (
                                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                                    <Mail size={14} />
                                                    <span>{patientEmail}</span>
                                                </div>
                                            )}
                                            {patientPhone && (
                                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                                    <Phone size={14} />
                                                    <span>{patientPhone}</span>
                                                </div>
                                            )}
                                            {entry.waitlistAddedAt && (
                                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                                    <Clock size={14} />
                                                    <span>Added {new Date(entry.waitlistAddedAt).toLocaleDateString()}</span>
                                                </div>
                                            )}
                                            {entry.service && (
                                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                                    <Calendar size={14} />
                                                    <span>{entry.service.name}</span>
                                                </div>
                                            )}
                                        </div>

                                        {entry.waitlistReason && (
                                            <div className="bg-slate-50 rounded-lg p-3 mb-4">
                                                <p className="text-xs font-bold text-slate-700 mb-1">Reason for Waitlist:</p>
                                                <p className="text-sm text-slate-600">{entry.waitlistReason}</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex flex-col gap-2 ml-4">
                                        <Button
                                            onClick={() => handleAssignToSchedule(entry)}
                                            className="whitespace-nowrap bg-primary-600 hover:bg-primary-700"
                                        >
                                            <Calendar size={16} className="mr-2" />
                                            Reschedule
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() => handleDeleteEntry(entry.id)}
                                            className="whitespace-nowrap text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                                        >
                                            <Trash2 size={16} className="mr-2" />
                                            Remove
                                        </Button>
                                        <div className="mt-2">
                                            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 ml-1">Set Priority</label>
                                            <select
                                                value={entry.priority || 5}
                                                onChange={(e) => updatePriority(entry.id, parseInt(e.target.value))}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-100 focus:border-primary-300 outline-none"
                                            >
                                                <option value={1}>Priority 1 (Highest)</option>
                                                <option value={2}>Priority 2</option>
                                                <option value={3}>Priority 3</option>
                                                <option value={4}>Priority 4</option>
                                                <option value={5}>Priority 5 (Default)</option>
                                                <option value={6}>Priority 6</option>
                                                <option value={7}>Priority 7</option>
                                                <option value={8}>Priority 8</option>
                                                <option value={9}>Priority 9</option>
                                                <option value={10}>Priority 10 (Lowest)</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <Modal isOpen={isAssignModalOpen} onClose={() => setIsAssignModalOpen(false)} title="Reschedule Patient" maxWidth="md">
                {selectedEntry && (
                    <div className="space-y-4">
                        <div className="bg-slate-50 rounded-lg p-4">
                            <p className="text-sm font-bold text-slate-700 mb-2">Patient:</p>
                            <p className="text-lg font-black text-slate-900">
                                {selectedEntry.patient?.name || selectedEntry.guestName}
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Select Date</label>
                            <input
                                type="date"
                                value={assignDate}
                                onChange={(e) => setAssignDate(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-100 focus:border-primary-300 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Select Time</label>
                            <input
                                type="time"
                                value={assignTime}
                                onChange={(e) => setAssignTime(e.target.value)}
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-100 focus:border-primary-300 outline-none"
                            />
                        </div>

                        <div className="flex gap-3 pt-4">
                            <Button onClick={confirmAssignment} className="flex-1">
                                <CheckCircle2 size={16} className="mr-2" />
                                Confirm Schedule
                            </Button>
                            <Button variant="outline" onClick={() => setIsAssignModalOpen(false)} className="flex-1">
                                Cancel
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
