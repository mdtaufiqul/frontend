"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Shield, Clock, AlertCircle } from 'lucide-react';
import api from '@/utils/api';
import { toast } from 'sonner';
import VideoMeeting from '@/components/meeting/VideoMeeting';
import { Button } from '@/components/ui/button';
import MeetingChat from '@/components/meeting/MeetingChat';

interface Appointment {
    id: string;
    patientId?: string;
    patient?: { name: string };
    guestName?: string;
    date: string;
    service?: { name: string };
    doctor?: { name: string };
}

export default function PatientMeetingPage() {
    const params = useParams();
    const router = useRouter();
    const appointmentId = params.id as string;

    const [appointment, setAppointment] = useState<Appointment | null>(null);
    const [loading, setLoading] = useState(true);
    const [meetingUrl, setMeetingUrl] = useState<string | null>(null);
    const [provider, setProvider] = useState<string>('daily');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchMeetingDetails();
    }, [appointmentId]);

    const fetchMeetingDetails = async () => {
        console.log('=== FETCHING MEETING DETAILS ===');
        console.log('Appointment ID:', appointmentId);

        setLoading(true);
        setError(null);
        try {
            console.log('Fetching appointment and meeting URL...');

            const [apptRes, urlRes] = await Promise.all([
                api.get(`/appointments/${appointmentId}`),
                api.get(`/appointments/${appointmentId}/meeting-url`)
            ]);

            console.log('Appointment response:', apptRes.data);
            console.log('Meeting URL response:', urlRes.data);

            setAppointment(apptRes.data);
            if (urlRes.data && urlRes.data.url) {
                console.log('Setting meeting URL:', urlRes.data.url);
                setMeetingUrl(urlRes.data.url);
                setProvider(urlRes.data.provider || 'daily');
            } else {
                console.error('No URL in response:', urlRes.data);
                setError('Meeting link not available.');
            }
        } catch (error: any) {
            console.error('=== FAILED TO FETCH MEETING DETAILS ===');
            console.error('Error:', error);
            console.error('Error response:', error.response?.data);
            console.error('Error status:', error.response?.status);

            // Fallback for demo if API fails (e.g. auth)
            setError(error.response?.data?.message || 'Unable to join meeting. Please contact support.');
        } finally {
            setLoading(false);
        }
    };

    const handleLeave = () => {
        toast.info('You have left the meeting.');
        // Redirect to a "Thank You" or Home page
        router.push('/');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-50">
                <div className="text-center">
                    <div className="relative w-16 h-16 mx-auto mb-6">
                        <div className="absolute inset-0 border-4 border-primary-200 rounded-full" />
                        <div className="absolute inset-0 border-4 border-primary-600 rounded-full border-t-transparent animate-spin" />
                    </div>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Connecting to Secure Room...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-50 p-6">
                <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200 max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertCircle size={32} />
                    </div>
                    <h1 className="text-xl font-black text-slate-900 mb-2">Unable to Join</h1>
                    <p className="text-slate-500 mb-6 font-medium">{error}</p>
                    <Button onClick={() => router.push('/')} variant="outline" className="w-full">
                        Return Home
                    </Button>
                </div>
            </div>
        );
    }

    const doctorName = appointment?.doctor?.name || 'Dr. Smith';
    const serviceName = appointment?.service?.name || 'Consultation';

    return (
        <div className="h-screen bg-slate-900 flex flex-col overflow-hidden">
            {/* Full-screen video area */}
            <div className="flex-1 flex overflow-hidden relative">
                <div className="flex-1 relative">
                    {meetingUrl ? (
                        <VideoMeeting
                            roomUrl={meetingUrl}
                            provider={provider}
                            onLeave={handleLeave}
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full">
                            <p className="text-white/50">Meeting URL missing.</p>
                        </div>
                    )}
                </div>

                {/* Chat Sidebar (Desktop only) */}
                <div className="w-80 border-l border-slate-800 bg-white hidden md:block">
                    {appointment && (
                        <MeetingChat
                            patientId={appointment.patientId || 'guest'}
                            doctorId={doctorName}
                            isPatientView={true}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
