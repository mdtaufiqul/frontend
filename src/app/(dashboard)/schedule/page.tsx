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
    Link2 // For copy patient link
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import clsx from 'clsx';
import Badge from '@/components/ui/badge';
import Modal from '@/components/ui/Modal';
import PatientModal from '@/components/ui/PatientModal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
// import api from '@/utils/api';
import { useSocket } from '@/hooks/useSocket';
import { useAuth } from '@/context/AuthContext';
import { usePermissionApi } from '@/hooks/usePermissionApi';
import { SmartTimePicker } from '@/components/ui/smart-time-picker';
import { PERMISSIONS } from '@/config/apiPermissions';
import { normalizeTimezone } from '@/utils/timezones';

// --- Interfaces ---

interface CalendarEvent {
    id: string | number;
    patientName: string;
    time: string;
    hourIndex: number;
    dayOffset: number;
    type: 'Virtual' | 'In-person';
    patientId: string;
    doctorId: string; // Added for reschedule slot fetching
    noteStatus: string;
    invoiceStatus: string;
    flags: string[];
    isOnline: boolean;
    risk: 'Low' | 'Medium' | 'High';
    startDateTime: Date;
    targetDateString?: string; // For timezone-aware date filtering
    isMeeting?: boolean;
    meetingData?: any;
}

interface SelectOption {
    label: string;
    value: string;
    icon?: React.ReactNode;
}

// --- Schedule Component Content ---

const ScheduleContent: React.FC = () => {
    const router = useRouter();
    const searchParams = useSearchParams();

    const { user, can } = useAuth();
    const { get: apiGet, post: apiPost, patch: apiPatch, delete: apiDelete } = usePermissionApi();

    // View state
    const [view, setView] = useState<'day' | 'week' | 'month'>('day');
    const [events, setEvents] = useState<CalendarEvent[]>([]);

    // Dynamic Time State
    // State Variables (Moved up)
    const [selectedMonthDay, setSelectedMonthDay] = useState<number | null>(new Date().getDate());
    const [monthSidebarMode, setMonthSidebarMode] = useState<'day' | 'month'>('day');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDoctorId, setSelectedDoctorId] = useState<string>('all');
    const [clinicDoctors, setClinicDoctors] = useState<any[]>([]);

    // --- Restored State Variables ---
    // Filters
    const [typeFilter, setTypeFilter] = useState<'all' | 'online' | 'offline'>('all'); // Fixed ReferenceError
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

    // Selection & Data
    const [selectedEvent, setSelectedEvent] = useState<any>(null);
    const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | null>(null);
    const [rescheduleDate, setRescheduleDate] = useState('');
    const [rescheduleTime, setRescheduleTime] = useState('');
    const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);

    // New Appointment State (Expanded to support all modal fields)
    const [newAppointment, setNewAppointment] = useState<any>({
        patientName: '',
        patientId: '',
        date: '',
        time: '',
        startTime: '',
        type: 'Virtual',
        notes: '',
        isOnline: true,
        patientMode: 'existing', // 'existing' | 'new'
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

    // Notes & Communication States
    const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
    const [noteView, setNoteView] = useState<'list' | 'edit' | 'add'>('list');
    const [activeNoteTab, setActiveNoteTab] = useState<'clinical' | 'admin' | 'patient' | 'doctor'>('clinical');
    const [appointmentNotes, setAppointmentNotes] = useState<any[]>([]);
    const [newNoteText, setNewNoteText] = useState('');

    const [patients, setPatients] = useState<any[]>([]);
    const [waitlistItems, setWaitlistItems] = useState<any[]>([]);
    const [targetTime, setTargetTime] = useState<string | null>(null);
    // ---------------------------

    // Dynamic Time State - 24 Hours View
    const [calendarStartHour, setCalendarStartHour] = useState(0);
    const [calendarEndHour, setCalendarEndHour] = useState(23);
    const [showLocalTime, setShowLocalTime] = useState(false);
    const [doctorTimezone, setDoctorTimezone] = useState(
        normalizeTimezone(user?.timezone) || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    );

    // URL Parameter Handling
    useEffect(() => {
        const dateParam = searchParams.get('date');
        const viewParam = searchParams.get('view');
        const timeParam = searchParams.get('time');

        if (dateParam) {
            // Use local date parsing to avoid UTC shift
            const [y, m, d] = dateParam.split('-').map(Number);
            setCurrentDate(new Date(y, m - 1, d));
        }
        if (viewParam === 'day' || viewParam === 'week' || viewParam === 'month') {
            setView(viewParam);
        }
        if (timeParam) {
            setTargetTime(timeParam);
        }
    }, [searchParams]);

    // Sync doctorTimezone with user profile

    // Auto-scroll logic
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (scrollContainerRef.current) {
            // Smart Auto-Scroll: Find the target hour or earliest event
            let scrollHour = 8; // Default to 8 AM

            if (targetTime) {
                // Parse targetTime (e.g., "09:00" or "09:00 AM")
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
                    scrollHour = Math.max(0, min); // Scroll exactly to the earliest event
                }
            }

            // Adjust buffer: scroll 1 slot early for better context
            const scrollIndex = Math.max(0, scrollHour - 1);
            const rowHeight = view === 'week' ? 96 : 128;

            scrollContainerRef.current.scrollTo({
                top: scrollIndex * rowHeight,
                behavior: 'smooth'
            });

            // Reset targetTime after scrolling to avoid fighting user manual scrolls later
            if (targetTime) setTargetTime(null);
        }
    }, [view, currentDate, events, targetTime]); // Re-run when view, date, events, or targetTime change

    // Loading & Data Fetching
    const fetchAppointments = async () => {
        try {
            // Adjust API URL if needed via proxy or env
            const url = selectedDoctorId === 'all' ? '/appointments?date=all' : `/appointments?date=all&doctorId=${selectedDoctorId}`;
            console.log('[Schedule] Fetching appointments with URL:', url);
            console.log('[Schedule] Selected doctor ID:', selectedDoctorId);
            console.log('[Schedule] Current user:', user?.id, user?.role);

            // Use PERMISSIONS.VIEW_SCHEDULE (view_schedule) or VIEW_OWN_SCHEDULE depending on context?
            // For now, view_schedule covers accessing the endpoint generally.
            const [apptResponse, meetingResponse] = await Promise.all([
                apiGet(PERMISSIONS.VIEW_SCHEDULE, url),
                apiGet(PERMISSIONS.VIEW_SCHEDULE, '/meetings')
            ]);

            console.log('[Schedule] API Response:', apptResponse);

            let allEvents: CalendarEvent[] = [];

            if (apptResponse && apptResponse.data) {
                console.log('[Schedule] Raw appointments data:', apptResponse.data.length);
                // Map API response to match internal CalendarEvent interface (ensure Dates are objects)
                const mappedAppts = apptResponse.data.map((evt: any) => {
                    const eventDate = new Date(evt.date);
                    // Format time in doctor's configured timezone
                    const eventTimezone = doctorTimezone;
                    const timeString = eventDate.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                        timeZone: doctorTimezone
                    });

                    // Get hour index in doctor's timezone for calendar rendering
                    const hourInDoctorTz = parseInt(timeString.split(':')[0]);

                    return {
                        ...evt,
                        patientName: evt.patient?.name || evt.guestName || 'Unknown',
                        type: evt.type === 'video' ? 'Virtual' : 'In-person',
                        isOnline: evt.type === 'video', // Add isOnline field for UI rendering
                        noteStatus: evt.noteStatus || 'none',
                        invoiceStatus: evt.invoiceStatus || 'none',
                        flags: evt.flags || [],
                        hourIndex: hourInDoctorTz, // Use hour in doctor's timezone
                        time: timeString, // Display in current timezone
                        startDateTime: eventDate,
                        targetDateString: eventDate.toLocaleDateString('en-CA', { timeZone: eventTimezone }),
                        isMeeting: false
                    };
                });
                allEvents = [...allEvents, ...mappedAppts];
            }

            if (meetingResponse && meetingResponse.data) {
                console.log('[Schedule] Raw meetings data:', meetingResponse.data.length);
                const mappedMeetings = meetingResponse.data.map((mtg: any) => {
                    const eventDate = new Date(mtg.startTime);
                    const eventTimezone = doctorTimezone; // Or mtg.timezone if we want to respect meeting specific tz
                    const timeString = eventDate.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                        timeZone: doctorTimezone
                    });

                    const hourInDoctorTz = parseInt(timeString.split(':')[0]);

                    return {
                        id: mtg.id,
                        patientName: mtg.title, // Use title as name
                        type: 'Meeting',
                        isOnline: true,
                        noteStatus: 'none',
                        invoiceStatus: 'none',
                        flags: ['Meeting'],
                        risk: 'Low',
                        hourIndex: hourInDoctorTz,
                        time: timeString,
                        startDateTime: eventDate,
                        targetDateString: eventDate.toLocaleDateString('en-CA', { timeZone: eventTimezone }),
                        isMeeting: true,
                        meetingData: mtg // Store full object if needed
                    };
                });
                allEvents = [...allEvents, ...mappedMeetings];
            }

            console.log('[Schedule] Total mapped events:', allEvents.length);
            setEvents(allEvents);
        } catch (error: any) {
            console.error("[Schedule] Failed to fetch appointments:", error);
            console.error("[Schedule] Error details:", error.response?.data || error.message);
        }
    };

    // --- Fetch Appointments on Mount and Dependency Changes ---
    useEffect(() => {
        console.log('[Schedule] useEffect triggered - fetching appointments');
        fetchAppointments();
    }, [selectedDoctorId, user, doctorTimezone]); // Re-fetch when doctor filter, user, or timezone changes

    // --- Real-time Updates ---
    useEffect(() => {
        const socket = useSocket();
        if (!socket) return;

        const handleUpdate = () => {
            console.log('[Schedule] Real-time update received, refreshing data...');
            fetchAppointments();
        };

        socket.on('appointmentUpdated', handleUpdate);

        return () => {
            socket.off('appointmentUpdated', handleUpdate);
        };
    }, [currentDate, view, selectedDoctorId]); // Re-bind if context changes

    // Fetch Patients and Waitlist
    useEffect(() => {
        const fetchResources = async () => {
            try {
                // Using explicit permissions
                const [patientsRes, waitlistRes] = await Promise.all([
                    apiGet(PERMISSIONS.VIEW_ALL_PATIENTS, '/patients'),
                    apiGet(PERMISSIONS.VIEW_SCHEDULE, '/appointments/waitlist/all') // 'view_schedule' or similar required
                ]);
                if (patientsRes) setPatients(patientsRes.data);
                if (waitlistRes) setWaitlistItems(waitlistRes.data);
            } catch (error) {
                console.error("Failed to fetch booking resources:", error);
            }
        };
        fetchResources();
    }, []);

    const navigateDate = (direction: 'prev' | 'next') => {
        const newDate = new Date(currentDate);
        if (view === 'day') {
            newDate.setDate(currentDate.getDate() + (direction === 'next' ? 1 : -1));
        } else if (view === 'week') {
            newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
        } else if (view === 'month') {
            newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
        }
        setCurrentDate(newDate);
    };

    const updateView = (v: 'day' | 'week' | 'month') => {
        setView(v);
    };

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

        if (patientMode === 'existing' && !patientId) {
            toast.error('Please select a patient');
            return;
        }

        if (patientMode === 'new' && (!newPatient.name || !newPatient.email)) {
            toast.error('Please enter new patient details');
            return;
        }

        try {
            let finalPatientId = patientId;

            // 1. Create Patient if new
            if (patientMode === 'new') {
                const pRes = await apiPost(PERMISSIONS.MANAGE_PATIENTS, '/patients', newPatient);
                if (!pRes) return;
                finalPatientId = pRes.data.id;
            }

            // 2. Create Appointment
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

    const handleSendWaitlistOffer = async () => {
        const { waitlistId, date, startTime } = newAppointment;

        if (!waitlistId) {
            toast.error('Please select a waitlist request');
            return;
        }

        try {
            toast.loading('Sending manual offer...', { id: 'waitlist-offer' });

            // Resolve patientId from waitlistItems
            const waitlistItem = waitlistItems.find(i => i.id === waitlistId);
            if (!waitlistItem) throw new Error("Waitlist item not found");

            // Format date and time
            const [time, modifier] = startTime.split(' ');
            let [hours, minutes] = time.split(':').map(Number);
            if (modifier === 'PM' && hours < 12) hours += 12;
            if (modifier === 'AM' && hours === 12) hours = 0;
            const apptDate = new Date(`${date}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`);

            await apiPost(PERMISSIONS.MANAGE_APPOINTMENTS, '/waitlist/manual-offer', {
                patientId: waitlistItem.patientId,
                doctorId: practitionerProfile?.id || user?.id,
                date: apptDate.toISOString()
            });

            toast.success('Manual offer sent to patient!', { id: 'waitlist-offer' });
            setIsModalOpen(false);
            fetchAppointments();
        } catch (error) {
            console.error('Failed to send waitlist offer:', error);
            toast.error('Failed to send waitlist offer', { id: 'waitlist-offer' });
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
            // TODO: Refresh notes if needed
        } catch (error) {
            console.error("Failed to save note:", error);
            toast.error("Failed to save note");
        }
    };

    const filteredPatients = React.useMemo(() => {
        if (!patientSearch) return [];
        return patients.filter((p: any) =>
            p.name.toLowerCase().includes(patientSearch.toLowerCase()) ||
            p.email?.toLowerCase().includes(patientSearch.toLowerCase())
        );
    }, [patients, patientSearch]);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                // Fetch current user full profile (includes clinicId, role etc)
                const meRes = await apiGet(PERMISSIONS.VIEW_OWN_PROFILE, '/auth/me');
                if (!meRes) return;
                const me = meRes.data;

                // Explicitly check role
                const isClinicAdmin = me.role === 'clinic_admin' || me.role === 'clinic_representative';

                if (isClinicAdmin && me.clinicId) {
                    const docsRes = await apiGet(PERMISSIONS.VIEW_STAFF, `/users?role=doctor&clinicId=${me.clinicId}`);
                    if (docsRes?.data) setClinicDoctors(docsRes.data);
                }

                // For demo, fetching the first doctor found, similar to SetupWizard
                // Fetch all doctors
                const res = await apiGet(PERMISSIONS.VIEW_STAFF, '/users?role=doctor');
                if (res && res.data && res.data.length > 0) {
                    // Prioritize the logged-in user if they are a doctor
                    const currentUserProfile = user ? res.data.find((d: any) => d.id === user.id) : null;
                    const profile = currentUserProfile || res.data[0];

                    setPractitionerProfile(profile);

                    // ... rest of logic
                }
            } catch (err: any) {
                console.error("Failed to fetch practitioner profile", err);
            }
        };
        fetchProfile();
    }, []);

    const handleToggleAppointmentType = async () => {
        if (!selectedEvent) return;

        const currentType = selectedEvent.type;
        const targetType = currentType === 'Virtual' ? 'in-person' : 'video'; // API expects 'video' or 'in-person'
        const targetTypeLabel = targetType === 'video' ? 'Virtual' : 'In-person';

        // Validation Logic
        if (practitionerProfile) {
            const apptDate = new Date(selectedEvent.startDateTime);
            const dayStr = apptDate.toLocaleDateString('en-US', { weekday: 'short' }); // Mon, Tue...

            const schedule = practitionerProfile.schedule;
            // Normalize schedule structure
            const activeSchedule = (schedule && !Array.isArray(schedule) && schedule.days) ? schedule.days : (Array.isArray(schedule) ? schedule : []);
            const daySchedule = activeSchedule.find((d: any) => d.day === dayStr && d.active);

            if (!daySchedule) {
                toast.error(`No active schedule found for ${dayStr}. Cannot switch type.`);
                return;
            }

            // Check Global Constraint
            const globalType = practitionerProfile.consultationType || 'Mixed';
            if (globalType === 'Online' && targetType === 'in-person') {
                toast.error(`Practitioner is set to Online Only. Cannot switch to In-person.`);
                return;
            }
            if (globalType === 'In-person' && targetType === 'video') {
                toast.error(`Practitioner is set to In-person Only. Cannot switch to Virtual.`);
                return;
            }

            // Check Slot/Day Constraint
            // We need to find if the appointment time falls into a slot with specific type restrictions
            // For simplicity, we check the day's default type first, then assume granular slots might restrict further.
            // If the day is explicitly "Online" or "In-person", we respect that.

            // Note: A robust check would intersect the appointment time with schedule slots. 
            // Here we check if the requested type is generally *allowed* on this day.

            // Helper to title case
            const toTitleCase = (str: string) => str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : '';

            // Determine effective type for the day
            // Logic: Slot Type > Day Type > Global Type
            // Since we don't have the specific slot reference here easily without iterating all slots, 
            // we'll check if ANY slot on this day supports the target type, or if the day supports it.

            const dayTypeRaw = daySchedule.type || '';
            const dayType = toTitleCase(dayTypeRaw); // 'Online', 'In-person', 'Mixed'

            const isTargetSupported = () => {
                // If specific slots exist, check if ANY covers this time and supports target
                if (daySchedule.slots && daySchedule.slots.length > 0) {
                    // Simple check: does the day contain ANY slot of the target type? 
                    // Or does it default to mixed?
                    // A more strict check would be: find the slot covering `selectedEvent.time`
                    // But `selectedEvent.time` is a string range. `startDateTime` is accurate.

                    const apptMinutes = apptDate.getHours() * 60 + apptDate.getMinutes();

                    const coveringSlot = daySchedule.slots.find((s: any) => {
                        const [startH, startM] = s.start.split(':').map(Number);
                        const [endH, endM] = s.end.split(':').map(Number);
                        const startTotal = startH * 60 + startM;
                        const endTotal = endH * 60 + endM;
                        return apptMinutes >= startTotal && apptMinutes < endTotal;
                    });

                    if (coveringSlot) {
                        const slotTypeRaw = coveringSlot.type || dayTypeRaw || globalType;
                        const slotType = toTitleCase(slotTypeRaw);

                        if (targetType === 'video') return slotType === 'Online' || slotType === 'Mixed' || slotType === 'Both';
                        if (targetType === 'in-person') return slotType === 'In-person' || slotType === 'Mixed' || slotType === 'Both';
                    }
                    return true; // If no slot explicitly covers (maybe custom appt?), default allow or warn? Let's allow.
                }

                // Fallback to day type
                if (dayType) {
                    if (targetType === 'video') return dayType === 'Online' || dayType === 'Mixed' || dayType === 'Both';
                    if (targetType === 'in-person') return dayType === 'In-person' || dayType === 'Mixed' || dayType === 'Both';
                }

                return true; // Default allow
            };

            if (!isTargetSupported()) {
                toast.error(`This time slot is optimized for ${currentType === 'Virtual' ? 'Virtual' : 'In-person'} only.`);
                // Suggest opening reschedule modal
                toast('Opening reschedule options...', {
                    action: {
                        label: 'Reschedule',
                        onClick: () => {
                            setIsEventModalOpen(false);
                            setIsRescheduleModalOpen(true);
                        }
                    }
                });
                return;
            }
        }

        // Show confirmation dialog
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

    // Generate available time slots for a given date
    const generateAvailableSlots = async (date: Date) => {
        if (!selectedEvent) {
            console.warn('No selected event for reschedule');
            return [];
        }

        try {
            // Format date
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;

            // Get appointment type (online or in-person)
            const appointmentType = selectedEvent.type === 'Virtual' ? 'online' : 'in-person';

            console.log('Fetching available slots:', {
                doctorId: selectedEvent.doctorId,
                date: dateStr,
                type: appointmentType,
                excludeId: selectedEvent.id
            });

            // Fetch available slots from API
            const response = await apiGet(PERMISSIONS.VIEW_APPOINTMENTS, '/appointments/available-slots', {
                params: {
                    doctorId: selectedEvent.doctorId,
                    date: dateStr,
                    type: appointmentType, // Only show slots matching current type
                    excludeId: selectedEvent.id, // Exclude current appointment
                    timezone: doctorTimezone
                }
            });

            if (!response?.data) return [];
        } catch (error) {
            console.error('Error fetching available slots:', error);
            toast.error('Failed to load available time slots');
            return [];
        }
    };

    const handleDateSelect = async (date: Date) => {
        setSelectedCalendarDate(date);

        // Format date in local timezone (YYYY-MM-DD) to avoid UTC conversion issues
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const localDateString = `${year}-${month}-${day}`;

        setRescheduleDate(localDateString);

        // Generate available time slots for the selected date (now async)
        setAvailableTimeSlots([]); // Clear slots while loading
        const slots = await generateAvailableSlots(date);
        setAvailableTimeSlots(slots || []);
        setRescheduleTime(''); // Reset selected time

        // Show confirmation of selected date
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayName = dayNames[date.getDay()];
        const dateStr = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        toast.success(`Selected: ${dayName}, ${dateStr}`);

        console.log('Date selected:', {
            date: date.toISOString(),
            localDate: date.toString(),
            localDateString,
            dayOfWeek: dayName,
            formatted: dateStr
        });
    };

    const handleRescheduleSubmit = async () => {
        if (!selectedEvent || !rescheduleDate || !rescheduleTime) {
            toast.error('Please select both date and time');
            return;
        }

        try {
            const [hours, minutes] = rescheduleTime.split(':');

            // Parse date components to avoid timezone issues
            const [year, month, day] = rescheduleDate.split('-').map(Number);

            // Create date in local timezone
            const newDate = new Date(year, month - 1, day, parseInt(hours), parseInt(minutes), 0, 0);

            console.log('Rescheduling appointment:', {
                appointmentId: selectedEvent.id,
                oldDate: selectedEvent.startDateTime,
                newDate: newDate.toISOString(),
                localDate: newDate.toString(),
                rescheduleDate,
                rescheduleTime
            });

            const response = await apiPatch(PERMISSIONS.MANAGE_APPOINTMENTS, `/appointments/${selectedEvent.id}`, { date: newDate.toISOString() });
            if (response?.data) {
                console.log('Reschedule response:', response.data);
            }

            toast.success('Appointment rescheduled successfully');

            // Refresh appointments
            await fetchAppointments();

            // Close modals and reset state
            setIsRescheduleModalOpen(false);
            setIsEventModalOpen(false);
            setSelectedCalendarDate(null);
            setAvailableTimeSlots([]);
            setRescheduleDate('');
            setRescheduleTime('');
        } catch (error) {
            console.error('Failed to reschedule appointment:', error);
            toast.error('Failed to reschedule appointment');
        }
    };

    const handleSendToWaitlist = async () => {
        console.log('Sending to waitlist:', selectedEvent);
        if (!selectedEvent) return;

        try {
            toast.loading('Moving to waitlist...', { id: 'waitlist-toast' });
            await apiPatch(PERMISSIONS.MANAGE_APPOINTMENTS, `/appointments/${selectedEvent.id}`, {
                status: 'waitlist',
                priority: 5,
                waitlistAddedAt: new Date().toISOString(),
                waitlistReason: 'Moved to waitlist by doctor'
            });

            toast.success('Appointment moved to waitlist', { id: 'waitlist-toast' });
            await fetchAppointments();
            setIsEventModalOpen(false);
        } catch (error) {
            console.error('Failed to move to waitlist:', error);
            toast.error('Failed to move to waitlist', { id: 'waitlist-toast' });
        }
    };

    const handleCancelAppointment = () => {
        if (!selectedEvent) return;
        setIsEventModalOpen(false);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!selectedEvent) return;
        try {
            if (isDeletePatientChecked && selectedEvent.patientId) {
                // Delete associated patient
                try {
                    await apiDelete(PERMISSIONS.MANAGE_PATIENTS, `/patients/${selectedEvent.patientId}`);
                    toast.success('Patient deleted');
                } catch (err) {
                    console.error("Failed to delete patient", err);
                    toast.error("Failed to delete patient");
                }
            }

            await apiDelete(PERMISSIONS.MANAGE_APPOINTMENTS, `/appointments/${selectedEvent.id}`);

            toast.success('Schedule deleted');
            await fetchAppointments();
            setIsDeleteModalOpen(false);
            setIsDeletePatientChecked(false); // Reset checkbox
        } catch (error) {
            console.error('Failed to delete appointment:', error);
            toast.error('Failed to delete appointment');
        }
    };

    const handleReschedule = () => {
        if (!selectedEvent) return;
        const updatedEvents = events.map(e => {
            if (e.id === selectedEvent.id) {
                return {
                    ...e,
                    dayOffset: (e.dayOffset + 1) % 7,
                    time: `Rescheduled: ${e.time}`
                };
            }
            return e;
        });
        setEvents(updatedEvents);
        setIsRescheduleModalOpen(false);
        router.push('/schedule');
    };

    const handleFindTime = () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        openNewEventModal(tomorrow.toISOString().split('T')[0], '09:00 AM', false);
    };

    const timeSlots = React.useMemo(() => {
        // Ensure valid range
        const start = Math.max(0, Math.min(23, calendarStartHour));
        const end = Math.max(start + 1, Math.min(24, calendarEndHour + 1)); // +1 to ensure the closing hour is shown
        return Array.from({ length: end - start }, (_, i) => i + start);
    }, [calendarStartHour, calendarEndHour]);
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const capacities = [65, 80, 100, 45, 90, 0, 0];

    const filteredEvents = events.filter((event: any) => {
        const notesMatch = activeFilters.notes.length === 0 || activeFilters.notes.includes(event.noteStatus);
        const invoicesMatch = activeFilters.invoices.length === 0 || activeFilters.invoices.includes(event.invoiceStatus);
        const flagsMatch = activeFilters.flags.length === 0 || (event.flags.some((f: any) => activeFilters.flags.includes(f)));

        let typeMatch = true;
        if (typeFilter === 'online') typeMatch = event.type === 'Virtual' || event.isMeeting;
        if (typeFilter === 'offline') typeMatch = event.type !== 'Virtual' && !event.isMeeting;

        return notesMatch && invoicesMatch && flagsMatch && typeMatch;
    });

    console.log('[Schedule] Filtered events:', filteredEvents.length, 'out of', events.length);
    console.log('[Schedule] Filters:', { typeFilter, activeFilters });

    const toggleFilter = (category: 'notes' | 'invoices' | 'flags', value: string) => {
        setActiveFilters((prev: any) => {
            const current = prev[category];
            const updated = current.includes(value)
                ? current.filter((v: string) => v !== value)
                : [...current, value];
            return { ...prev, [category]: updated };
        });
    };

    const clearFilters = () => {
        setActiveFilters({ notes: [], invoices: [], flags: [] });
    };

    const typeOptions: SelectOption[] = [
        { label: 'All Types', value: 'all', icon: <LayoutGrid size={14} /> },
        { label: 'In-Person', value: 'offline', icon: <MapPin size={14} /> },
        { label: 'Virtual', value: 'online', icon: <Video size={14} /> }
    ];

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 lg:gap-6">
                    <div className="flex items-center gap-4">
                        <h1 className="text-2xl font-bold text-slate-900">Schedule</h1>
                        <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-sm h-10">
                            <button onClick={() => navigateDate('prev')} className="p-1.5 h-full aspect-square flex items-center justify-center hover:bg-slate-50 rounded-md text-slate-500 hover:text-slate-700 transition-colors"><ChevronLeft size={18} /></button>
                            <span className="px-3 text-sm font-bold text-slate-700 min-w-[140px] text-center flex items-center justify-center h-full">
                                {(() => {
                                    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
                                    if (view === 'month') return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                                    else if (view === 'week') {
                                        const start = currentDate;
                                        const end = new Date(currentDate);
                                        end.setDate(currentDate.getDate() + 6);
                                        return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
                                    } else return currentDate.toLocaleDateString('en-US', { weekday: 'short', ...options });
                                })()}
                            </span>
                            <button onClick={() => navigateDate('next')} className="p-1.5 h-full aspect-square flex items-center justify-center hover:bg-slate-50 rounded-md text-slate-500 hover:text-slate-700 transition-colors"><ChevronRight size={18} /></button>
                        </div>
                    </div>

                    <div className="flex bg-white border border-slate-200 rounded-lg p-1 shadow-sm self-start sm:self-auto h-10 items-center">
                        {(['day', 'week', 'month'] as const).map((v) => (
                            <button
                                key={v}
                                onClick={() => updateView(v)}
                                className={clsx(
                                    "px-3 py-1.5 rounded-md text-sm font-bold transition-all duration-200 capitalize h-full flex items-center",
                                    view === v ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                                )}
                            >{v}</button>
                        ))}
                    </div>

                    {/* Timezone Indicator */}
                    <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200 text-[11px] font-bold text-slate-500 h-10">
                        <Clock size={14} className="text-secondary-500" />
                        {doctorTimezone}
                    </div>
                </div>

                <div className="flex items-center gap-3 self-end lg:self-auto h-10">
                    <div className="w-40 h-full">
                        <Select value={typeFilter} onValueChange={(val: string) => setTypeFilter(val as any)}>
                            <SelectTrigger className="w-full h-full">
                                <SelectValue placeholder="Filter Type" />
                            </SelectTrigger>
                            <SelectContent>
                                {typeOptions.map(opt => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                        <div className="flex items-center gap-2">
                                            {/* Note: SelectItem children are rendered. Icon handling: */}
                                            {opt.icon && <span className="mr-2">{opt.icon}</span>}
                                            {opt.label}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {/* Button Removed */}
                    <div className="relative">
                        <button onClick={() => setIsFilterOpen(!isFilterOpen)} className={clsx("flex items-center justify-center rounded-lg border transition-all duration-200 bg-white h-10 w-10", isFilterOpen || Object.values(activeFilters).some(f => f.length > 0) ? "border-primary-200 text-primary-600 bg-primary-50 ring-2 ring-primary-100" : "border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300")}>
                            <SlidersHorizontal size={20} />
                        </button>
                        {isFilterOpen && (
                            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-premium border border-slate-200 z-[100] animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden">
                                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                    <h3 className="font-bold text-slate-900">Filter</h3>
                                    <button onClick={() => setIsFilterOpen(false)}><X size={18} className="text-slate-500" /></button>
                                </div>
                                <div className="p-4 border-t border-slate-100 flex items-center justify-between gap-3 bg-slate-50/30">
                                    <button onClick={clearFilters} className="text-xs font-bold text-primary-600 uppercase">Clear All</button>
                                    <button onClick={() => setIsFilterOpen(false)} className="bg-primary-600 text-white text-xs font-bold px-8 py-2.5 rounded-xl">Apply</button>
                                </div>
                            </div>
                        )}
                    </div>
                    {can(PERMISSIONS.MANAGE_APPOINTMENTS) && (
                        <Button onClick={() => openNewEventModal()}><Plus size={16} className="mr-2" />New Event</Button>
                    )}
                </div>
            </div>

            {/* Grid */}
            <Card className="flex-1 flex flex-col !p-0 overflow-hidden border-slate-200 shadow-glass bg-white/50 backdrop-blur-sm">
                <div className="flex-1 flex overflow-hidden">
                    <div className="flex-1 flex flex-col overflow-hidden border-r border-slate-200">
                        {view === 'month' ? (
                            <div className="flex-1 flex flex-col min-h-0">
                                <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/50">
                                    {days.map(day => <div key={day} className="p-3 text-center border-r border-slate-200 last:border-r-0 text-xs font-bold text-slate-400">{day}</div>)}
                                </div>
                                <div className="flex-1 grid grid-cols-7 grid-rows-6 overflow-y-auto min-h-0">
                                    {/* Month Days Logic */}
                                    {(() => {
                                        const year = currentDate.getFullYear();
                                        const month = currentDate.getMonth();
                                        const firstDayOfMonth = new Date(year, month, 1).getDay();
                                        const daysInMonth = new Date(year, month + 1, 0).getDate();

                                        // Calculate padding days from previous month
                                        const prevMonthDays = new Date(year, month, 0).getDate();
                                        const startPadding = firstDayOfMonth; // 0 for Sunday, 1 for Monday, etc.

                                        const calendarDays = [];

                                        // Add previous month's trailing days (grayed out)
                                        for (let i = startPadding - 1; i >= 0; i--) {
                                            calendarDays.push({
                                                day: prevMonthDays - i,
                                                isCurrentMonth: false,
                                                fullDate: new Date(year, month - 1, prevMonthDays - i)
                                            });
                                        }

                                        // Add current month days
                                        for (let i = 1; i <= daysInMonth; i++) {
                                            calendarDays.push({
                                                day: i,
                                                isCurrentMonth: true,
                                                fullDate: new Date(year, month, i)
                                            });
                                        }

                                        // Add next month's leading days to fill the grid (grayed out)
                                        const remainingCells = 42 - calendarDays.length; // 6 rows × 7 cols = 42
                                        for (let i = 1; i <= remainingCells; i++) {
                                            calendarDays.push({
                                                day: i,
                                                isCurrentMonth: false,
                                                fullDate: new Date(year, month + 1, i)
                                            });
                                        }

                                        return calendarDays.map((dateObj, i) => {
                                            const dayEvents = events.filter(e => {
                                                // Check targetDateString if available, otherwise strict date match
                                                const dStr = dateObj.fullDate.toLocaleDateString('en-CA');
                                                return e.targetDateString ? e.targetDateString === dStr : (e.startDateTime && e.startDateTime.toDateString && e.startDateTime.toDateString() === dateObj.fullDate.toDateString());
                                            });
                                            const isSelected = selectedMonthDay === dateObj.day && dateObj.isCurrentMonth;

                                            return (
                                                <div
                                                    key={i}
                                                    onClick={() => {
                                                        if (dateObj.isCurrentMonth) setSelectedMonthDay(dateObj.day);
                                                        openNewEventModal(dateObj.fullDate.toISOString().split('T')[0], '09:00 AM');
                                                    }}
                                                    className={clsx(
                                                        "border-r border-b border-slate-100 p-2 hover:bg-white transition-all cursor-pointer group relative flex flex-col gap-1 overflow-hidden",
                                                        isSelected && "ring-2 ring-primary-500 ring-inset bg-white z-10 shadow-lg",
                                                        !dateObj.isCurrentMonth && "bg-slate-50/30"
                                                    )}
                                                >
                                                    <span className={clsx(
                                                        "text-sm font-bold w-6 h-6 flex items-center justify-center rounded-full flex-shrink-0",
                                                        isSelected ? "bg-primary-100 text-primary-700" :
                                                            dateObj.isCurrentMonth ? "text-slate-700" : "text-slate-400"
                                                    )}>
                                                        {dateObj.day}
                                                    </span>
                                                    <div className="space-y-1 overflow-y-auto flex-1 min-h-0">
                                                        {dayEvents.slice(0, 3).map((event, idx) => (
                                                            <div
                                                                key={idx}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedEvent(event);
                                                                    setIsEventModalOpen(true);
                                                                }}
                                                                className="p-1 rounded text-[9px] font-bold border-l-2 truncate bg-primary-50 border-primary-500 text-primary-700 cursor-pointer hover:bg-primary-100 transition-colors"
                                                            >
                                                                {event.patientName}
                                                            </div>
                                                        ))}
                                                        {dayEvents.length > 3 && (
                                                            <div className="text-[8px] text-slate-400 font-bold">
                                                                +{dayEvents.length - 3} more
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        });
                                    })()}
                                </div>
                            </div>
                        ) : view === 'day' ? (
                            <div className="flex-1 flex flex-col min-h-0 bg-white">
                                {/* Day View Header */}
                                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                                    <h3 className="font-bold text-slate-900 flex items-center gap-3 text-lg">
                                        <div className="p-2 bg-primary-100/50 rounded-lg text-primary-600">
                                            <Calendar size={20} />
                                        </div>
                                        {currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                                    </h3>
                                    <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                                        <Clock size={16} />
                                        <span>9:00 AM - 5:00 PM</span>
                                    </div>
                                </div>

                                {/* Day View Grid */}
                                <div className="flex-1 overflow-y-auto custom-scrollbar relative" ref={scrollContainerRef}>
                                    <div className="min-w-[800px] relative"> {/* Minimum width to prevent crushing */}

                                        {/* Current Time Indicator (Absolute Overlay) */}
                                        {(() => {
                                            const now = new Date();
                                            const isToday = currentDate.toDateString() === now.toDateString();
                                            if (isToday) {
                                                const currentHour = now.getHours();
                                                const currentMinute = now.getMinutes();
                                                const startHour = 9;
                                                const endHour = 17;

                                                if (currentHour >= startHour && currentHour < endHour) {
                                                    // rowHeight is 128px (h-32)
                                                    const rowHeight = 128;
                                                    const offsetHours = currentHour - startHour;
                                                    const offsetMinutes = currentMinute / 60;
                                                    const topPosition = (offsetHours + offsetMinutes) * rowHeight;

                                                    return (
                                                        <div
                                                            className="absolute left-0 right-0 z-30 pointer-events-none flex items-center"
                                                            style={{ top: `${topPosition}px` }}
                                                        >
                                                            <div className="w-20 pl-4 flex justify-end pr-2">
                                                                <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-100">
                                                                    {now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                                                                </span>
                                                            </div>
                                                            <div className="flex-1 h-px bg-red-500 relative">
                                                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-red-500"></div>
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                            }
                                            return null;
                                        })()}

                                        {/* Hour Rows */}
                                        {Array.from({ length: calendarEndHour - calendarStartHour + 1 }, (_, i) => i + calendarStartHour).map((hour, slotIndex) => {
                                            const isCurrentHour = new Date().getHours() === hour && currentDate.toDateString() === new Date().toDateString();

                                            // Get events starting in this hour based on Pre-Calculated Timezone Index
                                            const hourEvents = filteredEvents.filter(event => {
                                                // Robust Check: Use hourIndex calculated in fetchAppointments
                                                // AND check the calculated target date string against the selected date (formatted locally as YYYY-MM-DD)

                                                // Format currentDate to YYYY-MM-DD (local time, matching input interpretation)
                                                const selectedDateStr = currentDate.toLocaleDateString('en-CA');

                                                // If targetDateString is missing (legacy), fallback to loose check
                                                if (!event.targetDateString) {
                                                    return event.hourIndex === slotIndex &&
                                                        (event.startDateTime.toDateString() === currentDate.toDateString() || showLocalTime === false);
                                                }

                                                return event.hourIndex === slotIndex && event.targetDateString === selectedDateStr;
                                            });

                                            return (
                                                <div key={hour} className="flex h-32 border-b border-slate-100 group hover:bg-slate-50/50 transition-colors">
                                                    {/* Time Label Column */}
                                                    <div className="w-20 shrink-0 border-r border-slate-100 flex flex-col items-end pr-3 pt-3">
                                                        <span className={clsx("text-sm font-bold", isCurrentHour ? "text-primary-600" : "text-slate-500")}>
                                                            {hour > 12 ? `${hour - 12}` : hour === 12 ? '12' : `${hour}`}
                                                            <span className="text-[10px] ml-0.5 font-medium text-slate-400">{hour >= 12 ? 'PM' : 'AM'}</span>
                                                        </span>
                                                    </div>

                                                    {/* Content Area */}
                                                    <div className="flex-1 p-2 relative">
                                                        {hourEvents.length > 0 ? (
                                                            <div className="grid grid-cols-1 gap-2 h-full">
                                                                {hourEvents.map(event => (
                                                                    <div
                                                                        key={event.id}
                                                                        onClick={() => { setSelectedEvent(event); setIsEventModalOpen(true); }}
                                                                        className={clsx(
                                                                            "rounded-lg border p-3 cursor-pointer shadow-sm hover:shadow-md transition-all flex flex-col justify-between h-full max-h-full overflow-hidden",
                                                                            event.isMeeting
                                                                                ? "bg-purple-50/60 border-purple-200 hover:border-purple-300"
                                                                                : event.isOnline
                                                                                    ? "bg-blue-50/60 border-blue-200 hover:border-blue-300"
                                                                                    : "bg-emerald-50/60 border-emerald-200 hover:border-emerald-300"
                                                                        )}
                                                                    >
                                                                        <div className="flex items-start justify-between gap-2">
                                                                            <span className="font-bold text-slate-900 text-sm truncate">{event.patientName}</span>
                                                                            <span className={clsx("text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide",
                                                                                event.isMeeting
                                                                                    ? "bg-purple-100 text-purple-700"
                                                                                    : event.isOnline ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"
                                                                            )}>
                                                                                {event.isMeeting ? 'Meeting' : (event.isOnline ? 'Virtual' : 'In-Person')}
                                                                            </span>
                                                                        </div>
                                                                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                                                                            <Clock size={12} />
                                                                            <span>{event.time}</span>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            // Empty state hover effect
                                                            <div
                                                                onClick={() => openNewEventModal(currentDate.toISOString().split('T')[0], `${hour > 12 ? hour - 12 : hour}:00 ${hour >= 12 ? 'PM' : 'AM'}`)}
                                                                className="w-full h-full opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer border-2 border-dashed border-slate-200 rounded-lg hover:border-primary-200 hover:bg-primary-50/30 transition-all font-medium text-slate-400 hover:text-primary-600 text-sm"
                                                            >
                                                                <Plus size={16} className="mr-2" />
                                                                Schedule Appointment
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {/* 5 PM End Marker */}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col overflow-hidden">
                                <div className="grid border-b border-slate-200 bg-slate-50/50 grid-cols-8">
                                    <div className="p-4 border-r border-slate-200 flex flex-col items-center justify-center"><Calendar size={16} className="text-slate-300" /></div>
                                    {/* Dynamic Week Headers: Today + 6 Days */}
                                    {Array.from({ length: 7 }, (_, i) => {
                                        const d = new Date(currentDate);
                                        d.setDate(currentDate.getDate() + i);
                                        return d;
                                    }).map((dateObj, i) => (
                                        <div key={i} className="p-3 text-center border-r border-slate-200 last:border-r-0">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{dateObj.toLocaleDateString('en-US', { weekday: 'short' })}</p>
                                            <p className={clsx("text-lg font-bold leading-none", dateObj.toDateString() === new Date().toDateString() ? "text-primary-600" : "text-slate-700")}>{dateObj.getDate()}</p>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex-1 overflow-y-auto relative bg-slate-50/5">
                                    {timeSlots.map((hour) => {
                                        const now = new Date();
                                        const isCurrentHour = now.getHours() === hour;
                                        return (
                                            <div key={hour} className="grid border-b border-slate-100 last:border-b-0 h-24 grid-cols-8 relative group">
                                                {isCurrentHour && currentDate.toDateString() === now.toDateString() && (
                                                    <div
                                                        className="absolute w-full flex items-center z-20 pointer-events-none"
                                                        style={{ top: `${(now.getMinutes() / 60) * 100}%` }}
                                                    >
                                                        <div className="w-[12.5%] text-right pr-2">
                                                            <span className="text-[10px] font-bold text-red-500 bg-white px-1 rounded shadow-sm relative z-30 ring-1 ring-red-100">
                                                                {now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                                                            </span>
                                                        </div>
                                                        <div className="flex-1 h-px bg-red-400 opacity-60 relative w-full shadow-[0_1px_2px_rgba(248,113,113,0.2)]"></div>
                                                    </div>
                                                )}
                                                <div className="border-r border-slate-100 p-2 text-[10px] font-bold text-slate-300 text-center flex flex-col justify-start pt-3 bg-slate-50/20">{hour > 12 ? `${hour - 12} PM` : `${hour} AM`}</div>
                                                {[0, 1, 2, 3, 4, 5, 6].map(dayOffset => (
                                                    <div
                                                        key={dayOffset}
                                                        className="border-r border-slate-100 last:border-r-0 relative flex cursor-pointer hover:bg-slate-50 transition-colors"
                                                        onClick={() => {
                                                            // Calculate Date: Current + dayOffset
                                                            const targetDate = new Date(currentDate);
                                                            targetDate.setDate(currentDate.getDate() + dayOffset);

                                                            const dateStr = targetDate.toISOString().split('T')[0];
                                                            const timeStr = hour > 12 ? `${hour - 12}:00 PM` : `${hour}:00 ${hour === 12 ? 'PM' : 'AM'}`;

                                                            openNewEventModal(dateStr, timeStr);
                                                        }}
                                                    ></div>
                                                ))}
                                            </div>
                                        );
                                    })}
                                    <div className="absolute inset-0 pointer-events-none">
                                        <div className="relative h-full w-full">
                                            {filteredEvents.map(event => {
                                                // Calculate strict offset from currentDate to place event
                                                // event.targetDateString is YYYY-MM-DD
                                                // currentDate needs to be comparable

                                                if (!event.targetDateString) return null;

                                                const currentStr = currentDate.toLocaleDateString('en-CA');
                                                const eventTime = new Date(event.targetDateString).getTime();
                                                const currentTime = new Date(currentStr).getTime();
                                                const diffTime = eventTime - currentTime;
                                                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                                                // Only show if within 0..6 range
                                                if (diffDays < 0 || diffDays > 6) return null;

                                                return (
                                                    <div key={event.id}
                                                        onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); setIsEventModalOpen(true); }}
                                                        className={clsx(
                                                            "absolute pointer-events-auto p-2 rounded-lg text-xs font-bold border-l-4 shadow-sm cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md group/event overflow-hidden",
                                                            event.isMeeting
                                                                ? "bg-gradient-to-br from-purple-50 to-white border-purple-500 text-purple-700 shadow-purple-100/50"
                                                                : event.isOnline
                                                                    ? "bg-gradient-to-br from-blue-50 to-white border-blue-500 text-blue-700 shadow-blue-100/50"
                                                                    : "bg-gradient-to-br from-emerald-50 to-white border-emerald-500 text-emerald-700 shadow-emerald-100/50"
                                                        )}
                                                        style={{
                                                            top: `calc(96px * ${event.hourIndex})`,
                                                            left: `${(100 / 8) * (diffDays + 1)}%`, // +1 for time column
                                                            width: `calc(${100 / 8}% - 4px)`, // Subtracting gap
                                                            height: '92px', // Slightly smaller than cell
                                                            margin: '2px'
                                                        }}>
                                                        <div className="font-bold truncate group-hover/event:text-slate-900 transition-colors">{event.patientName}</div>
                                                        <div className="opacity-70 text-[10px] font-medium flex items-center gap-1 mt-0.5">
                                                            {event.isOnline ? <Video size={10} /> : <MapPin size={10} />}
                                                            {event.time}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </Card>

            {/* Modals */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Event" maxWidth="lg">
                <div className="space-y-4">
                    {/* Patient Selection Column */}
                    <div className="space-y-3 border-b border-slate-100 pb-4 mb-2">
                        <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
                            {(['existing', 'new', 'waitlist'] as const).map(mode => (
                                <button
                                    key={mode}
                                    onClick={() => setNewAppointment((prev: any) => ({ ...prev, patientMode: mode }))}
                                    className={clsx(
                                        "flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all",
                                        newAppointment.patientMode === mode ? "bg-white text-primary-700 shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-700"
                                    )}
                                >
                                    {mode} Patient
                                </button>
                            ))}
                        </div>

                        {newAppointment.patientMode === 'existing' && (
                            <div className="relative">
                                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Search Patient</label>
                                <div className="relative">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search by name or phone..."
                                        value={patientSearch}
                                        onFocus={() => setIsPatientDropdownOpen(true)}
                                        onChange={(e) => setPatientSearch(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-100 focus:border-primary-300 outline-none transition-all"
                                    />
                                </div>
                                {isPatientDropdownOpen && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto z-[20] p-1">
                                        {filteredPatients.length > 0 ? filteredPatients.map(p => (
                                            <div
                                                key={p.id}
                                                onClick={() => {
                                                    setNewAppointment((prev: any) => ({ ...prev, patientId: p.id }));
                                                    setPatientSearch(`${p.firstName} ${p.lastName}`);
                                                    setIsPatientDropdownOpen(false);
                                                }}
                                                className="p-2 hover:bg-slate-50 rounded-lg cursor-pointer flex items-center justify-between group"
                                            >
                                                <div>
                                                    <p className="text-sm font-bold text-slate-700">{p.firstName} {p.lastName}</p>
                                                    <p className="text-[10px] text-slate-400">{p.phone}</p>
                                                </div>
                                                {newAppointment.patientId === p.id && <Check size={14} className="text-primary-600" />}
                                            </div>
                                        )) : (
                                            <div className="p-3 text-center text-xs text-slate-400">No patients found</div>
                                        )}
                                    </div>
                                )}
                                {/* Overlay to close dropdown */}
                                {isPatientDropdownOpen && <div className="fixed inset-0 z-[10] cursor-default" onClick={() => setIsPatientDropdownOpen(false)}></div>}
                            </div>
                        )}

                        {newAppointment.patientMode === 'new' && (
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">First Name</label>
                                    <input
                                        value={newAppointment.newPatient.firstName}
                                        onChange={e => setNewAppointment((prev: any) => ({ ...prev, newPatient: { ...prev.newPatient, firstName: e.target.value } }))}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Last Name</label>
                                    <input
                                        value={newAppointment.newPatient.lastName}
                                        onChange={e => setNewAppointment((prev: any) => ({ ...prev, newPatient: { ...prev.newPatient, lastName: e.target.value } }))}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Phone</label>
                                    <input
                                        value={newAppointment.newPatient.phone}
                                        onChange={e => setNewAppointment((prev: any) => ({ ...prev, newPatient: { ...prev.newPatient, phone: e.target.value } }))}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Email</label>
                                    <input
                                        value={newAppointment.newPatient.email}
                                        onChange={e => setNewAppointment((prev: any) => ({ ...prev, newPatient: { ...prev.newPatient, email: e.target.value } }))}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                                    />
                                </div>
                            </div>
                        )}

                        {newAppointment.patientMode === 'waitlist' && (
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Select Request</label>
                                <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar p-1">
                                    {waitlistItems.length > 0 ? waitlistItems.map(item => (
                                        <div
                                            key={item.id}
                                            onClick={() => setNewAppointment((prev: any) => ({ ...prev, waitlistId: item.id }))}
                                            className={clsx(
                                                "p-3 rounded-xl border cursor-pointer transition-all",
                                                newAppointment.waitlistId === item.id
                                                    ? "bg-primary-50 border-primary-200 ring-1 ring-primary-100"
                                                    : "bg-white border-slate-200 hover:border-slate-300"
                                            )}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="text-sm font-bold text-slate-900">{item.patient?.firstName} {item.patient?.lastName}</p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <p className="text-xs text-slate-500 whitespace-pre-wrap">{item.notes || 'No request notes'}</p>
                                                        <span className={clsx(
                                                            "text-[9px] px-1.5 py-0.5 rounded-full font-medium uppercase tracking-wider",
                                                            item.type === 'online' ? "bg-blue-50 text-blue-600 ring-1 ring-blue-100" : "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100"
                                                        )}>
                                                            {item.type === 'online' ? 'Online' : 'In-Person'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <Badge variant={item.priority > 5 ? 'danger' : 'neutral'} className="text-[10px]">{item.priority > 5 ? 'High Priority' : 'Normal'}</Badge>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="text-center py-6 text-slate-400 text-sm bg-slate-50 rounded-xl border border-dashed border-slate-200">No active waitlist requests</div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Date</label>
                            <input type="date" value={newAppointment.date} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-sm" onChange={(e) => setNewAppointment({ ...newAppointment, date: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Start Time</label>
                            <SmartTimePicker
                                value={newAppointment.startTime}
                                onChange={(time) => {
                                    setNewAppointment((prev: any) => ({ ...prev, startTime: time }));
                                }}
                            />
                        </div>
                    </div>
                    {/* Validation Warning */}
                    {(() => {
                        // Check if selected time is valid for the selected type
                        if (newAppointment.date && newAppointment.startTime && practitionerProfile) {
                            const [time, modifier] = newAppointment.startTime.split(' ');
                            let [h, m] = time.split(':').map(Number);
                            if (h === 12) h = 0;
                            if (modifier === 'PM') h += 12;

                            const apptDate = new Date(`${newAppointment.date}T00:00:00`);
                            const dayStr = apptDate.toLocaleDateString('en-US', { weekday: 'short' });

                            const schedule = practitionerProfile.schedule;
                            const activeSchedule = (schedule && !Array.isArray(schedule) && schedule.days) ? schedule.days : (Array.isArray(schedule) ? schedule : []);
                            const daySchedule = activeSchedule.find((d: any) => d.day === dayStr && d.active);

                            if (!daySchedule) return <div className="text-xs text-red-500 font-bold bg-red-50 p-2 rounded">Practitioner is not working on this day.</div>;

                            // Check type logic
                            // Helper to title case
                            const toTitleCase = (str: string) => str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : '';

                            // Determine effective type for the day/slot
                            const startTotal = h * 60 + m;
                            let slotTypeRaw = daySchedule.type || '';

                            if (daySchedule.slots && daySchedule.slots.length > 0) {
                                const coveringSlot = daySchedule.slots.find((s: any) => {
                                    const [sH, sM] = s.start.split(':').map(Number);
                                    const [eH, eM] = s.end.split(':').map(Number);
                                    const sTotal = sH * 60 + sM;
                                    const eTotal = eH * 60 + eM;
                                    return startTotal >= sTotal && startTotal < eTotal;
                                });
                                if (coveringSlot) slotTypeRaw = coveringSlot.type || slotTypeRaw;
                                // If no slot covers this time but day is active, it might mean "custom" slot or generic availability?
                                // Assuming if slots are defined, only those slots are valid.
                                else if (daySchedule.slots.length > 0) {
                                    // Warnings if time is outside defined slots?
                                    // For now let's just warn if time is completely outside
                                }
                            }

                            const slotType = toTitleCase(slotTypeRaw); // 'Online', 'In-person', 'Mixed', 'Both'
                            const targetType = newAppointment.isOnline ? 'Online' : 'In-person';

                            let isValid = true;
                            if (slotType === 'Online' && targetType !== 'Online') isValid = false;
                            if (slotType === 'In-person' && targetType !== 'In-person') isValid = false;

                            if (!isValid) {
                                return (
                                    <div className="flex items-start gap-2 bg-amber-50 p-2 rounded border border-amber-100 text-xs text-amber-700">
                                        <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                                        <span>
                                            Warning: This slot is configured for <strong>{slotType}</strong> appointments only.
                                        </span>
                                    </div>
                                );
                            }
                        }
                        return null;
                    })()}

                    {/* Type Selector */}
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setNewAppointment((prev: any) => ({ ...prev, isOnline: false }))}
                            className={clsx(
                                "flex-1 py-2 px-3 rounded-lg border text-xs font-bold transition-all flex items-center justify-center gap-2",
                                !newAppointment.isOnline
                                    ? "bg-emerald-50 border-emerald-200 text-emerald-700 ring-1 ring-emerald-100"
                                    : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                            )}
                        >
                            <MapPin size={14} />
                            In-Person
                        </button>
                        <button
                            type="button"
                            onClick={() => setNewAppointment((prev: any) => ({ ...prev, isOnline: true }))}
                            className={clsx(
                                "flex-1 py-2 px-3 rounded-lg border text-xs font-bold transition-all flex items-center justify-center gap-2",
                                newAppointment.isOnline
                                    ? "bg-blue-50 border-blue-200 text-blue-700 ring-1 ring-blue-100"
                                    : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                            )}
                        >
                            <Video size={14} />
                            Virtual
                        </button>
                    </div>

                    <div className="pt-2 flex gap-3">
                        {newAppointment.patientMode === 'waitlist' ? (
                            <Button variant="default" className="flex-1 bg-primary-600 hover:bg-primary-700" onClick={handleSendWaitlistOffer}>Send Manual Offer</Button>
                        ) : (
                            <Button variant="default" className="flex-1" onClick={handleSaveNewEvent}>Create Appointment</Button>
                        )}
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={isEventModalOpen} onClose={() => setIsEventModalOpen(false)} title="" maxWidth="md">
                {selectedEvent && (
                    <div className="space-y-0">
                        {/* Header with Patient Info, Status, and Risk */}
                        <div className="flex items-start gap-3 bg-gradient-to-br from-slate-50 to-slate-100/50 p-4 -m-6 mb-3 rounded-t-xl border-b border-slate-200">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 text-primary-700 flex items-center justify-center font-bold text-lg ring-2 ring-primary-50 shrink-0">
                                {selectedEvent.patientName.split(' ').map((n: string) => n[0]).join('')}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <h3 className="text-base font-black text-slate-900 leading-tight truncate mb-2">{selectedEvent.patientName}</h3>
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            <p className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                                                <Calendar size={12} />
                                                {selectedEvent.time}
                                            </p>
                                            <span className="text-slate-300">•</span>
                                            <Badge variant="success" className="text-[10px] px-1.5 py-0.5 h-5">Scheduled</Badge>
                                            <Badge variant={selectedEvent.type === 'Virtual' ? 'info' : 'neutral'} className="text-[10px] px-1.5 py-0.5 h-5 flex items-center gap-1">
                                                {selectedEvent.type === 'Virtual' ? <Video size={10} /> : <MapPin size={10} />}
                                                {selectedEvent.type}
                                            </Badge>
                                            {selectedEvent.risk && (
                                                <Badge
                                                    variant={selectedEvent.risk === 'High' ? 'danger' : selectedEvent.risk === 'Medium' ? 'warning' : 'success'}
                                                    className="text-[10px] px-1.5 py-0.5 h-5 flex items-center gap-1"
                                                >
                                                    <AlertTriangle size={10} />
                                                    {selectedEvent.risk} Risk
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    {can(PERMISSIONS.MANAGE_APPOINTMENTS) && (
                                        <button
                                            onClick={handleToggleAppointmentType}
                                            className="shrink-0 text-[10px] font-bold text-primary-600 hover:text-primary-700 bg-white hover:bg-primary-50 px-2 py-1 rounded transition-colors flex items-center gap-1 border border-primary-200 shadow-sm"
                                        >
                                            <Zap size={10} />
                                            Switch
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Appointment Info Grid - REMOVED */}

                        {/* Primary Actions */}
                        <div className="grid grid-cols-2 gap-2 pt-1">
                            {selectedEvent.isOnline && (
                                <button
                                    onClick={() => { setIsEventModalOpen(false); router.push(`/meet/${selectedEvent.id}`); }}
                                    className="flex items-center justify-center gap-1.5 py-2 bg-primary-600 text-white rounded-md font-bold hover:bg-primary-700 transition-colors text-xs shadow-sm shadow-primary-200"
                                >
                                    <Video size={14} />
                                    Join Meeting
                                </button>
                            )}
                            <button
                                onClick={() => router.push(`/patients/${selectedEvent.patientId}`)}
                                className={clsx(
                                    "flex items-center justify-center gap-1.5 py-2 rounded-md font-bold transition-colors text-xs border shadow-sm",
                                    !selectedEvent.isOnline ? "col-span-2 bg-slate-900 text-white hover:bg-slate-800 border-slate-900" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                                )}
                            >
                                <Users size={14} />
                                View Patient
                            </button>
                        </div>

                        {/* Copy Patient Link - Only for virtual appointments */}
                        {selectedEvent.isOnline && (
                            <div className="pt-2 border-t border-slate-100 mt-2">
                                <button
                                    onClick={() => {
                                        const link = `${window.location.origin}/meet/${selectedEvent.id}`;
                                        navigator.clipboard.writeText(link);
                                        toast.success('Patient meeting link copied to clipboard!');
                                    }}
                                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-50 text-emerald-700 rounded-lg font-semibold hover:bg-emerald-100 transition-colors text-xs border border-emerald-200 shadow-sm"
                                >
                                    <Link2 size={14} />
                                    Copy Patient Meeting Link
                                </button>
                                <p className="text-[10px] text-slate-400 mt-1.5 text-center">Share this link with your patient to join the meeting</p>
                            </div>
                        )}

                        {/* Actions Grid - Compacted */}
                        <div className="grid grid-cols-5 gap-2 pt-2 border-t border-slate-100">
                            {can(PERMISSIONS.MANAGE_APPOINTMENTS) && (
                                <button
                                    onClick={() => {
                                        setIsEventModalOpen(false);
                                        setIsRescheduleModalOpen(true);
                                    }}
                                    className="flex flex-col items-center justify-center gap-1 py-1.5 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors"
                                >
                                    <Clock size={16} />
                                    <span className="text-[10px] font-bold">Reschedule</span>
                                </button>
                            )}
                            <button
                                onClick={() => {
                                    setIsEventModalOpen(false);
                                    setIsNotesModalOpen(true);
                                    setNoteView('list');
                                }}
                                className="flex flex-col items-center justify-center gap-1 py-1.5 bg-slate-50 text-slate-600 rounded-md hover:bg-slate-100 transition-colors"
                            >
                                <FileText size={16} />
                                <span className="text-[10px] font-bold">Note</span>
                            </button>
                            <button
                                onClick={() => router.push(`/billing/new?appointmentId=${selectedEvent.id}`)}
                                className="flex flex-col items-center justify-center gap-1 py-1.5 bg-slate-50 text-slate-600 rounded-md hover:bg-slate-100 transition-colors"
                            >
                                <LayoutGrid size={16} />
                                <span className="text-[10px] font-bold">Invoice</span>
                            </button>
                            {can(PERMISSIONS.MANAGE_APPOINTMENTS) && (
                                <button
                                    onClick={handleSendToWaitlist}
                                    className="flex flex-col items-center justify-center gap-1 py-1.5 bg-amber-50 text-amber-700 rounded-md hover:bg-amber-100 transition-colors"
                                >
                                    <Users size={16} />
                                    <span className="text-[10px] font-bold">Waitlist</span>
                                </button>
                            )}
                            {can(PERMISSIONS.MANAGE_APPOINTMENTS) && (
                                <button
                                    onClick={handleCancelAppointment}
                                    className="flex flex-col items-center justify-center gap-1 py-1.5 bg-red-50 text-red-700 rounded-md hover:bg-red-100 transition-colors"
                                >
                                    <X size={16} />
                                    <span className="text-[10px] font-bold">Cancel</span>
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </Modal>

            {/* Reschedule Modal */}
            <Modal isOpen={isRescheduleModalOpen} onClose={() => { setIsRescheduleModalOpen(false); setSelectedCalendarDate(null); setAvailableTimeSlots([]); }} title="Reschedule Appointment" maxWidth="lg">
                <div className="space-y-5">
                    {/* Type Restriction Notice */}
                    {selectedEvent && (
                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 flex items-start gap-2">
                            <AlertTriangle size={16} className="text-blue-600 mt-0.5 shrink-0" />
                            <div className="text-sm text-blue-800">
                                <strong>Note:</strong> This is a <strong>{selectedEvent.type}</strong> appointment.
                                You can only reschedule to <strong>{selectedEvent.type}</strong> time slots.
                            </div>
                        </div>
                    )}
                    {/* Calendar Section */}
                    <div>
                        <label className="text-sm font-bold text-slate-700 mb-3 block">
                            Select New Date
                            {selectedCalendarDate && (
                                <span className="ml-2 text-primary-600">
                                    → {selectedCalendarDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                                </span>
                            )}
                        </label>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                            {/* Calendar Grid */}
                            <div className="space-y-3">
                                {/* Month/Year Header */}
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="font-bold text-slate-900">
                                        {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                    </h4>
                                </div>

                                {/* Day Headers */}
                                <div className="grid grid-cols-7 gap-2 mb-2">
                                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                        <div key={day} className="text-center text-xs font-bold text-slate-500">
                                            {day}
                                        </div>
                                    ))}
                                </div>

                                {/* Calendar Days */}
                                <div className="grid grid-cols-7 gap-2">
                                    {(() => {
                                        const today = new Date();
                                        const year = today.getFullYear();
                                        const month = today.getMonth();
                                        const firstDay = new Date(year, month, 1).getDay();
                                        const daysInMonth = new Date(year, month + 1, 0).getDate();
                                        const days = [];

                                        // Empty cells for days before month starts
                                        for (let i = 0; i < firstDay; i++) {
                                            days.push(<div key={`empty-${i}`} className="aspect-square" />);
                                        }

                                        // Actual days
                                        for (let day = 1; day <= daysInMonth; day++) {
                                            const date = new Date(year, month, day);
                                            const isToday = day === today.getDate();
                                            const isSelected = selectedCalendarDate?.getDate() === day &&
                                                selectedCalendarDate?.getMonth() === month;
                                            const isPast = date < new Date(today.setHours(0, 0, 0, 0));

                                            days.push(
                                                <button
                                                    key={day}
                                                    onClick={() => !isPast && handleDateSelect(date)}
                                                    disabled={isPast}
                                                    className={clsx(
                                                        "aspect-square rounded-lg text-sm font-medium transition-all",
                                                        isSelected && "bg-primary-600 text-white ring-2 ring-primary-300",
                                                        !isSelected && !isPast && "bg-white hover:bg-primary-50 text-slate-700",
                                                        isToday && !isSelected && "ring-2 ring-primary-200",
                                                        isPast && "bg-slate-100 text-slate-400 cursor-not-allowed"
                                                    )}
                                                >
                                                    {day}
                                                </button>
                                            );
                                        }

                                        return days;
                                    })()}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Time Slots Section */}
                    {selectedCalendarDate && (
                        <div>
                            <label className="text-sm font-bold text-slate-700 mb-3 block">
                                Available Time Slots
                                <span className="text-xs font-normal text-slate-500 ml-2">
                                    ({selectedCalendarDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})
                                </span>
                            </label>
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 max-h-64 overflow-y-auto">
                                {availableTimeSlots.length === 0 ? (
                                    <div className="text-center py-8 px-4">
                                        <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <AlertTriangle className="text-amber-600" size={24} />
                                        </div>
                                        <h4 className="font-bold text-slate-900 mb-2">
                                            No {selectedEvent?.type} Slots Available
                                        </h4>
                                        <p className="text-sm text-slate-600">
                                            {selectedEvent?.type === 'Virtual'
                                                ? 'No online appointment slots are available for this date. Please try a different date or contact support.'
                                                : 'No in-person appointment slots are available for this date. Please try a different date or contact support.'}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-4 gap-2">
                                        {availableTimeSlots.map((slot) => {
                                            const isSelected = rescheduleTime === slot;
                                            const [hours, minutes] = slot.split(':');
                                            const displayTime = new Date(2000, 0, 1, parseInt(hours), parseInt(minutes))
                                                .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

                                            return (
                                                <button
                                                    key={slot}
                                                    onClick={() => setRescheduleTime(slot)}
                                                    className={clsx(
                                                        "py-2.5 px-3 rounded-lg text-sm font-medium transition-all",
                                                        isSelected
                                                            ? "bg-primary-600 text-white ring-2 ring-primary-300"
                                                            : "bg-white hover:bg-primary-50 text-slate-700 border border-slate-200"
                                                    )}
                                                >
                                                    {displayTime}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-2">
                        <Button
                            onClick={handleRescheduleSubmit}
                            className="flex-1"
                            disabled={!rescheduleDate || !rescheduleTime}
                        >
                            Confirm Reschedule
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsRescheduleModalOpen(false);
                                setSelectedCalendarDate(null);
                                setAvailableTimeSlots([]);
                            }}
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Notes Modal */}
            <Modal isOpen={isNotesModalOpen} onClose={() => setIsNotesModalOpen(false)} title="" maxWidth="md">
                {selectedEvent && (
                    <div className="min-h-[300px] flex flex-col">
                        {/* Header with Back Button */}
                        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
                            <button
                                onClick={() => { setIsNotesModalOpen(false); setIsEventModalOpen(true); }}
                                className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors p-1 -ml-1 rounded-md hover:bg-slate-50"
                            >
                                <ChevronLeft size={14} />
                                Back
                            </button>
                            <h3 className="text-lg font-bold text-slate-900">Notes</h3>
                        </div>
                        <div className="flex items-center gap-2 mb-4">
                            <FileText className="text-primary-600" size={20} />
                            <h3 className="text-lg font-bold text-slate-900">Clinical Notes</h3>
                        </div>
                        {/* Tabs */}
                        <div className="flex p-1 bg-slate-100 rounded-lg mb-4">
                            <button
                                onClick={() => setActiveNoteTab('patient')}
                                className={clsx(
                                    "flex-1 py-1.5 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-2",
                                    activeNoteTab === 'patient' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                )}
                            >
                                <Users size={14} />
                                Patient Notes
                            </button>
                            <button
                                onClick={() => setActiveNoteTab('doctor')}
                                className={clsx(
                                    "flex-1 py-1.5 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-2",
                                    activeNoteTab === 'doctor' ? "bg-white text-primary-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                )}
                            >
                                <FileText size={14} />
                                Doctor Notes (Editable)
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 flex flex-col min-h-0">
                            {activeNoteTab === 'patient' ? (
                                <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                                    {/* Mock Patient Notes */}
                                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase">Intake Form</span>
                                            <span className="text-[10px] text-slate-400">• 2 days ago</span>
                                        </div>
                                        <p className="text-sm text-slate-700">Patient reported mild headaches and fatigue over the last week. Requested a checkup.</p>
                                    </div>
                                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase">Message</span>
                                            <span className="text-[10px] text-slate-400">• Yesterday</span>
                                        </div>
                                        <p className="text-sm text-slate-700">"I'm running 5 mins late for the appointment, sorry!"</p>
                                    </div>
                                </div>
                            ) : (
                                // Doctor Notes Logic
                                <>
                                    {noteView === 'list' ? (
                                        <>
                                            <div className="flex-1 overflow-y-auto mb-4 space-y-3 custom-scrollbar max-h-[300px]">
                                                {(!appointmentNotes[selectedEvent.id] || appointmentNotes[selectedEvent.id].length === 0) ? (
                                                    <div className="h-full flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-100 rounded-xl min-h-[150px]">
                                                        <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center mb-2">
                                                            <FileText size={18} />
                                                        </div>
                                                        <p className="text-xs font-bold">No doctor notes yet</p>
                                                    </div>
                                                ) : (
                                                    (appointmentNotes[selectedEvent.id] || []).map((note: string, idx: number) => (
                                                        <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-3 shadow-sm">
                                                            {note}
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                            <div className="flex gap-2 mt-auto">
                                                <Button onClick={() => setNoteView('add')} className="flex-1">
                                                    <Plus size={16} className="mr-2" />
                                                    Add Doctor Note
                                                </Button>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex flex-col h-full">
                                            <label className="text-sm font-bold text-slate-700 mb-2">New Note</label>
                                            <textarea
                                                value={newNoteText}
                                                onChange={(e) => setNewNoteText(e.target.value)}
                                                placeholder="Type your clinical note here..."
                                                className="flex-1 w-full p-3 bg-white border border-slate-200 rounded-lg text-sm mb-4 resize-none focus:outline-none focus:ring-2 focus:ring-primary-100 min-h-[150px]"
                                                autoFocus
                                            />
                                            <div className="flex gap-2">
                                                <Button onClick={handleSaveNote} disabled={!newNoteText.trim()} className="flex-1">
                                                    Save Note
                                                </Button>
                                                <Button variant="outline" onClick={() => { setNoteView('list'); setNewNoteText(''); }}>
                                                    Cancel
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                )}
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Delete Schedule" maxWidth="sm">
                <div className="space-y-4">
                    <p className="text-slate-600">Are you sure you want to delete this schedule? This action cannot be undone.</p>

                    <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg border border-red-100">
                        <input
                            type="checkbox"
                            id="deletePatient"
                            checked={isDeletePatientChecked}
                            onChange={(e) => setIsDeletePatientChecked(e.target.checked)}
                            className="w-4 h-4 text-red-600 rounded border-red-300 focus:ring-red-500"
                        />
                        <label htmlFor="deletePatient" className="text-sm font-medium text-red-800 cursor-pointer select-none">
                            Delete associated patient as well
                        </label>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <Button
                            onClick={handleConfirmDelete}
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                        >
                            <Trash2 size={16} className="mr-2" />
                            Delete
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => setIsDeleteModalOpen(false)}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Type Switch Confirmation Modal */}
            <Modal isOpen={isTypeSwitchConfirmOpen} onClose={() => { setIsTypeSwitchConfirmOpen(false); setPendingTypeSwitch(null); }} title="Confirm Appointment Type Change" maxWidth="sm">
                {selectedEvent && pendingTypeSwitch && (
                    <div className="space-y-4">
                        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-sm font-medium text-slate-600">Current Type:</span>
                                <Badge variant={selectedEvent.type === 'Virtual' ? 'info' : 'neutral'} className="text-xs">
                                    {selectedEvent.type === 'Virtual' ? <Video size={12} className="mr-1" /> : <MapPin size={12} className="mr-1" />}
                                    {selectedEvent.type}
                                </Badge>
                            </div>
                            <div className="flex items-center justify-center my-2">
                                <ArrowUpRight size={20} className="text-primary-600 rotate-90" />
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-slate-600">New Type:</span>
                                <Badge variant={pendingTypeSwitch.targetTypeLabel === 'Virtual' ? 'info' : 'neutral'} className="text-xs">
                                    {pendingTypeSwitch.targetTypeLabel === 'Virtual' ? <Video size={12} className="mr-1" /> : <MapPin size={12} className="mr-1" />}
                                    {pendingTypeSwitch.targetTypeLabel}
                                </Badge>
                            </div>
                        </div>

                        <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                            <p className="text-sm text-blue-800">
                                <strong>{selectedEvent.patientName}</strong> will be notified of this change.
                            </p>
                            <p className="text-xs text-blue-600 mt-1">
                                {selectedEvent.time}
                            </p>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <Button
                                onClick={confirmTypeSwitch}
                                className="flex-1"
                            >
                                <Check size={16} className="mr-2" />
                                Confirm Change
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => { setIsTypeSwitchConfirmOpen(false); setPendingTypeSwitch(null); }}
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default function Schedule() {
    return (
        <Suspense fallback={<div>Loading schedule...</div>}>
            <ScheduleContent />
        </Suspense>
    );
}
