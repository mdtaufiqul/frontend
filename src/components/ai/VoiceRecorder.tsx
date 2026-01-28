import React, { useState, useRef } from 'react';
import { Mic, Square, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import api from '@/utils/api';

interface VoiceRecorderProps {
    onTranscriptionComplete: (text: string) => void;
    className?: string; // Allow custom styling
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onTranscriptionComplete, className }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' }); // webm is widely supported

            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorderRef.current.onstop = async () => {
                const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
                await transcribeAudio(audioBlob);
                chunksRef.current = []; // Reset chunks
                stream.getTracks().forEach(track => track.stop()); // Stop stream
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (error) {
            console.error('Error accessing microphone:', error);
            toast.error('Could not access microphone');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            setIsProcessing(true);
        }
    };

    const transcribeAudio = async (blob: Blob) => {
        const formData = new FormData();
        // OpenAI Whisper supports webm, mp3, mp4, etc.
        const file = new File([blob], 'recording.webm', { type: 'audio/webm' });
        formData.append('file', file);

        try {
            const response = await api.post('/ai/transcribe', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            if (response.data.text) {
                onTranscriptionComplete(response.data.text);
                toast.success('Transcription complete');
            }
        } catch (error) {
            console.error('Transcription failed:', error);
            toast.error('Failed to transcribe audio');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            {!isRecording ? (
                <Button
                    type="button" // Prevent form submission
                    variant="outline"
                    size="sm"
                    onClick={startRecording}
                    disabled={isProcessing}
                    className="gap-2"
                >
                    {isProcessing ? (
                        <>
                            <Loader2 size={16} className="animate-spin text-primary-500" />
                            Processing...
                        </>
                    ) : (
                        <>
                            <Mic size={16} />
                            Dictate
                        </>
                    )}
                </Button>
            ) : (
                <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={stopRecording}
                    className="gap-2 animate-pulse"
                >
                    <Square size={16} fill="currentColor" />
                    Stop Recording
                </Button>
            )}
        </div>
    );
};

export default VoiceRecorder;
