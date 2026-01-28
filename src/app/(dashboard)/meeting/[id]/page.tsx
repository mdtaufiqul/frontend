"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Clock,
    Shield,
    Users as UsersIcon,
    MessageSquare,
    Settings,
    MoreVertical
} from 'lucide-react';
import ChatInterface from '@/components/chat/ChatInterface';
import api from '@/utils/api';
import { toast } from 'sonner';
import DailyMeeting from '@/components/meeting/DailyMeeting';
import MeetingScribe from '@/components/ai/MeetingScribe';
import { PenTool } from 'lucide-react';

interface Appointment {
    id: string;
    patient?: { id: string; name: string; email?: string };
    guestName?: string;
    guestEmail?: string;
    date: string;
    service?: { name: string };
}

export default function MeetingPage() {
    const params = useParams();
    const router = useRouter();
    const appointmentId = params.id as string;

    const [appointment, setAppointment] = useState<Appointment | null>(null);
    const [loading, setLoading] = useState(true);
    const [meetingUrl, setMeetingUrl] = useState<string | null>(null);
    const [activeSidebarTab, setActiveSidebarTab] = useState<'chat' | 'notes'>('notes');

    useEffect(() => {
        fetchAppointment();
    }, [appointmentId]);

    const fetchAppointment = async () => {
        try {
            const [apptRes, urlRes] = await Promise.all([
                api.get(`/appointments/${appointmentId}`),
                api.get(`/appointments/${appointmentId}/meeting-url`)
            ]);
            setAppointment(apptRes.data);
            if (urlRes.data && urlRes.data.url) {
                setMeetingUrl(urlRes.data.url);
            }
        } catch (error) {
            console.error('Failed to fetch appointment or meeting details:', error);
            toast.error('Failed to load meeting details');
        } finally {
            setLoading(false);
        }
    };

    const handleLeave = () => {
        toast.info('Meeting session ended');
        router.push('/schedule');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-50">
                <div className="text-center">
                    <div className="relative w-20 h-20 mx-auto mb-8">
                        <div className="absolute inset-0 border-4 border-primary-500/20 rounded-full" />
                        <div className="absolute inset-0 border-4 border-primary-600 rounded-full border-t-transparent animate-spin" />
                    </div>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Establishing Secure Connection...</p>
                </div>
            </div>
        );
    }

    const patientName = appointment?.patient?.name || appointment?.guestName || 'Patient';

    return (
        <div className="h-screen bg-slate-50 flex flex-col overflow-hidden font-sans">
            {/* Header */}
            <div className="bg-white/80 backdrop-blur-2xl border-b border-slate-200 px-8 h-20 flex items-center shrink-0 z-20">
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-6">
                        <button
                            onClick={() => router.push('/schedule')}
                            className="p-3 bg-white hover:bg-slate-50 rounded-2xl transition-all border border-slate-200 shadow-sm group"
                        >
                            <ArrowLeft size={20} className="text-slate-600 group-hover:-translate-x-1 transition-transform" />
                        </button>
                        <div className="h-10 w-px bg-slate-200" />
                        <div>
                            <div className="flex items-center gap-2 mb-0.5">
                                <Shield size={14} className="text-emerald-600" />
                                <h1 className="text-slate-900 font-black text-sm uppercase tracking-tighter">Secure Consultation</h1>
                            </div>
                            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                {patientName} • {appointment?.service?.name || 'General Checkup'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden lg:flex flex-col items-end mr-4">
                            <p className="text-slate-900 font-mono text-lg font-black tracking-tighter italic">LIVE</p>
                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Session in progress</p>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-slate-200 shadow-sm">
                            <Clock size={16} className="text-primary-600" />
                            <span className="text-slate-700 font-mono text-sm font-bold">00:00:00</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex min-h-0 relative">
                {/* Video Component */}
                <div className="flex-1 p-6 flex flex-col min-h-0 relative">
                    {meetingUrl && (
                        <DailyMeeting
                            roomUrl={meetingUrl}
                            onLeave={handleLeave}
                        />
                    )}
                </div>

                {/* Right Panel / Activity Feed */}
                <div className="w-96 border-l border-slate-200 bg-white hidden xl:flex flex-col z-10 shadow-[-4px_0_24px_-12px_rgba(0,0,0,0.1)]">
                    <div className="flex items-center p-2 bg-slate-100 rounded-lg mx-4 mt-4 mb-2">
                        <button
                            onClick={() => setActiveSidebarTab('notes')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${activeSidebarTab === 'notes' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <PenTool size={14} />
                            AI Scribe
                        </button>
                        <button
                            onClick={() => setActiveSidebarTab('chat')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${activeSidebarTab === 'chat' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <MessageSquare size={14} />
                            Chat
                        </button>
                    </div>

                    {activeSidebarTab === 'notes' ? (
                        <MeetingScribe className="flex-1 border-none shadow-none" />
                    ) : (
                        <div className="flex-1 flex flex-col overflow-hidden bg-white">
                            {appointment?.patient ? (
                                <ChatInterface
                                    patientId={appointment.patient.id}
                                    patientName={appointment.patient.name}
                                    isMeetingView={true}
                                />
                            ) : (
                                <div className="flex-1 flex items-center justify-center p-6 text-center text-slate-400 text-sm">
                                    Initializing Secure Chat...
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
