import React from 'react';
import DailyMeeting from './DailyMeeting';
import { Video, ExternalLink } from 'lucide-react';

interface VideoMeetingProps {
    roomUrl: string;
    provider: string; // 'daily' | 'zoom' | 'google-meet'
    onLeave?: () => void;
}

const VideoMeeting: React.FC<VideoMeetingProps> = ({ roomUrl, provider, onLeave }) => {

    // For Daily.co, use the embedded experience
    if (provider === 'daily') {
        return <DailyMeeting roomUrl={roomUrl} onLeave={onLeave} />;
    }

    // For other providers (Zoom, Google Meet), show a redirect card for now
    // Implementation of fully embedded Zoom Web SDK is complex and requires specific headers
    // Google Meet does not natively support embedding

    const getProviderInfo = () => {
        if (provider === 'zoom') {
            return {
                name: 'Zoom',
                color: 'bg-blue-600',
                icon: Video,
                instruction: 'Expected to open in the Zoom app or browser.'
            };
        }
        if (provider === 'google-meet') {
            return {
                name: 'Google Meet',
                color: 'bg-emerald-600',
                icon: Video,
                instruction: 'Expected to open in Google Meet.'
            };
        }
        return {
            name: 'Video',
            color: 'bg-slate-600',
            icon: Video,
            instruction: 'Click to join.'
        };
    };

    const info = getProviderInfo();

    return (
        <div className="flex items-center justify-center h-full bg-slate-50">
            <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
                <div className={`w-20 h-20 ${info.color} rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-slate-200`}>
                    <info.icon size={40} className="text-white" />
                </div>

                <h2 className="text-2xl font-bold text-slate-900 mb-2">Join {info.name} Meeting</h2>
                <p className="text-slate-500 mb-8">{info.instruction}</p>

                <a
                    href={roomUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`block w-full py-4 text-white font-semibold rounded-xl transition-all shadow-lg hover:-translate-y-0.5 flex items-center justify-center gap-2 ${info.color} hover:brightness-110`}
                    onClick={() => {
                        // Optional: trigger onLeave or some analytics
                    }}
                >
                    <ExternalLink size={20} />
                    <span>Launch {info.name}</span>
                </a>

                <button
                    onClick={onLeave}
                    className="mt-4 text-slate-400 hover:text-slate-600 text-sm font-medium transition-colors"
                >
                    Return to Dashboard
                </button>
            </div>
        </div>
    );
};

export default VideoMeeting;
