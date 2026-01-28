"use client";

import React, { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Clock, Check, Loader2, MapPin, Video, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface TokenDetails {
    doctorName: string;
    doctorId: string;
    patientName: string;
    serviceDuration: number;
    type: 'online' | 'in-person';
    clinicId?: string;
    timezone: string;
}

function RescheduleContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get('token');

    const [details, setDetails] = useState<TokenDetails | null>(null);
    const [isLoadingDetails, setIsLoadingDetails] = useState(true);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [availableSlots, setAvailableSlots] = useState<string[]>([]);
    const [isLoadingSlots, setIsLoadingSlots] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    // 1. Fetch Token Details
    useEffect(() => {
        if (!token) return;

        async function fetchDetails() {
            try {
                const res = await fetch(`${apiUrl}/email/details?token=${token}`);
                if (!res.ok) throw new Error('Invalid or expired token');
                const data = await res.json();
                setDetails(data);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoadingDetails(false);
            }
        }
        fetchDetails();
    }, [token, apiUrl]);

    // 2. Fetch Available Slots when Date Select
    useEffect(() => {
        if (!selectedDate || !details) return;

        async function fetchSlots() {
            if (!selectedDate) return;
            setIsLoadingSlots(true);
            setSelectedTime(null);
            try {
                const dateStr = format(selectedDate, 'yyyy-MM-dd');
                const url = new URL(`${apiUrl}/appointments/available-slots`);
                url.searchParams.append('doctorId', details!.doctorId);
                url.searchParams.append('date', dateStr);
                // Smart Filter: Pass the type from the appointment context!
                if (details!.type) {
                    url.searchParams.append('type', details!.type);
                }
                if (details!.timezone) {
                    url.searchParams.append('timezone', details!.timezone);
                }

                const res = await fetch(url.toString());
                if (!res.ok) throw new Error('Failed to load slots');
                const slots = await res.json();
                setAvailableSlots(slots);
            } catch (err) {
                console.error("Slot fetch error", err);
                toast.error("Could not load available times");
            } finally {
                setIsLoadingSlots(false);
            }
        }

        fetchSlots();
    }, [selectedDate, details, apiUrl]);

    const handleSubmit = async () => {
        if (!selectedDate || !selectedTime || !token) return;

        setIsSubmitting(true);
        try {
            // Combine date and time
            const [hours, minutes] = selectedTime.split(':').map(Number);
            const newDate = new Date(selectedDate);
            newDate.setHours(hours, minutes);

            const res = await fetch(`${apiUrl}/email/reschedule`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token,
                    newDate: newDate.toISOString()
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || 'Failed to reschedule');
            }

            router.push('/public/appointment/success?action=confirmed');

        } catch (err: any) {
            setError(err.message);
            toast.error(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!token) return <div className="p-10 text-center text-red-500 font-bold">Missing access token</div>;
    if (isLoadingDetails) return (
        <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="animate-spin text-primary-600 w-8 h-8" />
        </div>
    );
    if (error) return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <Card className="p-8 max-w-md w-full text-center space-y-4 border-red-100 bg-red-50/50">
                <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600">
                    <AlertCircle size={24} />
                </div>
                <h2 className="text-xl font-bold text-red-900">Unable to Load</h2>
                <p className="text-red-700">{error}</p>
            </Card>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50/50 py-12 px-4 sm:px-6 lg:px-8 flex justify-center">
            <div className="max-w-4xl w-full space-y-8">

                {/* Header Section */}
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold text-slate-900">Reschedule Appointment</h1>
                    {details && (
                        <div className="flex items-center justify-center gap-2 text-slate-600">
                            <span>with Dr. {details.doctorName}</span>
                            <span className="text-slate-300">•</span>
                            <span className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-full border border-slate-200 text-sm font-medium">
                                {details.type === 'online' ? <Video size={14} className="text-blue-500" /> : <MapPin size={14} className="text-purple-500" />}
                                {details.type === 'online' ? 'Online Consultation' : 'In-Person Visit'}
                            </span>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">

                    {/* Left: Calendar */}
                    <Card className="md:col-span-5 p-4 border-0 shadow-lg shadow-slate-200/50">
                        <div className="p-2">
                            <h3 className="font-semibold text-slate-900 mb-4 px-2 flex items-center gap-2">
                                <CalendarIcon className="w-4 h-4 text-primary-500" />
                                Select Date
                            </h3>
                            <Calendar
                                onChange={(value) => {
                                    if (value instanceof Date) {
                                        setSelectedDate(value);
                                    }
                                }}
                                value={selectedDate}
                                tileDisabled={({ date }) => {
                                    const today = new Date();
                                    today.setHours(0, 0, 0, 0);
                                    return date < today || date.getDay() === 0;
                                }}
                                className="w-full border-0 shadow-none rounded-none"
                            />
                        </div>
                    </Card>

                    {/* Right: Slots & Confirmation */}
                    <Card className="md:col-span-7 p-6 border-0 shadow-lg shadow-slate-200/50 min-h-[400px] flex flex-col">
                        <h3 className="font-semibold text-slate-900 mb-6 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-primary-500" />
                            Available Time Slots
                        </h3>

                        {!selectedDate ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 space-y-4">
                                <CalendarIcon className="w-12 h-12 opacity-20" />
                                <p>Select a date to view availability</p>
                            </div>
                        ) : isLoadingSlots ? (
                            <div className="flex-1 flex items-center justify-center py-12">
                                <Loader2 className="animate-spin text-primary-500 w-8 h-8" />
                            </div>
                        ) : availableSlots.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 space-y-2">
                                <p className="font-medium">No slots available</p>
                                <p className="text-sm text-slate-400">Please try another date</p>
                            </div>
                        ) : (
                            <div className="flex-1">
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-8">
                                    {availableSlots.map((time) => (
                                        <button
                                            key={time}
                                            onClick={() => setSelectedTime(time)}
                                            className={cn(
                                                "px-4 py-3 text-sm font-medium rounded-xl border transition-all duration-200 relative overflow-hidden",
                                                selectedTime === time
                                                    ? "border-primary-600 bg-primary-50 text-primary-700 ring-2 ring-primary-500/20"
                                                    : "border-slate-200 hover:border-primary-300 hover:shadow-sm text-slate-600 bg-white"
                                            )}
                                        >
                                            {selectedTime === time && (
                                                <div className="absolute top-0 right-0 p-1">
                                                    <div className="w-2 h-2 rounded-full bg-primary-500" />
                                                </div>
                                            )}
                                            {time}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="pt-6 border-t border-slate-100 mt-auto">
                            <Button
                                className="w-full h-12 text-base shadow-lg shadow-primary-500/20"
                                size="lg"
                                disabled={!selectedDate || !selectedTime || isSubmitting}
                                onClick={handleSubmit}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="animate-spin mr-2" />
                                        Confirming...
                                    </>
                                ) : (
                                    <>
                                        Confirm Reschedule
                                        <Check className="ml-2 w-4 h-4" />
                                    </>
                                )}
                            </Button>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}

export default function ReschedulePage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <RescheduleContent />
        </Suspense>
    );
}
