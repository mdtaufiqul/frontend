"use client";

import React, { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    ChevronLeft,
    ChevronRight,
    Video,
    FileText,
    MapPin,
    Plus,
    TrendingUp,
    Users,
    Zap,
    Info,
    ArrowUpRight,
    SlidersHorizontal,
    X,
    Check,
    Calendar,
    Search,
    Filter,
    Clock,
    LayoutGrid,
    Copy,
    AlertTriangle,
    Trash2,
    Link2,
    CircleDashed
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import clsx from 'clsx';
import Badge from '@/components/ui/badge';
import Modal from '@/components/ui/Modal';
import PatientModal from '@/components/ui/PatientModal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useSocket } from '@/hooks/useSocket';
import { useAuth } from '@/context/AuthContext';
import { usePermissionApi } from '@/hooks/usePermissionApi';
import { SmartTimePicker } from '@/components/ui/smart-time-picker';
import { PERMISSIONS } from '@/config/apiPermissions';
import { normalizeTimezone } from '@/utils/timezones';
import Image from 'next/image';

interface CalendarEvent {
    id: string | number;
    patientName: string;
    time: string;
    hourIndex: number;
    dayOffset: number;
    type: 'Virtual' | 'In-person';
    patientId: string;
    doctorId: string;
    noteStatus: string;
    invoiceStatus: string;
    flags: string[];
    isOnline: boolean;
    risk: 'Low' | 'Medium' | 'High';
    startDateTime: Date;
    targetDateString?: string;
    isMeeting?: boolean;
    meetingData?: any;
}

interface SelectOption {
    label: string;
    value: string;
    icon?: React.ReactNode;
}

const ScheduleClient: React.FC = () => {
    return (
        <Suspense fallback={<div className="h-full w-full flex items-center justify-center"><CircleDashed className="w-8 h-8 animate-spin text-primary-500" /></div>}>
            <ScheduleContent />
        </Suspense>
    );
};

const ScheduleContent: React.FC = () => {
    const router = useRouter();
    const searchParams = useSearchParams();

    const { user, can } = useAuth();
    const { get: apiGet, post: apiPost, patch: apiPatch, delete: apiDelete } = usePermissionApi();

    const [view, setView] = useState<'day' | 'week' | 'month'>('day');
    const [events, setEvents] = useState<CalendarEvent[]>([]);

    const [selectedMonthDay, setSelectedMonthDay] = useState<number | null>(new Date().getDate());
    const [monthSidebarMode, setMonthSidebarMode] = useState<'day' | 'month'>('day');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDoctorId, setSelectedDoctorId] = useState<string>('all');
    const [clinicDoctors, setClinicDoctors] = useState<any[]>([]);

    const [typeFilter, setTypeFilter] = useState<'all' | 'online' | 'offline'>('all');
    const [activeFilters, setActiveFilters] = useState<{ notes: string[], invoices: string[], flags: string[] }>({ notes: [], invoices: [], flags: [] });
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [practitionerProfile, setPractitionerProfile] = useState<any>(null);

    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeletePatientChecked, setIsDeletePatientChecked] = useState(false);
    const [isTypeSwitchConfirmOpen, setIsTypeSwitchConfirmOpen] = useState(false);
    const [pendingTypeSwitch, setPendingTypeSwitch] = useState<any>(null);

    const [selectedEvent, setSelectedEvent] = useState<any>(null);
    const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | null>(null);
    const [rescheduleDate, setRescheduleDate] = useState('');
    const [rescheduleTime, setRescheduleTime] = useState('');
    const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);

    const [newAppointment, setNewAppointment] = useState<any>({
        patientName: '',
        patientId: '',
        date: '',
        time: '',
        startTime: '',
        type: 'Virtual',
        notes: '',
        isOnline: true,
        patientMode: 'existing',
        newPatient: {
            name: '',
            email: '',
            phone: '',
            risk: 'Low'
        },
        waitlistId: ''
    });

    const [patientSearch, setPatientSearch] = useState('');
    const [isPatientDropdownOpen, setIsPatientDropdownOpen] = useState(false);

    const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
    const [noteView, setNoteView] = useState<'list' | 'edit' | 'add'>('list');
    const [activeNoteTab, setActiveNoteTab] = useState<'clinical' | 'admin' | 'patient' | 'doctor'>('clinical');
    const [appointmentNotes, setAppointmentNotes] = useState<any[]>([]);
    const [newNoteText, setNewNoteText] = useState('');

    const [patients, setPatients] = useState<any[]>([]);
    const [waitlistItems, setWaitlistItems] = useState<any[]>([]);
    const [targetTime, setTargetTime] = useState<string | null>(null);

    const [calendarStartHour, setCalendarStartHour] = useState(0);
    const [calendarEndHour, setCalendarEndHour] = useState(23);
    const [showLocalTime, setShowLocalTime] = useState(false);
    const [doctorTimezone, setDoctorTimezone] = useState(
        normalizeTimezone(user?.timezone) || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    );

    useEffect(() => {
        const dateParam = searchParams.get('date');
        const viewParam = searchParams.get('view');
        const timeParam = searchParams.get('time');

        if (dateParam) {
            const [y, m, d] = dateParam.split('-').map(Number);
            setCurrentDate(new Date(y, m - 1, d));
        }
        if (viewParam === 'day' || viewParam === 'week' || viewParam === 'month') {
            setView(viewParam as any);
        }
        if (timeParam) {
            setTargetTime(timeParam);
        }
    }, [searchParams]);

    const scrollContainerRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (scrollContainerRef.current) {
            let scrollHour = 8;
            if (targetTime) {
                const hourMatch = targetTime.match(/^(\d{1,2})/);
                if (hourMatch) {
                    let hour = parseInt(hourMatch[1]);
                    if (targetTime.includes('PM') && hour < 12) hour += 12;
                    if (targetTime.includes('AM') && hour === 12) hour = 0;
                    scrollHour = hour;
                }
            } else if (events.length > 0) {
                let relevantEvents: CalendarEvent[] = [];
                if (view === 'day') {
                    const selectedDateStr = currentDate.toLocaleDateString('en-CA');
                    relevantEvents = events.filter(e => e.targetDateString === selectedDateStr);
                } else if (view === 'week') {
                    const startMs = new Date(currentDate.toLocaleDateString('en-CA')).getTime();
                    const endMs = startMs + (7 * 24 * 60 * 60 * 1000);
                    relevantEvents = events.filter(e => {
                        if (!e.targetDateString) return false;
                        const eMs = new Date(e.targetDateString).getTime();
                        return eMs >= startMs && eMs < endMs;
                    });
                }
                if (relevantEvents.length > 0) {
                    const min = Math.min(...relevantEvents.map(e => e.hourIndex));
                    scrollHour = Math.max(0, min);
                }
            }
            const scrollIndex = Math.max(0, scrollHour - 1);
            const rowHeight = view === 'week' ? 96 : 128;
            scrollContainerRef.current.scrollTo({
                top: scrollIndex * rowHeight,
                behavior: 'smooth'
            });
            if (targetTime) setTargetTime(null);
        }
    }, [view, currentDate, events, targetTime]);

    const fetchAppointments = async () => {
        try {
            const url = selectedDoctorId === 'all' ? '/appointments?date=all' : `/appointments?date=all&doctorId=${selectedDoctorId}`;
            const [apptResponse, meetingResponse] = await Promise.all([
                apiGet(PERMISSIONS.VIEW_SCHEDULE, url),
                apiGet(PERMISSIONS.VIEW_SCHEDULE, '/meetings')
            ]);
            let allEvents: CalendarEvent[] = [];
            if (apptResponse && apptResponse.data) {
                const mappedAppts = apptResponse.data.map((evt: any) => {
                    const eventDate = new Date(evt.date);
                    const timeString = eventDate.toLocaleTimeString('en-US', {
                        hour: '2-digit', minute: '2-digit', hour12: false, timeZone: doctorTimezone
                    });
                    const hourInDoctorTz = parseInt(timeString.split(':')[0]);
                    return {
                        ...evt,
                        patientName: evt.patient?.name || evt.guestName || 'Unknown',
                        type: evt.type === 'video' ? 'Virtual' : 'In-person',
                        isOnline: evt.type === 'video',
                        noteStatus: evt.noteStatus || 'none',
                        invoiceStatus: evt.invoiceStatus || 'none',
                        flags: evt.flags || [],
                        hourIndex: hourInDoctorTz,
                        time: timeString,
                        startDateTime: eventDate,
                        targetDateString: eventDate.toLocaleDateString('en-CA', { timeZone: doctorTimezone }),
                        isMeeting: false,
                        dayOffset: 0
                    };
                });
                allEvents = [...allEvents, ...mappedAppts];
            }
            if (meetingResponse && meetingResponse.data) {
                const mappedMeetings = meetingResponse.data.map((mtg: any) => {
                    const eventDate = new Date(mtg.startTime);
                    const timeString = eventDate.toLocaleTimeString('en-US', {
                        hour: '2-digit', minute: '2-digit', hour12: false, timeZone: doctorTimezone
                    });
                    const hourInDoctorTz = parseInt(timeString.split(':')[0]);
                    return {
                        id: mtg.id,
                        patientName: mtg.title,
                        type: 'Meeting',
                        isOnline: true,
                        noteStatus: 'none',
                        invoiceStatus: 'none',
                        flags: ['Meeting'],
                        risk: 'Low',
                        hourIndex: hourInDoctorTz,
                        time: timeString,
                        startDateTime: eventDate,
                        targetDateString: eventDate.toLocaleDateString('en-CA', { timeZone: doctorTimezone }),
                        isMeeting: true,
                        meetingData: mtg,
                        dayOffset: 0
                    };
                });
                allEvents = [...allEvents, ...mappedMeetings];
            }
            setEvents(allEvents);
        } catch (error: any) {
            console.error("[Schedule] Failed to fetch appointments:", error);
        }
    };

    useEffect(() => {
        fetchAppointments();
    }, [selectedDoctorId, user, doctorTimezone]);

    const socket = useSocket();
    useEffect(() => {
        if (!socket) return;
        const handleUpdate = () => fetchAppointments();
        socket.on('appointmentUpdated', handleUpdate);
        return () => {
            socket.off('appointmentUpdated', handleUpdate);
        };
    }, [socket, currentDate, view, selectedDoctorId]);

    useEffect(() => {
        const fetchResources = async () => {
            try {
                const [patientsRes, waitlistRes] = await Promise.all([
                    apiGet(PERMISSIONS.VIEW_ALL_PATIENTS, '/patients'),
                    apiGet(PERMISSIONS.VIEW_SCHEDULE, '/appointments/waitlist/all')
                ]);
                if (patientsRes) setPatients(patientsRes.data);
                if (waitlistRes) setWaitlistItems(waitlistRes.data);
            } catch (error) {
                console.error("Failed to fetch booking resources:", error);
            }
        };
        fetchResources();
    }, []);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const meRes = await apiGet(PERMISSIONS.VIEW_OWN_PROFILE, '/auth/me');
                if (!meRes) return;
                const me = meRes.data;
                const isClinicAdmin = me.role === 'clinic_admin' || me.role === 'clinic_representative';
                if (isClinicAdmin && me.clinicId) {
                    const docsRes = await apiGet(PERMISSIONS.VIEW_STAFF, `/users?role=doctor&clinicId=${me.clinicId}`);
                    if (docsRes?.data) setClinicDoctors(docsRes.data);
                }
                const res = await apiGet(PERMISSIONS.VIEW_STAFF, '/users?role=doctor');
                if (res && res.data && res.data.length > 0) {
                    const currentUserProfile = user ? res.data.find((d: any) => d.id === user.id) : null;
                    const profile = currentUserProfile || res.data[0];
                    setPractitionerProfile(profile);
                }
            } catch (err: any) {
                console.error("Failed to fetch practitioner profile", err);
            }
        };
        fetchProfile();
    }, []);

    const navigateDate = (direction: 'prev' | 'next') => {
        const newDate = new Date(currentDate);
        if (view === 'day') newDate.setDate(currentDate.getDate() + (direction === 'next' ? 1 : -1));
        else if (view === 'week') newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
        else if (view === 'month') newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
        setCurrentDate(newDate);
    };

    const updateView = (v: 'day' | 'week' | 'month') => setView(v);

    const openNewEventModal = (date?: string, time?: string, isOnline: boolean = true) => {
        setNewAppointment({
            patientName: '',
            patientId: '',
            date: date || new Date().toISOString().split('T')[0],
            startTime: time || '09:00 AM',
            time: time || '09:00 AM',
            type: isOnline ? 'Virtual' : 'In-person',
            notes: '',
            isOnline: isOnline,
            patientMode: 'existing',
            newPatient: { name: '', email: '', phone: '', risk: 'Low' }
        });
        setPatientSearch('');
        setIsModalOpen(true);
    };

    const handleSaveNewEvent = async () => {
        const { patientId, patientMode, newPatient, date, startTime, type, notes } = newAppointment;
        if (patientMode === 'existing' && !patientId) { toast.error('Please select a patient'); return; }
        if (patientMode === 'new' && (!newPatient.name || !newPatient.email)) { toast.error('Please enter new patient details'); return; }

        try {
            let finalPatientId = patientId;
            if (patientMode === 'new') {
                const pRes = await apiPost(PERMISSIONS.MANAGE_PATIENTS, '/patients', newPatient);
                if (!pRes) return;
                finalPatientId = pRes.data.id;
            }
            const [time, modifier] = startTime.split(' ');
            let [hours, minutes] = time.split(':').map(Number);
            if (modifier === 'PM' && hours < 12) hours += 12;
            if (modifier === 'AM' && hours === 12) hours = 0;
            const apptDate = new Date(`${date}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`);
            const payload = {
                patientId: finalPatientId,
                date: apptDate.toISOString(),
                type: type === 'Virtual' || type === 'video' ? 'video' : 'in-person',
                notes: notes,
                doctorId: practitionerProfile?.id || user?.id,
                waitlistId: newAppointment.waitlistId || undefined
            };
            await apiPost(PERMISSIONS.MANAGE_APPOINTMENTS, '/appointments', payload);
            toast.success('Appointment created successfully');
            setIsModalOpen(false);
            fetchAppointments();
        } catch (error) {
            console.error('Failed to create appointment:', error);
            toast.error('Failed to create appointment');
        }
    };

    const handleSaveNote = async () => {
        if (!selectedEvent || !newNoteText.trim()) return;
        try {
            await apiPost(PERMISSIONS.MANAGE_APPOINTMENTS, `/appointments/${selectedEvent.id}/notes`, {
                text: newNoteText,
                category: activeNoteTab
            });
            toast.success('Note saved');
            setNewNoteText('');
        } catch (error) {
            console.error("Failed to save note:", error);
            toast.error("Failed to save note");
        }
    };

    const filteredPatientsList = React.useMemo(() => {
        if (!patientSearch) return [];
        return patients.filter((p: any) =>
            p.name.toLowerCase().includes(patientSearch.toLowerCase()) ||
            p.email?.toLowerCase().includes(patientSearch.toLowerCase())
        );
    }, [patients, patientSearch]);

    const handleToggleAppointmentType = async () => {
        if (!selectedEvent) return;
        const targetType = selectedEvent.type === 'Virtual' ? 'in-person' : 'video';
        const targetTypeLabel = targetType === 'video' ? 'Virtual' : 'In-person';
        setPendingTypeSwitch({ targetType, targetTypeLabel });
        setIsTypeSwitchConfirmOpen(true);
    };

    const confirmTypeSwitch = async () => {
        if (!selectedEvent || !pendingTypeSwitch) return;
        try {
            await apiPatch(PERMISSIONS.MANAGE_APPOINTMENTS, `/appointments/${selectedEvent.id}`, { type: pendingTypeSwitch.targetType });
            toast.success(`Appointment changed to ${pendingTypeSwitch.targetTypeLabel}`);
            await fetchAppointments();
            setIsEventModalOpen(false);
            setIsTypeSwitchConfirmOpen(false);
            setPendingTypeSwitch(null);
        } catch (error) {
            console.error('Failed to update appointment type:', error);
            toast.error('Failed to update appointment');
        }
    };

    const handleDateSelect = async (date: Date) => {
        setSelectedCalendarDate(date);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const localDateString = `${year}-${month}-${day}`;
        setRescheduleDate(localDateString);
        setAvailableTimeSlots([]);
        // Mocking available slots for demo
        setAvailableTimeSlots(['09:00', '10:00', '11:00', '14:00', '15:00']);
        setRescheduleTime('');
    };

    const handleRescheduleSubmit = async () => {
        if (!selectedEvent || !rescheduleDate || !rescheduleTime) { toast.error('Please select both date and time'); return; }
        try {
            const [hours, minutes] = rescheduleTime.split(':');
            const [year, month, day] = rescheduleDate.split('-').map(Number);
            const newDate = new Date(year, month - 1, day, parseInt(hours), parseInt(minutes), 0, 0);
            await apiPatch(PERMISSIONS.MANAGE_APPOINTMENTS, `/appointments/${selectedEvent.id}`, { date: newDate.toISOString() });
            toast.success('Appointment rescheduled successfully');
            await fetchAppointments();
            setIsRescheduleModalOpen(false);
            setIsEventModalOpen(false);
        } catch (error) {
            console.error('Failed to reschedule appointment:', error);
            toast.error('Failed to reschedule appointment');
        }
    };

    const handleConfirmDelete = async () => {
        if (!selectedEvent) return;
        try {
            if (isDeletePatientChecked && selectedEvent.patientId) {
                await apiDelete(PERMISSIONS.MANAGE_PATIENTS, `/patients/${selectedEvent.patientId}`);
            }
            await apiDelete(PERMISSIONS.MANAGE_APPOINTMENTS, `/appointments/${selectedEvent.id}`);
            toast.success('Schedule deleted');
            await fetchAppointments();
            setIsDeleteModalOpen(false);
        } catch (error) {
            console.error('Failed to delete appointment:', error);
            toast.error('Failed to delete appointment');
        }
    };

    const timeSlots = React.useMemo(() => {
        const start = Math.max(0, Math.min(23, calendarStartHour));
        const end = Math.max(start + 1, Math.min(24, calendarEndHour + 1));
        return Array.from({ length: end - start }, (_, i) => i + start);
    }, [calendarStartHour, calendarEndHour]);

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    const filteredEvents = events.filter((event: any) => {
        let typeMatch = true;
        if (typeFilter === 'online') typeMatch = event.type === 'Virtual' || event.isMeeting;
        if (typeFilter === 'offline') typeMatch = event.type !== 'Virtual' && !event.isMeeting;
        return typeMatch;
    });

    const typeOptions: SelectOption[] = [
        { label: 'All Types', value: 'all', icon: <LayoutGrid size={14} /> },
        { label: 'In-Person', value: 'offline', icon: <MapPin size={14} /> },
        { label: 'Virtual', value: 'online', icon: <Video size={14} /> }
    ];

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 lg:gap-6">
                    <div className="flex items-center gap-4">
                        <h1 className="text-2xl font-bold text-slate-900">Schedule</h1>
                        <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-sm h-10">
                            <button onClick={() => navigateDate('prev')} className="p-1.5 h-full hover:bg-slate-50 rounded-md text-slate-500"><ChevronLeft size={18} /></button>
                            <span className="px-3 text-sm font-bold text-slate-700 min-w-[140px] text-center">
                                {(() => {
                                    if (view === 'month') return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                                    else if (view === 'week') {
                                        const end = new Date(currentDate); end.setDate(currentDate.getDate() + 6);
                                        return `${currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
                                    } else return currentDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
                                })()}
                            </span>
                            <button onClick={() => navigateDate('next')} className="p-1.5 h-full hover:bg-slate-50 rounded-md text-slate-500"><ChevronRight size={18} /></button>
                        </div>
                    </div>
                    <div className="flex bg-white border border-slate-200 rounded-lg p-1 shadow-sm h-10 items-center">
                        {(['day', 'week', 'month'] as const).map((v) => (
                            <button key={v} onClick={() => updateView(v)} className={clsx("px-3 py-1.5 rounded-md text-sm font-bold capitalize h-full", view === v ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:bg-slate-50")}>{v}</button>
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-3 h-10">
                    <Select value={typeFilter} onValueChange={(val: string) => setTypeFilter(val as any)}>
                        <SelectTrigger className="w-40 h-full"><SelectValue placeholder="Filter Type" /></SelectTrigger>
                        <SelectContent>
                            {typeOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    {can(PERMISSIONS.MANAGE_APPOINTMENTS) && <Button onClick={() => openNewEventModal()}><Plus size={16} className="mr-2" />New Event</Button>}
                </div>
            </div>

            <Card className="flex-1 flex flex-col !p-0 overflow-hidden border-slate-200 bg-white/50 backdrop-blur-sm">
                <div className="flex-1 overflow-y-auto custom-scrollbar relative" ref={scrollContainerRef}>
                    <div className="min-w-[800px]">
                        {timeSlots.map((hour) => {
                            const hourEvents = filteredEvents.filter(event => {
                                const selectedDateStr = currentDate.toLocaleDateString('en-CA');
                                return event.hourIndex === hour && event.targetDateString === selectedDateStr;
                            });
                            return (
                                <div key={hour} className="flex h-32 border-b border-slate-100 group hover:bg-slate-50/50">
                                    <div className="w-20 border-r border-slate-100 flex flex-col items-end pr-3 pt-3 text-sm font-bold text-slate-500">
                                        {hour > 12 ? `${hour - 12} PM` : hour === 12 ? '12 PM' : `${hour} AM`}
                                    </div>
                                    <div className="flex-1 p-2 relative">
                                        {hourEvents.map(event => (
                                            <div key={event.id} onClick={() => { setSelectedEvent(event); setIsEventModalOpen(true); }} className={clsx("rounded-lg border p-3 cursor-pointer shadow-sm hover:shadow-md h-full overflow-hidden", event.isOnline ? "bg-blue-50/60 border-blue-200" : "bg-emerald-50/60 border-emerald-200")}>
                                                <div className="flex justify-between gap-2">
                                                    <span className="font-bold text-slate-900 text-sm truncate">{event.patientName}</span>
                                                    <span className="text-[10px] font-bold uppercase">{event.type}</span>
                                                </div>
                                                <div className="text-xs text-slate-500 mt-1 flex items-center gap-1"><Clock size={12} />{event.time}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </Card>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Event" maxWidth="lg">
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <input type="date" value={newAppointment.date} className="w-full px-3 py-1.5 bg-slate-50 border rounded-xl text-sm" onChange={(e) => setNewAppointment({ ...newAppointment, date: e.target.value })} />
                        <SmartTimePicker value={newAppointment.startTime} onChange={(time) => setNewAppointment({ ...newAppointment, startTime: time })} />
                    </div>
                    <textarea value={newAppointment.notes} className="w-full p-3 bg-slate-50 border rounded-xl text-sm h-24" placeholder="Notes..." onChange={(e) => setNewAppointment({ ...newAppointment, notes: e.target.value })} />
                    <div className="flex gap-3">
                        <Button className="flex-1" onClick={handleSaveNewEvent}>Create Appointment</Button>
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={isEventModalOpen} onClose={() => setIsEventModalOpen(false)} title="" maxWidth="md">
                {selectedEvent && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center font-bold text-xl">{selectedEvent.patientName[0]}</div>
                            <div>
                                <h3 className="text-lg font-black">{selectedEvent.patientName}</h3>
                                <p className="text-sm text-slate-500">{selectedEvent.time} • {selectedEvent.type}</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            {selectedEvent.isOnline && <Button onClick={() => router.push(`/meet/${selectedEvent.id}`)} className="flex-1">Join Meeting</Button>}
                            <Button variant="outline" onClick={() => router.push(`/patients/${selectedEvent.patientId}`)} className="flex-1">View Patient</Button>
                        </div>
                        <div className="pt-2 border-t flex justify-between">
                            <Button variant="ghost" size="sm" onClick={() => setIsDeleteModalOpen(true)} className="text-red-600"><Trash2 size={16} /></Button>
                            <Button variant="ghost" size="sm" onClick={() => setIsRescheduleModalOpen(true)}>Reschedule</Button>
                        </div>
                    </div>
                )}
            </Modal>

            <Modal isOpen={isRescheduleModalOpen} onClose={() => setIsRescheduleModalOpen(false)} title="Reschedule" maxWidth="sm">
                <div className="space-y-4">
                    <input type="date" className="w-full p-2 border rounded" onChange={(e) => handleDateSelect(new Date(e.target.value))} />
                    <div className="grid grid-cols-3 gap-2">
                        {availableTimeSlots.map(slot => (
                            <button key={slot} onClick={() => setRescheduleTime(slot)} className={clsx("p-2 border rounded text-xs", rescheduleTime === slot ? "bg-primary-600 text-white" : "bg-white")}>{slot}</button>
                        ))}
                    </div>
                    <Button className="w-full" onClick={handleRescheduleSubmit}>Confirm</Button>
                </div>
            </Modal>

            <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Delete" maxWidth="sm">
                <div className="space-y-4">
                    <p>Delete this schedule?</p>
                    <div className="flex gap-3">
                        <Button onClick={handleConfirmDelete} className="flex-1 bg-red-600">Delete</Button>
                        <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)} className="flex-1">Cancel</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default ScheduleClient;
