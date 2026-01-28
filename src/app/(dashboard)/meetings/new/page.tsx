"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fromZonedTime } from 'date-fns-tz';
import { Calendar as CalendarIcon, Clock, Video, ArrowLeft, Loader2, Check } from 'lucide-react';
import ParticipantSelector, { Participant } from '@/components/meetings/ParticipantSelector';
import api from '@/utils/api';
import { toast } from 'sonner';
import { normalizeTimezone } from '@/utils/timezones';
import { useAuth } from '@/context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function CreateMeetingPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<'DATE' | 'TIME'>('DATE');

    // Resolve timezone for display using normalized logic
    const userTimezone = useMemo(() => {
        return normalizeTimezone(user?.timezone || user?.clinic?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
    }, [user?.timezone, user?.clinic?.timezone]);

    useEffect(() => {
        console.log('[CreateMeeting] Resolve Timezone:', {
            userTz: user?.timezone,
            clinicTz: user?.clinic?.timezone,
            resolved: userTimezone,
            browserTz: Intl.DateTimeFormat().resolvedOptions().timeZone
        });
    }, [user, userTimezone]);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        provider: 'INTERNAL',
        type: 'SCHEDULED'
    });

    const [date, setDate] = useState<Date | undefined>(new Date());
    const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('09:00');
    // Default duration 1 hour.
    const [durationMinutes, setDurationMinutes] = useState(60);

    const [participants, setParticipants] = useState<Participant[]>([]);

    // Generate time slots (08:00 to 18:00, 30 min intervals)
    const timeSlots = useMemo(() => {
        const slots = [];
        for (let i = 8; i <= 18; i++) {
            slots.push(`${i.toString().padStart(2, '0')}:00`);
            if (i !== 18) slots.push(`${i.toString().padStart(2, '0')}:30`);
        }
        return slots;
    }, []);

    const handleDateSelect = (newDate: Date | null | any) => {
        if (newDate instanceof Date) {
            setDate(newDate);
            setStep('TIME');
        }
    };

    // Auto-add current user as participant (Host)
    useEffect(() => {
        if (user && participants.length === 0) {
            setParticipants([{
                id: user.id,
                name: user.name,
                image: user.image,
                type: 'USER',
                role: 'HOST',
                email: user.email
            }]);
        }
    }, [user]); // Only run when user loads

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.title.trim()) {
            toast.error("Please enter a meeting title");
            return;
        }

        if (participants.length === 0) {
            toast.error("Please select at least one participant");
            return;
        }

        if (!date) {
            toast.error("Please select a date first");
            return;
        }
        setLoading(true);


        try {
            // Construct the date string in the target timezone: YYYY-MM-DD HH:mm:ss
            const dateStr = format(date, 'yyyy-MM-dd');
            const dateTimeStr = `${dateStr} ${selectedTimeSlot}:00`;

            // Convert this "Timezone-local" string to a true UTC Date object
            const startDateTime = fromZonedTime(dateTimeStr, userTimezone);

            // Calculate end time by adding duration (in minutes) to the UTC start time
            const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60000);

            // Validation: Cannot set time in past date
            if (startDateTime < new Date()) {
                toast.error("Cannot schedule a meeting in the past");
                setLoading(false);
                return;
            }

            console.log('Scheduling Meeting Debug:', {
                selectedDate: date,
                formattedDateStr: dateStr,
                timeSlot: selectedTimeSlot,
                dateTimeStr: dateTimeStr,
                resolvedTimezone: userTimezone,
                utcStart: startDateTime.toISOString(),
                utcEnd: endDateTime.toISOString(),
                browserOffset: new Date().getTimezoneOffset(),
                browserTz: Intl.DateTimeFormat().resolvedOptions().timeZone
            });

            toast.info(`Scheduling ${selectedTimeSlot} in ${userTimezone}. This will be stored as ${startDateTime.toISOString()}`);

            await api.post('/meetings', {
                title: formData.title,
                description: formData.description,
                startTime: startDateTime.toISOString(),
                endTime: endDateTime.toISOString(),
                timezone: userTimezone, // Pass the timezone explicitly
                provider: formData.provider,
                meetingType: formData.type,
                participantIds: participants.filter(p => p.type === 'USER').map(p => p.id),
                patientIds: participants.filter(p => p.type === 'PATIENT').map(p => p.id),
                clinicId: user?.clinicId
            });

            toast.success("Meeting scheduled successfully");
            router.push('/meetings');
        } catch (error) {
            console.error(error);
            toast.error("Failed to schedule meeting");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto p-6 space-y-8">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft size={18} />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Schedule Meeting</h1>
                    <p className="text-slate-500">Create a new virtual consultation or team meeting</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* Left Column: Details & Participants */}
                <div className="lg:col-span-7 space-y-6">
                    <Card className="p-6 border-slate-200 shadow-sm space-y-6">
                        <div className="grid gap-2">
                            <Label htmlFor="title">Meeting Title</Label>
                            <Input
                                id="title"
                                placeholder="e.g. Weekly Team Sync or Patient Follow-up"
                                required
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="text-lg font-medium"
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="description">Description (Optional)</Label>
                            <Textarea
                                id="description"
                                placeholder="Agenda points or notes..."
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="min-h-[100px]"
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label>Meeting Provider</Label>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {[
                                    { id: 'INTERNAL', name: 'Internal', icon: Video },
                                    { id: 'GOOGLE_MEET', name: 'Google', icon: Video },
                                    { id: 'ZOOM', name: 'Zoom', icon: Video }
                                ].map((p) => (
                                    <div
                                        key={p.id}
                                        className={cn(
                                            "border rounded-xl p-3 cursor-pointer transition-all flex flex-col items-center justify-center gap-2 text-center hover:bg-slate-50",
                                            formData.provider === p.id
                                                ? "border-primary-600 bg-primary-50 text-primary-700 ring-1 ring-primary-600"
                                                : "border-slate-200 text-slate-600"
                                        )}
                                        onClick={() => setFormData({ ...formData, provider: p.id })}
                                    >
                                        <p.icon size={20} className={formData.provider === p.id ? "text-primary-600" : "text-slate-400"} />
                                        <span className="text-sm font-medium">{p.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6 border-slate-200 shadow-sm">
                        <div className="grid gap-2">
                            <Label>Participants</Label>
                            <ParticipantSelector
                                selected={participants}
                                onChange={setParticipants}
                                clinicId={user?.clinicId}
                            />
                        </div>
                    </Card>
                </div>

                {/* Right Column: Date & Time (Smart UX) */}
                <div className="lg:col-span-5 space-y-4">

                    {/* Step 1: Calendar */}
                    <Card
                        className={cn(
                            "border-slate-200 shadow-sm transition-all duration-300 overflow-hidden",
                            step === 'DATE' ? "p-4" : "p-3 bg-slate-50 cursor-pointer hover:bg-slate-100"
                        )}
                        onClick={() => step === 'TIME' && setStep('DATE')}
                    >
                        {step === 'DATE' ? (
                            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                <h3 className="font-semibold text-slate-900 mb-4 px-2 flex items-center gap-2">
                                    <CalendarIcon className="w-4 h-4 text-primary-500" />
                                    Select Date
                                </h3>
                                <div className="flex justify-center">
                                    <Calendar
                                        onChange={(value) => handleDateSelect(value as Date)}
                                        value={date}
                                        tileDisabled={({ date }) => {
                                            const today = new Date();
                                            today.setHours(0, 0, 0, 0);
                                            return date < today;
                                        }}
                                        className="rounded-md border-0 w-full"
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-slate-700">
                                    <CalendarIcon className="w-4 h-4 text-primary-600" />
                                    <span className="font-medium text-sm">
                                        {date ? format(date, "EEEE, MMMM do, yyyy") : "Select Date"}
                                    </span>
                                </div>
                                <Button variant="ghost" size="sm" className="h-8 text-xs text-primary-600 hover:text-primary-700">
                                    Change
                                </Button>
                            </div>
                        )}
                    </Card>

                    {/* Step 2: Time Selection */}
                    <AnimatePresence mode="wait">
                        {step === 'TIME' && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                <Card className="p-6 border-slate-200 shadow-sm h-full">
                                    <h3 className="font-semibold text-slate-900 mb-4 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-primary-500" />
                                            Select Time
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-slate-500 font-medium">Duration:</span>
                                            <select
                                                className="text-xs border-none bg-slate-100 rounded px-2 py-1 focus:ring-0 cursor-pointer text-slate-900"
                                                value={durationMinutes}
                                                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                                            >
                                                <option value={15}>15m</option>
                                                <option value={30}>30m</option>
                                                <option value={45}>45m</option>
                                                <option value={60}>1h</option>
                                                <option value={90}>1.5h</option>
                                            </select>
                                        </div>
                                    </h3>

                                    <div className="grid grid-cols-4 sm:grid-cols-4 gap-2 max-h-[400px] overflow-y-auto pr-1">
                                        {timeSlots.map((time) => (
                                            <button
                                                key={time}
                                                type="button"
                                                onClick={() => setSelectedTimeSlot(time)}
                                                className={cn(
                                                    "px-1 py-2 text-sm font-medium rounded-lg border transition-all duration-200",
                                                    selectedTimeSlot === time
                                                        ? "border-primary-600 bg-primary-600 text-white shadow-md shadow-primary-500/20"
                                                        : "border-slate-200 hover:border-primary-300 hover:text-primary-600 text-slate-600 bg-white"
                                                )}
                                            >
                                                {time}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="pt-6">
                                        <Button
                                            type="submit"
                                            disabled={loading || !date}
                                            className="w-full h-11 text-sm shadow-lg shadow-primary-500/20"
                                        >
                                            {loading ? <Loader2 size={16} className="animate-spin mr-2" /> : <Check size={16} className="mr-2" />}
                                            Confirm Meeting
                                        </Button>
                                        <p className="text-center text-xs text-slate-400 mt-3">
                                            Timezone: {userTimezone} ({new Date().toLocaleTimeString('en-US', { timeZone: userTimezone, timeZoneName: 'short' })})
                                        </p>
                                        {userTimezone !== Intl.DateTimeFormat().resolvedOptions().timeZone && (
                                            <div className="mt-2 text-[10px] text-amber-600 font-medium text-center bg-amber-50 rounded-lg p-2 border border-amber-200">
                                                Note: This is different from your current device time ({Intl.DateTimeFormat().resolvedOptions().timeZone}).
                                            </div>
                                        )}
                                    </div>
                                </Card>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </form>
        </div>
    );
}
