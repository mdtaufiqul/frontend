"use client";

import React from 'react';
import { Video, MapPin, Calendar, Clock, User, Mail, Phone, CheckCircle2, Circle, Stethoscope, DollarSign } from 'lucide-react';

interface BookingSummaryProps {
    formData: Record<string, any>;
    doctorData?: any;
    serviceData?: any;
    config?: any; // Form config to understand field types
}

const BookingSummary: React.FC<BookingSummaryProps> = ({ formData, doctorData, serviceData, config }) => {
    console.log('[BookingSummary] Rendering with:', { formData, doctorData, serviceData, config });

    // Find field values by type instead of hardcoded IDs
    const findFieldValueByType = (fieldType: string) => {
        if (!config?.fields && !config?.steps) return null;

        const allFields = config.steps
            ? config.steps.flatMap((step: any) => step.fields || [])
            : (config.fields || []);

        const field = allFields.find((f: any) => f.type === fieldType);
        return field ? formData[field.id] : null;
    };

    const doctorId = findFieldValueByType('doctor_selection');
    const serviceId = findFieldValueByType('service_selection');
    const scheduleData = findFieldValueByType('schedule');

    const hasDoctor = !!doctorId;
    const hasService = !!serviceId;
    const hasSchedule = !!scheduleData;
    const hasPatientInfo = formData.name || formData.email || formData.phone;
    const hasAnyData = hasDoctor || hasService || hasSchedule || hasPatientInfo;

    const formatDate = (dateString: string) => {
        if (!dateString) return '';
        try {
            // Ensure dateString is actually a string
            const dateStr = typeof dateString === 'string' ? dateString : String(dateString);

            // If it's a YYYY-MM-DD format (from calendar selection), parse it as a local date
            if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
                const [year, month, day] = dateStr.split('-').map(Number);
                const date = new Date(year, month - 1, day); // Create local date
                return date.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                });
            }

            // For other date formats, use the original logic with timezone
            const date = new Date(dateStr);
            // Check if date is valid
            if (isNaN(date.getTime())) return 'Invalid Date';

            const timezone = doctorData?.timezone || 'UTC';
            return date.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                timeZone: timezone
            });
        } catch (error) {
            console.error('[BookingSummary] Error formatting date:', error);
            return 'Invalid Date';
        }
    };

    const formatTime = (timeString: string) => {
        if (!timeString) return timeString;
        // If time is already formatted (e.g., "09:00"), return as is
        if (timeString.match(/^\d{1,2}:\d{2}$/)) return timeString;
        // Otherwise parse and format
        const timezone = doctorData?.timezone || 'UTC';
        const date = new Date(timeString);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: timezone
        });
    };

    const SectionHeader = ({ title, completed }: { title: string; completed: boolean }) => (
        <div className="flex items-center gap-2 mb-3">
            {completed ? (
                <CheckCircle2 size={16} className="text-green-600" />
            ) : (
                <Circle size={16} className="text-slate-300" />
            )}
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">{title}</p>
        </div>
    );

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-fit">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6">
                <h3 className="font-bold text-xl text-white mb-1">Booking Summary</h3>
                <p className="text-sm text-blue-100">Review your appointment details</p>
            </div>

            <div className="p-6">
                {/* Show empty state if no data */}
                {!hasAnyData ? (
                    <div className="text-center py-12">
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Calendar size={32} className="text-slate-400" />
                        </div>
                        <p className="text-sm font-medium text-slate-600 mb-1">No selections yet</p>
                        <p className="text-xs text-slate-400">Fill the form to see your booking summary</p>
                    </div>
                ) : (
                    <div className="space-y-5">
                        {/* Doctor Section */}
                        {hasDoctor && (
                            <div>
                                <SectionHeader title="Doctor" completed={true} />
                                {doctorData ? (
                                    <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                                        {doctorData.image ? (
                                            <img
                                                src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${doctorData.image}`}
                                                alt={doctorData.name}
                                                className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-md"
                                            />
                                        ) : (
                                            <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center border-2 border-white shadow-md">
                                                <Stethoscope size={24} className="text-blue-600" />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-slate-900 mb-0.5">{doctorData.name}</p>
                                            {doctorData.specialties && doctorData.specialties.length > 0 && (
                                                <p className="text-xs text-slate-600">{doctorData.specialties.join(', ')}</p>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                                        <p className="text-sm text-slate-500 italic">Loading doctor information...</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Service Section */}
                        {hasService && (
                            <div>
                                <SectionHeader title="Service" completed={true} />
                                {serviceData ? (
                                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-100">
                                        <p className="font-bold text-slate-900 mb-2">{serviceData.name}</p>
                                        {serviceData.description && (
                                            <p className="text-xs text-slate-600 mb-3 line-clamp-2">{serviceData.description}</p>
                                        )}
                                        <div className="flex items-center justify-between pt-3 border-t border-purple-200">
                                            <span className="text-xs text-slate-600 flex items-center gap-1.5">
                                                <Clock size={14} className="text-purple-600" />
                                                <span className="font-medium">{serviceData.duration} min</span>
                                            </span>
                                            {serviceData.price !== undefined && (
                                                <span className="flex items-center gap-1 font-bold text-purple-700">
                                                    <DollarSign size={14} />
                                                    {serviceData.price}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                                        <p className="text-sm text-slate-500 italic">Loading service information...</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Date & Time Section */}
                        {hasSchedule && (
                            <div>
                                <SectionHeader title="Date & Time" completed={true} />
                                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg p-4 border border-emerald-100">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Calendar size={18} className="text-emerald-600" />
                                        <p className="font-bold text-emerald-900">
                                            {formatDate(scheduleData?.date || scheduleData)}
                                        </p>
                                    </div>
                                    {scheduleData?.time && (
                                        <div className="flex items-center gap-2">
                                            <Clock size={18} className="text-emerald-600" />
                                            <p className="text-sm text-emerald-700 font-semibold">{formatTime(scheduleData.time)}</p>
                                        </div>
                                    )}
                                    {doctorData?.timezone && (
                                        <div className="mt-3 pt-3 border-t border-emerald-200">
                                            <p className="text-xs text-emerald-700 font-medium">
                                                🌍 Timezone: {doctorData.timezone}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Appointment Type Section */}
                        {formData.appointmentType && (
                            <div>
                                <SectionHeader title="Type" completed={true} />
                                <div className={`flex items-center gap-3 p-4 rounded-lg border-2 ${formData.appointmentType === 'video'
                                    ? 'bg-purple-50 border-purple-200'
                                    : 'bg-green-50 border-green-200'
                                    }`}>
                                    {formData.appointmentType === 'video' ? (
                                        <Video size={20} className="text-purple-600" />
                                    ) : (
                                        <MapPin size={20} className="text-green-600" />
                                    )}
                                    <span className={`font-bold text-sm ${formData.appointmentType === 'video' ? 'text-purple-700' : 'text-green-700'
                                        }`}>
                                        {formData.appointmentType === 'video' ? 'Virtual Consultation' : 'In-Person Visit'}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Patient Information Section */}
                        {hasPatientInfo && (
                            <div className="border-t border-slate-200 pt-5">
                                <SectionHeader title="Your Information" completed={true} />
                                <div className="space-y-2.5">
                                    {formData.name && (
                                        <div className="flex items-center gap-3 text-sm p-2 rounded-lg hover:bg-slate-50 transition-colors">
                                            <User size={16} className="text-slate-400" />
                                            <span className="text-slate-700 font-medium">{formData.name}</span>
                                        </div>
                                    )}
                                    {formData.email && (
                                        <div className="flex items-center gap-3 text-sm p-2 rounded-lg hover:bg-slate-50 transition-colors">
                                            <Mail size={16} className="text-slate-400" />
                                            <span className="text-slate-700">{formData.email}</span>
                                        </div>
                                    )}
                                    {formData.phone && (
                                        <div className="flex items-center gap-3 text-sm p-2 rounded-lg hover:bg-slate-50 transition-colors">
                                            <Phone size={16} className="text-slate-400" />
                                            <span className="text-slate-700">{formData.phone}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default BookingSummary;
