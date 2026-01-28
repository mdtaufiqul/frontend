import React, { useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Badge from '@/components/ui/badge';
import { Sparkles, Save, RotateCcw, ChevronRight, FileText, Mic, Square, Loader2, MessageSquare, Bot, Zap, CheckCircle2, Lock, Activity, Pill } from 'lucide-react';
import api from '@/utils/api';
import { toast } from 'sonner';

import { AddVitalsModal, AddMedicationModal, AddDiagnosisModal, AddAllergyModal } from './AddRecordModals';

interface SoapNoteEditorProps {
    patientId: string;
    appointmentId?: string;
    onSuccess?: () => void;
    onRecordAdded?: () => void;
    mode?: 'CONVERSATION' | 'DICTATION' | null;
    initialData?: {
        id?: string;
        subjective?: string;
        objective?: string;
        assessment?: string;
        plan?: string;
        transcript?: string;
        status?: string;
        appointmentId?: string;
    };
}

export const SoapNoteEditor: React.FC<SoapNoteEditorProps> = ({
    patientId,
    appointmentId,
    onSuccess,
    onRecordAdded,
    mode = 'DICTATION',
    initialData = {}
}) => {
    const [soap, setSoap] = useState({
        subjective: initialData.subjective || '',
        objective: initialData.objective || '',
        assessment: initialData.assessment || '',
        plan: initialData.plan || ''
    });
    const [transcript, setTranscript] = useState(initialData.transcript || '');
    const [status, setStatus] = useState(initialData.status || 'DRAFT');
    const [selectedAppointmentId, setSelectedAppointmentId] = useState(appointmentId || initialData.appointmentId || '');
    const [appointments, setAppointments] = useState<any[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [encounterVitals, setEncounterVitals] = useState<any[]>([]);

    // Voice/Scribe states
    const [isRecording, setIsRecording] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isVitalsModalOpen, setIsVitalsModalOpen] = useState(false);
    const [isMedicationModalOpen, setIsMedicationModalOpen] = useState(false);
    const [isDiagnosisModalOpen, setIsDiagnosisModalOpen] = useState(false);
    const [isAllergyModalOpen, setIsAllergyModalOpen] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    React.useEffect(() => {
        const fetchAppointments = async () => {
            try {
                const res = await api.get(`/appointments?patientId=${patientId}`);
                const apps = res.data || [];
                setAppointments(apps);
                if (apps.length === 1 && !selectedAppointmentId) {
                    setSelectedAppointmentId(apps[0].id);
                }
            } catch (error) {
                console.warn('Context focus failed');
            }
        };
        fetchAppointments();

        if (initialData.id) {
            fetchEncounterObservations();
        }
    }, [patientId, initialData.id, mode]);

    const fetchEncounterObservations = async () => {
        try {
            const res = await api.get(`/ehr/encounters/${initialData.id}/observations`);
            setEncounterVitals(res.data || []);
        } catch (error) {
            console.warn('Failed to fetch encounter vitals');
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });

            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mediaRecorderRef.current.onstop = async () => {
                const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
                await handleScribeProcess(audioBlob);
                chunksRef.current = [];
                stream.getTracks().forEach(track => track.stop());
                setIsPaused(false);
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
            setIsPaused(false);
            toast.info(mode === 'CONVERSATION' ? 'Listening to conversation...' : 'Listening to dictation...');
        } catch (error) {
            console.error('Mic access error:', error);
            toast.error('Could not access microphone');
        }
    };

    const togglePause = () => {
        if (mediaRecorderRef.current && isRecording) {
            if (isPaused) {
                mediaRecorderRef.current.resume();
                setIsPaused(false);
                toast.info('Recording resumed');
            } else {
                mediaRecorderRef.current.pause();
                setIsPaused(true);
                toast.info('Recording paused');
            }
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            setIsPaused(false);
            setIsProcessing(true);
        }
    };

    const handleScribeProcess = async (blob: Blob) => {
        const formData = new FormData();
        formData.append('file', new File([blob], 'recording.webm', { type: 'audio/webm' }));

        try {
            // 1. Transcribe
            const tRes = await api.post('/ai/transcribe', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            const text = tRes.data.text;
            setTranscript(prev => prev + (prev ? '\n' : '') + text);

            // 2. Structure into EHR
            const scribeEndpoint = mode === 'CONVERSATION' ? '/ai/summarize-soap' : '/ai/structure-dictation';
            const payload = mode === 'CONVERSATION'
                ? { conversation: [{ speaker: 'Auto', text }] } // For now simple wrap
                : { dictation: text };

            const sRes = await api.post(scribeEndpoint, payload);
            const newSoap = sRes.data.soap;

            setSoap((prev: any) => ({
                subjective: prev.subjective + (newSoap.subjective ? (prev.subjective ? '\n' : '') + newSoap.subjective : ''),
                objective: prev.objective + (newSoap.objective ? (prev.objective ? '\n' : '') + newSoap.objective : ''),
                assessment: prev.assessment + (newSoap.assessment ? (prev.assessment ? '\n' : '') + newSoap.assessment : ''),
                plan: prev.plan + (newSoap.plan ? (prev.plan ? '\n' : '') + newSoap.plan : ''),
            }));

            toast.success('Scribe finished processing');
        } catch (error) {
            console.error('Scribe failed:', error);
            toast.error('Scribe failed to process audio');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSave = async (finalize = false) => {
        setIsSaving(true);
        try {
            const data = {
                ...soap,
                transcript,
                appointmentId: selectedAppointmentId,
                status: finalize ? 'FINALIZED' : 'DRAFT'
            };

            if (initialData.id) {
                await api.patch(`/ehr/encounters/${initialData.id}`, data);
                if (finalize) await api.post(`/ehr/encounters/${initialData.id}/finalize`);
            } else {
                const res = await api.post(`/ehr/patients/${patientId}/encounters`, data);
                if (finalize) await api.post(`/ehr/encounters/${res.data.id}/finalize`);
            }

            toast.success(finalize ? 'Encounter Finalized & Locked' : 'Draft saved successfully');
            if (finalize) setStatus('FINALIZED');
            onSuccess?.();
        } catch (error) {
            toast.error('Failed to save encounter');
        } finally {
            setIsSaving(false);
        }
    };

    const sections = [
        { id: 'subjective', label: 'Subjective', placeholder: 'Patient complaints...', bg: 'bg-amber-50/30' },
        { id: 'objective', label: 'Objective', placeholder: 'Findings & observations...', bg: 'bg-blue-50/30' },
        { id: 'assessment', label: 'Assessment', placeholder: 'Clinical reasoning...', bg: 'bg-emerald-50/30' },
        { id: 'plan', label: 'Plan', placeholder: 'Management plan...', bg: 'bg-indigo-50/30' }
    ];

    const isLocked = status === 'FINALIZED';

    return (
        <Card className="p-0 border-none shadow-2xl overflow-hidden rounded-[2.5rem] bg-white">
            <div className="bg-slate-900 px-8 py-6 flex items-center justify-between text-white border-b border-white/5">
                <div className="flex items-center gap-4">
                    <div className="bg-primary-500/20 p-3 rounded-2xl">
                        <FileText className="text-primary-400" size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl font-black flex items-center gap-2">
                            Clinical Encounter Scribe
                            {isLocked && <Lock size={16} className="text-primary-400" />}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                            <Badge className={isLocked ? "bg-primary-500/20 text-primary-400 border-none px-2 text-[9px] font-black uppercase" : "bg-white/10 text-slate-400 border-none px-2 text-[9px] font-black uppercase"}>
                                {status}
                            </Badge>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                {mode ? `${mode} Mode` : 'Manual Entry'}
                            </span>

                            {/* Appointment Selector */}
                            {!isLocked && (
                                <select
                                    value={selectedAppointmentId}
                                    onChange={(e) => setSelectedAppointmentId(e.target.value)}
                                    className="bg-white/5 border-none text-[10px] font-black text-primary-400 uppercase tracking-widest rounded-lg px-2 py-1 outline-none cursor-pointer hover:bg-white/10 transition-colors"
                                >
                                    <option value="" className="bg-slate-900 text-white">Select Appointment Context</option>
                                    {appointments.map((app: any) => (
                                        <option key={app.id} value={app.id} className="bg-slate-900 text-white">
                                            {new Date(app.date).toLocaleDateString()} - {app.type}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {!isLocked && (
                        <>
                            <div className="flex items-center gap-1 mr-4 border-r border-white/10 pr-4">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setIsVitalsModalOpen(true)}
                                    className="text-primary-400 hover:text-white hover:bg-primary-500/20 rounded-xl font-bold h-10 px-3"
                                >
                                    <Activity size={16} className="mr-2" /> Vitals
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setIsMedicationModalOpen(true)}
                                    className="text-emerald-400 hover:text-white hover:bg-emerald-500/20 rounded-xl font-bold h-10 px-3"
                                >
                                    <Pill size={16} className="mr-2" /> Meds
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setIsDiagnosisModalOpen(true)}
                                    className="text-amber-400 hover:text-white hover:bg-amber-500/20 rounded-xl font-bold h-10 px-3"
                                >
                                    <FileText size={16} className="mr-2" /> Dx
                                </Button>
                            </div>

                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSoap({ subjective: '', objective: '', assessment: '', plan: '' })}
                                className="text-slate-400 hover:text-white hover:bg-white/10 rounded-xl font-bold h-10 px-4"
                            >
                                <RotateCcw size={16} className="mr-2" /> Reset
                            </Button>
                            <Button
                                onClick={() => handleSave(false)}
                                disabled={isSaving || isProcessing || isRecording}
                                className="bg-slate-800 text-white hover:bg-slate-700 rounded-xl px-6 font-black h-10 border border-white/5"
                            >
                                <Save size={18} className="mr-2" /> Save Draft
                            </Button>
                            <Button
                                onClick={() => handleSave(true)}
                                disabled={isSaving || isProcessing || isRecording || !soap.subjective}
                                className="bg-primary-600 hover:bg-primary-500 text-white rounded-xl px-6 font-black h-10 shadow-lg shadow-primary-900/40"
                            >
                                <CheckCircle2 size={18} className="mr-2" /> Finalize Note
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Live Scribe Pulse Bar */}
            {!isLocked && mode && (
                <div className={`p-4 transition-all duration-500 flex items-center justify-between px-8 border-b border-slate-100 ${isRecording ? 'bg-red-50/50' : isProcessing ? 'bg-primary-50/50' : 'bg-slate-50'}`}>
                    <div className="flex items-center gap-4">
                        {isRecording ? (
                            <div className="flex items-center gap-3">
                                <span className="relative flex h-3 w-3">
                                    <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${isPaused ? 'bg-amber-400' : 'animate-ping bg-red-400'}`}></span>
                                    <span className={`relative inline-flex rounded-full h-3 w-3 ${isPaused ? 'bg-amber-500' : 'bg-red-500'}`}></span>
                                </span>
                                <span className={`text-sm font-black uppercase tracking-widest ${isPaused ? 'text-amber-600' : 'text-red-600'}`}>
                                    {isPaused ? 'Scribe is Paused' : 'Scribe is Listening...'}
                                </span>
                            </div>
                        ) : isProcessing ? (
                            <div className="flex items-center gap-3">
                                <Loader2 className="animate-spin text-primary-500" size={18} />
                                <span className="text-sm font-black text-primary-600 uppercase tracking-widest">AI is Structuring EHR...</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3">
                                <Bot className="text-slate-400" size={18} />
                                <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Digital Scribe Ready</span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {isRecording && (
                            <Button
                                onClick={togglePause}
                                className={`${isPaused ? 'bg-amber-500 hover:bg-amber-600' : 'bg-slate-700 hover:bg-slate-800'} text-white rounded-full h-10 px-6 font-black text-xs gap-2 transition-all`}
                            >
                                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                                {isPaused ? 'Resume' : 'Pause'}
                            </Button>
                        )}

                        {!isRecording ? (
                            <Button
                                onClick={startRecording}
                                disabled={isProcessing}
                                className="bg-blue-600 text-white hover:bg-blue-700 rounded-full h-10 px-6 font-black text-xs gap-2 shadow-lg shadow-blue-100"
                            >
                                <Mic size={16} />
                                Start Scribe
                            </Button>
                        ) : (
                            <Button
                                onClick={stopRecording}
                                className="bg-red-600 hover:bg-red-700 text-white rounded-full h-10 px-6 font-black text-xs gap-2 transition-all"
                            >
                                <Square size={16} fill="currentColor" />
                                End Segment
                            </Button>
                        )}
                    </div>
                </div>
            )}

            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                {sections.map((section) => (
                    <div key={section.id} className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                            <label className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary-500"></span>
                                {section.label}
                            </label>
                            <Zap size={14} className="text-slate-300" />
                        </div>
                        {section.id === 'objective' && encounterVitals.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-3">
                                {encounterVitals.map((v, i) => (
                                    <Badge key={i} className="bg-blue-50 text-blue-700 border-blue-100 font-bold">
                                        {v.type.replace('_', ' ')}: {v.value}{v.unit}
                                    </Badge>
                                ))}
                            </div>
                        )}
                        <textarea
                            value={(soap as any)[section.id]}
                            onChange={(e) => !isLocked && setSoap({ ...soap, [section.id]: e.target.value })}
                            readOnly={isLocked}
                            placeholder={section.placeholder}
                            className={`w-full min-h-[180px] p-6 rounded-[2rem] border border-slate-100 ${section.bg} focus:ring-4 focus:ring-primary-50 focus:border-primary-400 transition-all outline-none resize-none text-slate-800 font-medium leading-relaxed placeholder:text-slate-300 ${isLocked ? 'cursor-not-allowed opacity-80' : ''}`}
                        />
                    </div>
                ))}
            </div>

            {/* Transcript Overlay (Sticky Bottom) */}
            {mode && (
                <div className="bg-slate-50 border-t border-slate-100 p-6">
                    <div className="max-w-4xl mx-auto">
                        <div className="flex items-center gap-2 mb-3 px-1 text-slate-400">
                            <MessageSquare size={16} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Raw Medical Transcript</span>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-2xl p-4 max-h-32 overflow-y-auto custom-scrollbar italic text-xs text-slate-500 leading-relaxed font-medium">
                            {transcript || "Speak to begin scribing your clinical encounter summaries automatically."}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Integrations */}
            {initialData.id && (
                <>
                    <AddVitalsModal
                        isOpen={isVitalsModalOpen}
                        onClose={() => setIsVitalsModalOpen(false)}
                        onSuccess={() => { fetchEncounterObservations(); onRecordAdded?.(); }}
                        patientId={patientId}
                        encounterId={initialData.id}
                    />
                    <AddMedicationModal
                        isOpen={isMedicationModalOpen}
                        onClose={() => setIsMedicationModalOpen(false)}
                        onSuccess={() => { fetchEncounterObservations(); onRecordAdded?.(); }}
                        patientId={patientId}
                        encounterId={initialData.id}
                    />
                    <AddDiagnosisModal
                        isOpen={isDiagnosisModalOpen}
                        onClose={() => setIsDiagnosisModalOpen(false)}
                        onSuccess={() => { fetchEncounterObservations(); onRecordAdded?.(); }}
                        patientId={patientId}
                        encounterId={initialData.id}
                    />
                    <AddAllergyModal
                        isOpen={isAllergyModalOpen}
                        onClose={() => setIsAllergyModalOpen(false)}
                        onSuccess={() => { fetchEncounterObservations(); onRecordAdded?.(); }}
                        patientId={patientId}
                        encounterId={initialData.id}
                    />
                </>
            )}
        </Card>
    );
};
