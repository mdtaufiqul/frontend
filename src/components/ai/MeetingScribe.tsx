import React, { useState } from 'react';
import { FileText, Mic, Sparkles, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import VoiceRecorder from './VoiceRecorder';
import api from '@/utils/api';
import { toast } from 'sonner';

interface MeetingScribeProps {
    className?: string;
}

const MeetingScribe: React.FC<MeetingScribeProps> = ({ className }) => {
    const [notes, setNotes] = useState('');
    const [summary, setSummary] = useState<string | null>(null);
    const [isSummarizing, setIsSummarizing] = useState(false);
    const [hasCopied, setHasCopied] = useState(false);

    const handleTranscription = (text: string) => {
        setNotes(prev => prev ? `${prev}\n\n[Voice Note]: ${text}` : `[Voice Note]: ${text}`);
    };

    const generateSummary = async () => {
        if (!notes.trim()) {
            toast.error('No notes or transcript content to summarize');
            return;
        }

        setIsSummarizing(true);
        try {
            const response = await api.post('/ai/summarize-meeting', {
                transcript: notes
            });
            setSummary(response.data.summary);
            toast.success('Meeting summary generated');
        } catch (error) {
            console.error('Summary failed:', error);
            toast.error('Failed to generate summary');
        } finally {
            setIsSummarizing(false);
        }
    };

    const copySummary = () => {
        if (summary) {
            navigator.clipboard.writeText(summary);
            setHasCopied(true);
            setTimeout(() => setHasCopied(false), 2000);
            toast.success('Summary copied');
        }
    };

    return (
        <div className={`flex flex-col h-full bg-white border-l border-slate-200 shadow-xl ${className}`}>
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-800">
                    <Sparkles size={18} className="text-primary-500" />
                    <h3 className="font-bold text-sm">AI Scribe & Notes</h3>
                </div>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-4">
                {/* Recording & Input */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-500 uppercase">Session Notes</label>
                        <VoiceRecorder onTranscriptionComplete={handleTranscription} />
                    </div>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Type notes or dictate using the microphone..."
                        className="w-full h-48 p-3 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-100 focus:outline-none resize-none font-sans"
                    />
                </div>

                {/* Summary Action */}
                <Button
                    onClick={generateSummary}
                    disabled={isSummarizing || !notes.trim()}
                    className="w-full gap-2"
                >
                    {isSummarizing ? (
                        'Summarizing...'
                    ) : (
                        <>
                            <Sparkles size={16} />
                            Summarize Session
                        </>
                    )}
                </Button>

                {/* Summary Display */}
                {summary && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-500 uppercase">AI Summary</label>
                            <Button variant="ghost" size="sm" onClick={copySummary} className="h-6 w-6 p-0 text-slate-400 hover:text-green-600">
                                {hasCopied ? <Check size={14} /> : <Copy size={14} />}
                            </Button>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                            {summary}
                        </div>
                    </div>
                )}
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
                <p className="text-[10px] text-slate-400">Audio processing powered by OpenAI Whisper</p>
            </div>
        </div>
    );
};

export default MeetingScribe;
