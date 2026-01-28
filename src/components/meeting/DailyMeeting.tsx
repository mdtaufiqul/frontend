import React, { useEffect, useRef, useState } from 'react';
import DailyIframe from '@daily-co/daily-js';
import { Loader2, Video, Shield, ShieldAlert } from 'lucide-react';

interface DailyMeetingProps {
    roomUrl: string;
    onLeave?: () => void;
}

const DailyMeeting: React.FC<DailyMeetingProps> = ({ roomUrl, onLeave }) => {
    const callWrapperRef = useRef<HTMLDivElement>(null);
    const callInstanceRef = useRef<any>(null);
    const [joinState, setJoinState] = useState<'lobby' | 'joining' | 'joined' | 'error'>('lobby');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const startMeeting = async () => {
        if (!roomUrl || !callWrapperRef.current) {
            console.error('Missing roomUrl or callWrapperRef');
            return;
        }

        setJoinState('joining');
        setErrorMsg(null);

        try {
            // Destroy any existing instance
            const existingCall = DailyIframe.getCallInstance();
            if (existingCall) {
                await existingCall.destroy();
            }

            // Create Daily call with prebuilt UI
            const callFrame = DailyIframe.createFrame(callWrapperRef.current, {
                showLeaveButton: true,
                showFullscreenButton: true,
                iframeStyle: {
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    border: '0',
                },
                theme: {
                    colors: {
                        accent: '#2563eb',
                        accentText: '#ffffff',
                        background: '#ffffff',
                        backgroundAccent: '#f8fafc',
                        baseText: '#0f172a',
                        border: '#e2e8f0',
                        mainAreaBg: '#ffffff',
                        mainAreaBgAccent: '#f8fafc',
                        mainAreaText: '#0f172a',
                        supportiveText: '#64748b',
                    }
                }
            });

            callInstanceRef.current = callFrame;

            // Set to joined immediately so user can see Daily.co lobby
            setJoinState('joined');

            // Handle leave event
            callFrame.on('left-meeting', () => {
                console.log('Left meeting');
                if (onLeave) onLeave();
            });

            // Handle errors
            callFrame.on('error', (e: any) => {
                console.error('Daily error:', e);
                setErrorMsg(e?.errorMsg || 'An error occurred');
                setJoinState('error');
            });

            // Join the meeting (Daily.co will show its own lobby)
            await callFrame.join({ url: roomUrl });
            console.log('Successfully joined meeting');
        } catch (e: any) {
            console.error('Failed to join:', e);
            setErrorMsg(e?.message || 'Failed to join meeting');
            setJoinState('error');
        }
    };

    useEffect(() => {
        return () => {
            if (callInstanceRef.current) {
                callInstanceRef.current.destroy();
                callInstanceRef.current = null;
            }
        };
    }, []);

    return (
        <div className="w-full h-full relative bg-white">
            {/* Daily.co iframe container - ALWAYS RENDERED */}
            <div
                ref={callWrapperRef}
                className="absolute inset-0"
                style={{ visibility: joinState === 'lobby' || joinState === 'error' ? 'hidden' : 'visible' }}
            />

            {/* Lobby overlay */}
            {(joinState === 'lobby' || joinState === 'error') && (
                <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-white flex items-center justify-center z-10">
                    <div className="max-w-md w-full px-6">
                        {/* Icon */}
                        <div className="relative mb-8 flex justify-center">
                            <div className="absolute inset-0 bg-primary-100 rounded-full blur-3xl opacity-50 animate-pulse" />
                            <div className="relative w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl shadow-xl shadow-primary-200 flex items-center justify-center transform hover:scale-105 transition-transform">
                                <Video size={40} className="text-white" />
                            </div>
                        </div>

                        {/* Title */}
                        <h2 className="text-3xl font-bold text-slate-900 mb-3 text-center">Ready to Join?</h2>
                        <p className="text-slate-500 mb-8 text-center leading-relaxed">
                            Join a secure, encrypted video consultation.
                            <br />
                            <span className="text-sm">Ensure your camera and microphone are ready.</span>
                        </p>

                        {/* Error message */}
                        {joinState === 'error' && (
                            <div className="mb-6 bg-red-50 border border-red-100 rounded-xl p-4">
                                <div className="flex items-start gap-3">
                                    <ShieldAlert className="text-red-500 shrink-0 mt-0.5" size={20} />
                                    <div>
                                        <h4 className="text-red-700 font-semibold text-sm mb-1">Connection Failed</h4>
                                        <p className="text-red-600 text-sm">{errorMsg || "Unable to connect. Please try again."}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Join button */}
                        <button
                            onClick={startMeeting}
                            className="w-full py-4 bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white font-semibold rounded-xl transition-all shadow-lg shadow-primary-200 flex items-center justify-center gap-3 transform hover:-translate-y-0.5"
                        >
                            <Video size={20} />
                            <span>Join Meeting Now</span>
                        </button>

                        {/* Security badge */}
                        <div className="mt-8 flex items-center justify-center gap-2 text-slate-400">
                            <Shield size={14} className="text-emerald-500" />
                            <p className="text-xs font-medium">End-to-End Encrypted</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Joining overlay */}
            {joinState === 'joining' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-white/95 backdrop-blur-sm">
                    <div className="relative mb-6">
                        <div className="absolute inset-0 bg-primary-100 rounded-full blur-xl animate-pulse" />
                        <div className="relative bg-white p-5 rounded-full shadow-xl border border-slate-100">
                            <Loader2 className="animate-spin text-primary-600" size={32} />
                        </div>
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">Joining Meeting</h3>
                    <p className="text-slate-500 text-sm">Connecting to secure channel...</p>
                </div>
            )}
        </div>
    );
};

export default DailyMeeting;
