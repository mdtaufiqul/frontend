"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import FormRenderer, { FormConfig } from '@/components/forms/FormRenderer';
import BookingSummary from '@/components/forms/BookingSummary';
import api from '@/utils/api';
import { toast } from 'sonner';

const PublicFormPage = () => {
    const params = useParams();
    const id = params.id as string;
    const [config, setConfig] = useState<FormConfig | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const [meetingUrl, setMeetingUrl] = useState<string | null>(null);
    const [appointmentDetails, setAppointmentDetails] = useState<any>(null);

    // State for booking summary
    const [currentFormData, setCurrentFormData] = useState<Record<string, any>>({});
    const [doctorData, setDoctorData] = useState<any>(null);
    const [serviceData, setServiceData] = useState<any>(null);

    useEffect(() => {
        const fetchForm = async () => {
            try {
                const response = await api.get(`/forms/${id}`);
                const fetchedConfig = response.data.config || { title: response.data.title, steps: [] };
                fetchedConfig.title = response.data.title; // Sync title
                fetchedConfig.clinicId = response.data.clinicId; // Propagate clinic context
                setConfig(fetchedConfig);
            } catch (error) {
                console.error("Failed to load form:", error);
                toast.error("Form not found or unavailable");
            } finally {
                setIsLoading(false);
            }
        };

        if (id) fetchForm();
    }, [id]);

    // Fetch doctor and service data when formData changes
    useEffect(() => {
        const findFieldValueByType = (fieldType: string) => {
            if (!config?.fields && !config?.steps) return null;

            const allFields = config.steps
                ? config.steps.flatMap((step: any) => step.fields || [])
                : (config.fields || []);

            const field = allFields.find((f: any) => f.type === fieldType);
            return field ? currentFormData[field.id] : null;
        };

        const fetchDoctorData = async () => {
            const doctorId = findFieldValueByType('doctor_selection');
            if (doctorId) {
                try {
                    console.log('[Booking Form] Fetching doctor data for ID:', doctorId);
                    const response = await api.get(`/users/${doctorId}`);
                    setDoctorData(response.data);
                } catch (error) {
                    console.error('Failed to fetch doctor data:', error);
                }
            }
        };

        const fetchServiceData = async () => {
            const serviceId = findFieldValueByType('service_selection');
            if (serviceId) {
                try {
                    console.log('[Booking Form] Fetching service data for ID:', serviceId);
                    const response = await api.get(`/services/${serviceId}`);
                    setServiceData(response.data);
                } catch (error) {
                    console.error('Failed to fetch service data:', error);
                }
            }
        };

        fetchDoctorData();
        fetchServiceData();
    }, [currentFormData, config]);

    const handleSubmit = async (data: Record<string, any>) => {
        try {
            console.log("=== FORM SUBMISSION DATA ===");
            console.log("Full data object:", JSON.stringify(data, null, 2));
            console.log("Field IDs:", Object.keys(data));
            console.log("============================");

            // Real submission endpoint
            const res = await api.post(`/forms/${id}/submissions`, data);

            // Store appointment details if returned
            if (res.data?.appointment) {
                setAppointmentDetails(res.data.appointment);
            }

            if (res.data?.meetingLink) {
                setMeetingUrl(res.data.meetingLink);
            } else if (res.data?.appointment?.id && res.data.appointment.type === 'video') {
                // Fallback if link not directly returned but ID is
                const frontendUrl = window.location.origin;
                setMeetingUrl(`${frontendUrl}/meet/${res.data.appointment.id}`);
            }

            setIsSubmitted(true);
            toast.success("Appointment booked successfully!");
        } catch (error: any) {
            console.error("Submission error:", error);
            const errorMessage = error.response?.data?.message || error.message || "Submission failed";
            toast.error(errorMessage);
        }
    };

    if (isLoading) return <div className="min-h-screen flex items-center justify-center text-slate-500">Loading form...</div>;
    if (!config) return <div className="min-h-screen flex items-center justify-center text-red-500">Form not found</div>;
    if (isSubmitted) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-xl shadow-sm text-center max-w-md w-full">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Appointment Confirmed!</h2>
                <p className="text-slate-500 mb-6">Your appointment has been successfully booked.</p>

                {appointmentDetails && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6 text-left">
                        <p className="text-slate-700 font-bold text-sm mb-3">Appointment Details</p>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Date & Time:</span>
                                <span className="text-slate-900 font-semibold">
                                    {new Date(appointmentDetails.date).toLocaleString('en-US', {
                                        weekday: 'short',
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        timeZone: appointmentDetails.doctorTimezone || 'UTC', // [FIX] Dynamic Timezone
                                        timeZoneName: 'short'
                                    })}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Type:</span>
                                <span className={`font-semibold ${appointmentDetails.type === 'video' ? 'text-green-600' : 'text-blue-600'}`}>
                                    {appointmentDetails.type === 'video' ? '🎥 Online' : '🏥 In-Person'}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Status:</span>
                                <span className="text-green-600 font-semibold capitalize">{appointmentDetails.status}</span>
                            </div>

                            {/* Add to Google Calendar */}
                            <div className="pt-2 mt-2 border-t border-slate-200">
                                <a
                                    href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=Medical%20Appointment&dates=${new Date(appointmentDetails.date).toISOString().replace(/-|:|\.\d\d\d/g, "")}/${new Date(new Date(appointmentDetails.date).getTime() + 30 * 60000).toISOString().replace(/-|:|\.\d\d\d/g, "")}&details=Appointment%20with%20Doctor&location=${appointmentDetails.type === 'video' ? 'Online' : 'Clinic'}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary-600 text-xs font-bold hover:underline flex items-center gap-1"
                                >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                                    Add to Google Calendar
                                </a>
                            </div>
                        </div>
                    </div>
                )}

                {meetingUrl && (
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
                        <p className="text-blue-800 font-bold text-sm mb-2">Upcoming Video Consultation</p>
                        <p className="text-blue-600 text-xs mb-3">Please save this link to join your appointment.</p>

                        <div className="flex flex-col gap-2">
                            <a
                                href={meetingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block w-full py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors"
                            >
                                Join Video Call
                            </a>
                            <button
                                type="button"
                                onClick={() => {
                                    navigator.clipboard.writeText(meetingUrl);
                                    toast.success('Link copied to clipboard!');
                                }}
                                className="block w-full py-2 bg-white text-blue-600 border border-blue-200 rounded-lg font-bold text-sm hover:bg-blue-50 transition-colors"
                            >
                                Copy Link
                            </button>
                        </div>
                    </div>
                )}

                <button
                    onClick={() => window.location.reload()}
                    className="text-sm font-bold text-slate-400 hover:text-slate-600"
                >
                    Submit another response
                </button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Form Column */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="p-8 border-b border-slate-100 bg-white">
                                <h1 className="text-2xl font-bold text-slate-900">{config.title}</h1>
                                <p className="text-slate-500 mt-1">{config.description || 'Please complete the form below.'}</p>
                            </div>
                            <div className="p-8">
                                <FormRenderer
                                    config={config}
                                    onSubmit={handleSubmit}
                                    onDataChange={setCurrentFormData}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Booking Summary Sidebar */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-4">
                            <BookingSummary
                                formData={currentFormData}
                                doctorData={doctorData}
                                serviceData={serviceData}
                                config={config}
                            />
                        </div>
                    </div>
                </div>

                <div className="mt-8 text-center text-sm text-slate-400">
                    Powered by Mediflow
                </div>
            </div>
        </div>
    );
};

export default PublicFormPage;
