import React, { useState, useEffect } from 'react';
import { AlertCircle, Calendar, ChevronLeft, ChevronRight, Video, MapPin, Globe } from 'lucide-react';
import clsx from 'clsx';
import { format, addDays, startOfWeek, addWeeks, subWeeks, isSameDay } from 'date-fns';
import { fromZonedTime, formatInTimeZone } from 'date-fns-tz';
import { FormField, FormConfig } from './FormRenderer'; // We'll need to export these types from FormRenderer or a shared types file
import { normalizeTimezone, getTimezoneAbbreviation, getTimezoneDisplayName } from '@/utils/timezones';

interface ScheduleFieldProps {
    field: FormField;
    formData: Record<string, any>;
    handleChange: (id: string, value: any) => void;
    config: FormConfig;
    practitioners: any[];
    services: any[];
    hasError: boolean;
    errors: Record<string, string>;
    timezone?: string;
}

const ScheduleField: React.FC<ScheduleFieldProps> = ({
    field,
    formData,
    handleChange,
    config,
    practitioners,
    services,
    hasError,
    errors,
    timezone
}) => {
    // Calendar State
    const [calendarViewDate, setCalendarViewDate] = useState(new Date());

    // Timezone Management
    const [showInLocalTimezone, setShowInLocalTimezone] = useState(false);
    const doctorTimezone = normalizeTimezone(timezone);

    // Detect patient's local timezone
    const patientTimezone = typeof window !== 'undefined'
        ? Intl.DateTimeFormat().resolvedOptions().timeZone
        : 'UTC';

    // Determine which timezone to display
    const displayTimezone = showInLocalTimezone ? patientTimezone : doctorTimezone;
    const timeZone = doctorTimezone; // Keep for slot generation (always use doctor's timezone)

    // Get current schedule data
    const scheduleData = formData[field.id] || {};
    const selectedSpecialty = scheduleData.specialty;
    const selectedPractitionerId = scheduleData.practitioner;
    const selectedDateStr = scheduleData.date;
    const selectedTime = scheduleData.time;
    // Ensure selectedDate is a valid Date object
    const rawDate = selectedDateStr ? new Date(selectedDateStr) : null;
    const selectedDate = rawDate && !isNaN(rawDate.getTime()) ? rawDate : null;

    // Get patient's consultation type choice
    const serviceFieldId = config.fields?.find(f => f.type === 'service_selection')?.id
        || config.steps?.flatMap(s => s.fields).find(f => f.type === 'service_selection')?.id;
    const consultationTypeFieldId = serviceFieldId ? `${serviceFieldId}-consultation-type` : null;
    const patientConsultationType = consultationTypeFieldId ? (formData[consultationTypeFieldId] || 'Offline') : null;

    // Extract unique specialties
    const allSpecialties = new Set<string>();
    practitioners.forEach(p => {
        if (p.specialties && Array.isArray(p.specialties)) {
            p.specialties.forEach((s: string) => allSpecialties.add(s));
        }
    });
    const specialtyOptions = Array.from(allSpecialties).sort();

    // Auto-select first specialty
    const effectiveSpecialty = selectedSpecialty || (specialtyOptions.length > 0 ? specialtyOptions[0] : null);

    // Filter practitioners
    const filteredPractitioners = effectiveSpecialty
        ? practitioners.filter(p => p.specialties?.includes(effectiveSpecialty))
        : practitioners;

    // Get professional/doctor selection if it exists elsewhere in the form
    const doctorSelectorField = config.steps?.flatMap(s => s.fields).find(f => f.type === 'doctor_selection' || f.type === 'practitioner_selection');
    const externallySelectedDoctorId = doctorSelectorField ? formData[doctorSelectorField.id] : null;

    // Auto-select first practitioner logic
    let effectivePractitionerId = selectedPractitionerId;
    if (!effectivePractitionerId || !filteredPractitioners.find(p => String(p.id) === String(effectivePractitionerId))) {
        effectivePractitionerId = filteredPractitioners.length > 0 ? filteredPractitioners[0].id : null;
    }

    // Determine the active doctor for this schedule (prefer external selection)
    const activeDoctorId = externallySelectedDoctorId || effectivePractitionerId;

    // Initialize defaults (avoiding loop with check)
    useEffect(() => {
        if (!scheduleData.specialty && effectiveSpecialty && activeDoctorId) {
            // Initialization logic
        }
    }, []);

    // Better approach for auto-selection:
    useEffect(() => {
        if (practitioners.length > 0 && !scheduleData.specialty && effectiveSpecialty && activeDoctorId) {
            handleChange(field.id, {
                specialty: effectiveSpecialty,
                practitioner: activeDoctorId,
                date: null,
                time: null
            });
        }
    }, [practitioners, effectiveSpecialty, activeDoctorId]);

    // State for available slots from backend
    const [availableSlots, setAvailableSlots] = useState<any[]>([]);
    const [isLoadingSlots, setIsLoadingSlots] = useState(false);

    // Fetch available slots from backend
    useEffect(() => {
        if (selectedDate && activeDoctorId) {
            const fetchAvailableSlots = async () => {
                setIsLoadingSlots(true);
                try {
                    const { default: api } = await import('@/utils/api');
                    const dateStr = format(selectedDate, 'yyyy-MM-dd');

                    // Determine consultation type for filtering
                    let consultationType: 'online' | 'in-person' | undefined;
                    if (patientConsultationType) {
                        consultationType = patientConsultationType.toLowerCase() === 'online' ? 'online' : 'in-person';
                    }

                    const res = await api.get('/appointments/available-slots', {
                        params: {
                            doctorId: activeDoctorId,
                            date: dateStr,
                            type: consultationType,
                            timezone: doctorTimezone
                        }
                    });

                    // Backend returns { slots: [...], allSlots: [...] }
                    // We want only the available slots respecting the filter
                    const slots = res.data.slots || [];
                    setAvailableSlots(slots);
                } catch (error) {
                    console.error("Failed to fetch available slots", error);
                    setAvailableSlots([]);
                } finally {
                    setIsLoadingSlots(false);
                }
            };
            fetchAvailableSlots();
        } else {
            setAvailableSlots([]);
            setIsLoadingSlots(false);
        }
    }, [selectedDateStr, effectivePractitionerId, doctorTimezone, patientConsultationType]);

    const getAbsoluteDateForSlot = (dayDate: Date, timeLabel: string) => {
        const dateStr = format(dayDate, 'yyyy-MM-dd');
        const startOfDayInZone = fromZonedTime(dateStr + ' 00:00', timeZone);
        const [h, m] = timeLabel.split(':').map(Number);
        const finalDate = new Date(startOfDayInZone.getTime() + (h * 60 + m) * 60000);
        return finalDate;
    };

    const weekStart = startOfWeek(calendarViewDate, { weekStartsOn: 1 });
    const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

    let practitionerOptions = field.options || [];
    if (practitionerOptions.length === 0) {
        practitionerOptions = filteredPractitioners.map(p => ({
            label: p.name,
            value: p.id,
            specialty: p.specialties?.[0]
        }));
    }

    return (
        <div className={clsx("border rounded-xl bg-white overflow-hidden transition-all", hasError ? "border-red-300 ring-4 ring-red-500/10" : "border-slate-200")}>
            {/* Specialty & Practitioner Selection (Only if not selected externally) */}
            {!externallySelectedDoctorId && (
                <>
                    {/* Specialty Selection */}
                    {specialtyOptions.length > 0 && (
                        <div className="p-4 bg-slate-50 border-b border-slate-200">
                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                Select Specialty
                                <span className="text-red-500 ml-1">*</span>
                            </label>
                            <select
                                value={effectiveSpecialty || ''}
                                onChange={(e) => {
                                    const newSpecialty = e.target.value;
                                    const firstPractitioner = practitioners.find(p => p.specialties?.includes(newSpecialty));
                                    handleChange(field.id, {
                                        specialty: newSpecialty,
                                        practitioner: firstPractitioner?.id || null,
                                        date: null,
                                        time: null
                                    });
                                }}
                                className="w-full px-4 py-3 rounded-lg border border-slate-200 text-sm focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 appearance-none outline-none bg-white"
                            >
                                {specialtyOptions.map((specialty, i) => (
                                    <option key={i} value={specialty}>{specialty}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Practitioner Selection */}
                    <div className="p-4 bg-slate-50 border-b border-slate-200">
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                            Select Practitioner
                            <span className="text-red-500 ml-1">*</span>
                        </label>
                        <select
                            value={effectivePractitionerId || ''}
                            onChange={(e) => {
                                handleChange(field.id, {
                                    ...scheduleData,
                                    practitioner: e.target.value,
                                    date: null,
                                    time: null
                                });
                            }}
                            className="w-full px-4 py-3 rounded-lg border border-slate-200 text-sm focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 appearance-none outline-none bg-white"
                        >
                            <option value="" disabled>Choose a practitioner...</option>
                            {practitionerOptions.map((opt, i) => {
                                const val = typeof opt === 'string' ? opt : opt.value;
                                const lbl = typeof opt === 'string' ? opt : opt.label;
                                const meta = (typeof opt === 'object' ? opt : {}) as any;
                                return <option key={i} value={val}>{lbl} {meta.specialty ? `(${meta.specialty})` : ''}</option>;
                            })}
                        </select>
                    </div>
                </>
            )}

            {/* Timezone Indicator & Toggle */}
            {activeDoctorId && doctorTimezone !== patientTimezone && (
                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Globe size={16} className="text-blue-600" />
                            <div>
                                <p className="text-xs font-semibold text-slate-600">Appointment times shown in:</p>
                                <p className="text-sm font-bold text-slate-900">
                                    {showInLocalTimezone
                                        ? `${getTimezoneDisplayName(patientTimezone)} (${getTimezoneAbbreviation(patientTimezone)})`
                                        : `${getTimezoneDisplayName(doctorTimezone)} (${getTimezoneAbbreviation(doctorTimezone)})`
                                    }
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowInLocalTimezone(!showInLocalTimezone)}
                            className="px-3 py-2 text-xs font-bold text-blue-700 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 transition-all shadow-sm"
                        >
                            {showInLocalTimezone ? '🌍 Show Doctor\'s Time' : '🏠 Show My Local Time'}
                        </button>
                    </div>
                </div>
            )}

            {/* Calendar Header */}
            <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center justify-between">
                <button type="button" onClick={() => setCalendarViewDate(subWeeks(calendarViewDate, 1))} className="p-1 hover:bg-white rounded shadow-sm text-slate-500"><ChevronLeft size={16} /></button>
                <span className="font-bold text-slate-700">{format(calendarViewDate, 'MMMM yyyy')}</span>
                <button type="button" onClick={() => setCalendarViewDate(addWeeks(calendarViewDate, 1))} className="p-1 hover:bg-white rounded shadow-sm text-slate-500"><ChevronRight size={16} /></button>
            </div>

            {/* Date Grid */}
            <div className="grid grid-cols-7 border-b border-slate-200 divide-x divide-slate-100">
                {weekDays.map((day, i) => {
                    const isSelected = selectedDate && isSameDay(day, selectedDate);
                    const isToday = isSameDay(day, new Date());

                    return (
                        <div
                            key={i}
                            onClick={() => {
                                if (!activeDoctorId) {
                                    alert("Please select a doctor first");
                                    return;
                                }
                                handleChange(field.id, {
                                    ...scheduleData,
                                    date: format(day, 'yyyy-MM-dd'),
                                    time: null
                                });
                            }}
                            className={clsx(
                                "flex flex-col items-center justify-center py-4 cursor-pointer transition-all hover:bg-slate-50/50",
                                isSelected ? "bg-primary-50/80 active-date-cell" : "bg-white",
                                !activeDoctorId && "opacity-50 cursor-not-allowed"
                            )}
                        >
                            <span className="text-[10px] font-black text-slate-400 uppercase mb-1">{format(day, 'EEE')}</span>
                            <div className={clsx(
                                "w-9 h-9 rounded-full flex items-center justify-center text-sm font-black transition-all",
                                isSelected ? "bg-primary-600 text-white shadow-lg shadow-primary-500/30 scale-110" :
                                    isToday ? "bg-slate-100 text-primary-600 ring-2 ring-primary-100" : "text-slate-700"
                            )}>
                                {format(day, 'd')}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Time Slots */}
            <div className="p-6 bg-slate-50/50 min-h-[300px]">
                {!activeDoctorId ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12">
                        <Calendar size={48} strokeWidth={1} className="mb-4 text-slate-300" />
                        <p className="font-medium">Select a practitioner to continue</p>
                    </div>
                ) : !selectedDate ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12">
                        <Calendar size={48} strokeWidth={1} className="mb-4 text-slate-300" />
                        <p className="font-medium">Select a date to view available times</p>
                    </div>
                ) : isLoadingSlots ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
                        <p className="font-medium">Loading available slots...</p>
                    </div>
                ) : (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {(() => {
                            if (availableSlots.length === 0) {
                                const alternativeType = patientConsultationType === 'Online' ? 'Offline' : 'Online';
                                const alternativeLabel = patientConsultationType === 'Online' ? 'In-Person' : 'Online';

                                return (
                                    <div className="text-center py-10 px-6 bg-white rounded-2xl border-2 border-slate-100 shadow-sm">
                                        <div className="w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <AlertCircle className="text-amber-500" size={28} />
                                        </div>
                                        <h4 className="font-black text-slate-900 text-lg mb-2">No {patientConsultationType} Slots</h4>
                                        <p className="text-sm text-slate-500 mb-6 max-w-xs mx-auto">
                                            Unfortunately, there are no {patientConsultationType?.toLowerCase()} appointments available for this date.
                                        </p>
                                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                            <button
                                                type="button"
                                                onClick={() => consultationTypeFieldId && handleChange(consultationTypeFieldId, alternativeType)}
                                                className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                                            >
                                                Try {alternativeLabel}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => alert('Waitlist feature coming soon!')}
                                                className="px-6 py-2.5 bg-white border-2 border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:border-slate-300 transition-all"
                                            >
                                                Join Waitlist
                                            </button>
                                        </div>
                                    </div>
                                );
                            }

                            return (
                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                                    {availableSlots.map((slot, idx) => {
                                        const absDate = getAbsoluteDateForSlot(selectedDate!, slot.time);
                                        const displayedTime = formatInTimeZone(absDate, displayTimezone, 'HH:mm');
                                        const doctorDateStr = formatInTimeZone(absDate, doctorTimezone, 'yyyy-MM-dd');
                                        const patientDateStr = formatInTimeZone(absDate, displayTimezone, 'yyyy-MM-dd');
                                        let dayDiffLabel = '';

                                        if (doctorDateStr !== patientDateStr) {
                                            const docDate = new Date(doctorDateStr);
                                            const patDate = new Date(patientDateStr);
                                            const diffTime = patDate.getTime() - docDate.getTime();
                                            const diffDays = Math.round(diffTime / (1000 * 3600 * 24));
                                            if (diffDays > 0) dayDiffLabel = ` (+${diffDays})`;
                                            else if (diffDays < 0) dayDiffLabel = ` (${diffDays})`;
                                        }

                                        return (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleChange(field.id, { ...scheduleData, time: slot.time });
                                                }}
                                                className={clsx(
                                                    "p-3 rounded-xl text-sm font-bold border-2 transition-all flex flex-col items-center justify-center min-h-[50px]",
                                                    selectedTime === slot.time
                                                        ? "bg-primary-600 border-primary-600 text-white shadow-md shadow-primary-500/20"
                                                        : "bg-white border-slate-100 text-slate-700 hover:border-primary-200 hover:bg-primary-50/30"
                                                )}
                                            >
                                                <span>{displayedTime}{dayDiffLabel}</span>
                                                <span className={clsx(
                                                    "text-[8px] uppercase font-black mt-1 tracking-widest",
                                                    selectedTime === slot.time ? "text-primary-200" : "text-slate-400"
                                                )}>
                                                    {slot.type === 'both' ? 'Mixed' : slot.type}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            );
                        })()}
                    </div>
                )}
            </div>

            {/* Selected Slot Summary */}
            {selectedDate && selectedTime && (
                <div className="p-5 bg-primary-600 text-white text-center animate-in slide-in-from-bottom-4 duration-500">
                    <div className="flex flex-col gap-1 items-center justify-center">
                        <p className="font-bold text-sm flex items-center gap-2 flex-wrap justify-center">
                            {effectiveSpecialty && (
                                <span className="bg-white/20 px-2 py-0.5 rounded-md text-xs font-black uppercase tracking-wider mr-1">
                                    {effectiveSpecialty}
                                </span>
                            )}
                            Confirmed for <span>{format(selectedDate, 'MMMM d, yyyy')}</span> at <span>{selectedTime}</span>
                            <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px] uppercase font-black">
                                {getTimezoneAbbreviation(doctorTimezone)}
                            </span>
                        </p>
                        {doctorTimezone !== patientTimezone && (
                            <p className="text-white/70 text-xs flex items-center gap-1">
                                <Globe size={10} /> Your Time:
                                <span className="font-bold text-white">
                                    {(() => {
                                        const absDate = getAbsoluteDateForSlot(selectedDate, selectedTime);
                                        const localTime = formatInTimeZone(absDate, patientTimezone, 'HH:mm');
                                        const localDate = formatInTimeZone(absDate, patientTimezone, 'MMM d');
                                        return `${localDate}, ${localTime} ${getTimezoneAbbreviation(patientTimezone)}`;
                                    })()}
                                </span>
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ScheduleField;
