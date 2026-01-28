import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, XCircle, FileText, CheckCircle, MessageSquare, List, Activity, User, Stethoscope, Mic, Save, FileArchive, Download, ArrowRight, ShieldCheck } from 'lucide-react';
import api from '@/utils/api';
import { toast } from 'sonner';
import VoiceRecorder from './VoiceRecorder';
import clsx from 'clsx';

interface Message {
    speaker: 'doctor' | 'patient';
    text: string;
    timestamp: string;
}

interface SummaryResult {
    patient_summary: string;
    doctor_summary: string;
    key_points: string[];
    action_items: string[];
}

interface ConversationalSummarizerProps {
    onClose: () => void;
    patientId: string;
    patientName?: string;
    onSuccess?: () => void;
}

const ConversationalSummarizer: React.FC<ConversationalSummarizerProps> = ({ onClose, patientId, patientName, onSuccess }) => {
    const [transcript, setTranscript] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSegmenting, setIsSegmenting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isArchiving, setIsArchiving] = useState(false);
    const [result, setResult] = useState<SummaryResult | null>(null);

    // Editable summary states
    const [patientSummary, setPatientSummary] = useState('');
    const [doctorSummary, setDoctorSummary] = useState('');
    const [keyPoints, setKeyPoints] = useState(''); // Joined by newlines
    const [actionItems, setActionItems] = useState(''); // Joined by newlines

    const [activeView, setActiveView] = useState<'dialogue' | 'summary' | 'export'>('dialogue');

    const parseTranscript = (text: string): Message[] => {
        const lines = text.split('\n');
        const messages: Message[] = [];
        let currentSpeaker: 'doctor' | 'patient' = 'patient';

        lines.forEach(line => {
            const trimmed = line.trim();
            if (!trimmed) return;

            if (trimmed.toLowerCase().startsWith('doctor:')) {
                currentSpeaker = 'doctor';
                messages.push({
                    speaker: 'doctor',
                    text: trimmed.replace(/doctor:/i, '').trim(),
                    timestamp: new Date().toISOString()
                });
            } else if (trimmed.toLowerCase().startsWith('patient:')) {
                currentSpeaker = 'patient';
                messages.push({
                    speaker: 'patient',
                    text: trimmed.replace(/patient:/i, '').trim(),
                    timestamp: new Date().toISOString()
                });
            } else {
                messages.push({
                    speaker: currentSpeaker,
                    text: trimmed,
                    timestamp: new Date().toISOString()
                });
            }
        });

        return messages;
    };

    const handleSummarize = async () => {
        if (!transcript.trim()) {
            toast.error('Please provide a transcript or conversation text.');
            return;
        }

        const messages = parseTranscript(transcript);
        if (messages.length === 0) {
            toast.error('Could not parse any messages from the transcript.');
            return;
        }

        setIsProcessing(true);
        try {
            const response = await api.post('/ai/summarize-conversation', {
                conversation: messages
            });
            const summary: SummaryResult = response.data.summary;
            setResult(summary);

            // Initialize editable states
            setPatientSummary(summary.patient_summary);
            setDoctorSummary(summary.doctor_summary);
            setKeyPoints(summary.key_points.join('\n'));
            setActionItems(summary.action_items.join('\n'));

            setActiveView('summary');
            toast.success('Conversation analyzed successfully!');
        } catch (error) {
            console.error('Summarization failed:', error);
            toast.error('Failed to summarize conversation. Please check your API configuration.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleTranscription = async (text: string) => {
        setIsSegmenting(true);
        try {
            const response = await api.post('/ai/segment-conversation', {
                transcript: text
            });
            const segmentedText = response.data.segmented;

            setTranscript(prev => {
                const separator = prev.trim() ? '\n\n' : '';
                return `${prev}${separator}${segmentedText}`;
            });
            toast.success('Live transcription automatically labeled');
        } catch (error) {
            console.error('Segmentation failed:', error);
            setTranscript(prev => {
                const separator = prev.trim() ? '\n\n' : '';
                return `${prev}${separator}[Recorded Session - ${new Date().toLocaleTimeString()}]: ${text}`;
            });
            toast.warning('Transcription added without speaker labels');
        } finally {
            setIsSegmenting(false);
        }
    };

    const handleSaveToNotes = async () => {
        if (!result) return false;
        setIsSaving(true);
        try {
            const formattedNote = `
### CLINICAL_SUMMARY
**Patient Perspective:** ${patientSummary}
**Clinical Assessment:** ${doctorSummary}

**Key Clinical Points:**
${keyPoints.split('\n').filter(p => p.trim()).map(p => `- ${p}`).join('\n')}

**Actionable Instruction Plan:**
${actionItems.split('\n').filter(p => p.trim()).map(p => `- ${p}`).join('\n')}
            `.trim();

            await api.post(`/patients/${patientId}/notes`, { content: formattedNote });
            toast.success('Clinical Summary saved to Patient Notes');
            onSuccess?.();
            setActiveView('export'); // Stay on export view to show success or allow archiving
            return true;
        } catch (error) {
            console.error('Failed to save note:', error);
            toast.error('Failed to save summary to notes.');
            return false;
        } finally {
            setIsSaving(false);
        }
    };

    const handleArchiveTranscript = async (silent = false) => {
        if (!transcript.trim()) return false;
        if (!silent) setIsArchiving(true);
        try {
            const header = `CLINICAL CONSULTATION DIALOGUE\nPatient: ${patientName || 'N/A'}\nDate: ${new Date().toLocaleString()}\n-----------------------------------\n\n`;
            const fullContent = header + transcript;

            const blob = new Blob([fullContent], { type: 'text/plain' });
            const file = new File([blob], `Consultation_${new Date().toISOString().split('T')[0]}.txt`, { type: 'text/plain' });

            const formData = new FormData();
            formData.append('file', file);

            const uploadRes = await api.post('/files/upload/public', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const { url, fileName, size, mimetype } = uploadRes.data;

            await api.post(`/patients/${patientId}/files`, {
                name: fileName,
                url: url,
                type: mimetype,
                size: size
            });

            if (!silent) toast.success('Dialogue archived to Patient Documents');
            onSuccess?.();
            return true;
        } catch (error) {
            console.error('Failed to archive transcript:', error);
            if (!silent) toast.error('Failed to archive dialogue.');
            return false;
        } finally {
            if (!silent) setIsArchiving(false);
        }
    };

    const [isSavingAll, setIsSavingAll] = useState(false);
    const [isSavingSoap, setIsSavingSoap] = useState(false);

    const handleSaveAll = async () => {
        setIsSavingAll(true);
        try {
            const successNote = await handleSaveToNotes();
            const successArchive = await handleArchiveTranscript(true);
            const successSoap = await handleSaveToEhr();

            if (successNote && successArchive && successSoap) {
                toast.success('Complete Consultation (Summary, Dialogue & EHR SOAP) saved successfully!');
            }
        } catch (error) {
            console.error('Failed to save all:', error);
            toast.error('Failed to save complete workspace.');
        } finally {
            setIsSavingAll(false);
        }
    };

    const handleSaveToEhr = async () => {
        setIsSavingSoap(true);
        try {
            const parsedTranscript = parseTranscript(transcript);
            // 1. Generate SOAP with AI
            const aiRes = await api.post('/ai/summarize-soap', { conversation: parsedTranscript });
            const soap = aiRes.data.soap;

            // 2. Save to EHR Encounters
            await api.post(`/ehr/patients/${patientId}/encounters`, {
                subjective: soap.subjective,
                objective: soap.objective,
                assessment: soap.assessment,
                plan: soap.plan,
                type: 'Conversational AI'
            });

            toast.success('Structured SOAP Encounter saved to EHR Chart');
            onSuccess?.();
            return true;
        } catch (error) {
            console.error('Failed to save to EHR:', error);
            toast.error('Failed to generate/save SOAP encounter.');
            return false;
        } finally {
            setIsSavingSoap(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 md:p-8 bg-slate-900/60 backdrop-blur-md">
            <Card className="w-full max-w-6xl h-[85vh] bg-white shadow-2xl relative overflow-hidden rounded-[2.5rem] animate-in zoom-in duration-250 flex flex-col border-none">
                <div className="absolute top-6 right-6 z-10">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                        className="rounded-full w-12 h-12 p-0 hover:bg-slate-100 bg-white/80 backdrop-blur-sm"
                    >
                        <XCircle size={24} className="text-slate-400" />
                    </Button>
                </div>

                <div className="p-8 md:p-12 flex flex-col h-full bg-slate-50/30">
                    <div className="flex items-center gap-5 mb-8 pb-6 border-b border-slate-100">
                        <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-primary-100">
                            <Sparkles size={32} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-900">Clinical Conversation Workspace</h2>
                            <p className="text-sm font-bold text-slate-400 capitalize mt-1">
                                {patientName ? `Dialogue with ${patientName}` : 'Capture and analyze patient interactions'}
                            </p>
                        </div>
                    </div>

                    {result && (
                        <div className="flex gap-2 mb-6 bg-slate-100 p-1.5 rounded-2xl w-fit">
                            <Button
                                variant={activeView === 'dialogue' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setActiveView('dialogue')}
                                className={clsx("rounded-xl font-bold px-6", activeView === 'dialogue' ? "bg-white text-slate-900 shadow-sm hover:bg-white" : "text-slate-500 hover:text-slate-900")}
                            >
                                <MessageSquare size={16} className="mr-2" />
                                Full Dialogue
                            </Button>
                            <Button
                                variant={activeView === 'summary' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setActiveView('summary')}
                                className={clsx("rounded-xl font-bold px-6", activeView === 'summary' ? "bg-white text-slate-900 shadow-sm hover:bg-white" : "text-slate-500 hover:text-slate-900")}
                            >
                                <Sparkles size={16} className="mr-2" />
                                AI Summary
                            </Button>
                            <Button
                                variant={activeView === 'export' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setActiveView('export')}
                                className={clsx("rounded-xl font-bold px-6", activeView === 'export' ? "bg-white text-slate-900 shadow-sm hover:bg-white" : "text-slate-500 hover:text-slate-900")}
                            >
                                <Save size={16} className="mr-2" />
                                Export & Save
                            </Button>
                        </div>
                    )}

                    <div className="flex-1 overflow-hidden">
                        {(!result || activeView === 'dialogue') ? (
                            <div className="h-full flex flex-col gap-6">
                                <div className="flex-1 flex flex-col gap-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <MessageSquare size={16} className="text-primary-500" />
                                            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Dialogue Workspace</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-2 px-4 py-2 bg-primary-50 border border-primary-100 rounded-2xl">
                                                <Mic size={14} className={clsx("text-primary-600", isSegmenting && "animate-spin")} />
                                                <span className="text-[10px] font-black text-primary-700 uppercase tracking-tight">
                                                    {isSegmenting ? 'Reconstructing Speakers...' : 'Live Recording Mode'}
                                                </span>
                                                <VoiceRecorder
                                                    onTranscriptionComplete={handleTranscription}
                                                    className="ml-2"
                                                />
                                            </div>
                                            <span className="text-[10px] text-slate-400 bg-white px-2 py-1 rounded-md border border-slate-100 italic">
                                                Format: "Doctor: ..." or "Patient: ..."
                                            </span>
                                        </div>
                                    </div>
                                    <textarea
                                        value={transcript}
                                        onChange={(e) => setTranscript(e.target.value)}
                                        placeholder={`Doctor: How are you feeling today?\nPatient: I've had a headache for two days.`}
                                        className="flex-1 w-full p-6 text-base text-slate-700 bg-white border border-slate-200 rounded-3xl shadow-inner focus:ring-4 focus:ring-primary-100 focus:border-primary-400 transition-all outline-none resize-none font-medium leading-relaxed"
                                    />
                                </div>
                                <div className="flex justify-center pt-2 pb-6">
                                    <Button
                                        onClick={handleSummarize}
                                        disabled={isProcessing || !transcript.trim()}
                                        className="h-16 px-12 rounded-[1.5rem] font-black text-lg shadow-xl shadow-primary-200 gap-3 group overflow-hidden relative"
                                    >
                                        <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform" />
                                        {isProcessing ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                Analyzing Conversation...
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles size={20} className="animate-pulse" />
                                                {result ? 'Refresh AI Summary' : 'Generate Clinical Summary'}
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        ) : activeView === 'summary' ? (
                            <div className="h-full overflow-y-auto pr-4 custom-scrollbar">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-10">
                                    {/* Patient Side */}
                                    <div className="flex flex-col gap-3">
                                        <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-100 rounded-2xl w-fit">
                                            <User size={14} className="text-blue-600" />
                                            <span className="text-[10px] font-black text-blue-700 uppercase tracking-tight">Patient Perspective</span>
                                        </div>
                                        <textarea
                                            value={patientSummary}
                                            onChange={(e) => setPatientSummary(e.target.value)}
                                            className="w-full h-40 p-6 text-sm text-slate-700 bg-blue-50/30 border border-blue-100 rounded-3xl focus:ring-4 focus:ring-blue-100 focus:border-blue-300 transition-all outline-none resize-none font-medium leading-relaxed shadow-inner"
                                        />
                                    </div>

                                    {/* Doctor Side */}
                                    <div className="flex flex-col gap-3">
                                        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-2xl w-fit">
                                            <Stethoscope size={14} className="text-emerald-600" />
                                            <span className="text-[10px] font-black text-emerald-700 uppercase tracking-tight">Clinical Assessment</span>
                                        </div>
                                        <textarea
                                            value={doctorSummary}
                                            onChange={(e) => setDoctorSummary(e.target.value)}
                                            className="w-full h-40 p-6 text-sm text-slate-700 bg-emerald-50/30 border border-emerald-100 rounded-3xl focus:ring-4 focus:ring-emerald-100 focus:border-emerald-300 transition-all outline-none resize-none font-medium leading-relaxed shadow-inner"
                                        />
                                    </div>

                                    {/* Key Points */}
                                    <div className="flex flex-col gap-3 md:col-span-2">
                                        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-100 rounded-2xl w-fit">
                                            <List size={14} className="text-amber-600" />
                                            <span className="text-[10px] font-black text-amber-700 uppercase tracking-tight">Key Clinical Points (One per line)</span>
                                        </div>
                                        <textarea
                                            value={keyPoints}
                                            onChange={(e) => setKeyPoints(e.target.value)}
                                            className="w-full h-32 p-6 text-sm text-slate-700 bg-amber-50/30 border border-amber-100 rounded-3xl focus:ring-4 focus:ring-amber-100 focus:border-amber-300 transition-all outline-none resize-none font-medium leading-relaxed shadow-inner"
                                            placeholder="Symptoms, vitals, medications..."
                                        />
                                    </div>

                                    {/* Action Items */}
                                    <div className="flex flex-col gap-3 md:col-span-2">
                                        <div className="flex items-center gap-2 px-4 py-2 bg-primary-50 border border-primary-100 rounded-2xl w-fit">
                                            <CheckCircle size={14} className="text-primary-600" />
                                            <span className="text-[10px] font-black text-primary-700 uppercase tracking-tight">Next Steps & Instructions (One per line)</span>
                                        </div>
                                        <textarea
                                            value={actionItems}
                                            onChange={(e) => setActionItems(e.target.value)}
                                            className="w-full h-32 p-6 text-sm text-slate-700 bg-primary-50/30 border border-primary-100 rounded-3xl focus:ring-4 focus:ring-primary-100 focus:border-primary-400 transition-all outline-none resize-none font-medium leading-relaxed shadow-inner"
                                            placeholder="Follow-ups, tests, prescriptions..."
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-center gap-4 pt-10 pb-12 border-t border-slate-100 mt-4">
                                    <Button
                                        variant="outline"
                                        onClick={() => setActiveView('dialogue')}
                                        className="h-14 px-10 rounded-2xl font-bold border-slate-200"
                                    >
                                        Back to Dialogue
                                    </Button>
                                    <Button
                                        onClick={() => setActiveView('export')}
                                        className="h-14 px-12 rounded-2xl font-bold shadow-lg shadow-primary-500 bg-primary-600 text-white"
                                    >
                                        Proceed to Save <ArrowRight size={18} className="ml-2" />
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center p-8 max-w-4xl mx-auto">
                                <div className="text-center mb-12">
                                    <div className="w-20 h-20 bg-primary-100 text-primary-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                                        <ShieldCheck size={40} />
                                    </div>
                                    <h3 className="text-3xl font-black text-slate-900 mb-2">Finalize Documentation</h3>
                                    <p className="text-slate-500 font-medium">Choose how you would like to persist this consultation in the patient record.</p>

                                    <Button
                                        onClick={handleSaveAll}
                                        disabled={isSavingAll}
                                        className="mt-8 h-16 w-full max-w-md rounded-2xl font-black gap-3 shadow-xl shadow-primary-200 text-lg bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800"
                                    >
                                        {isSavingAll ? 'Persisting All Data...' : (
                                            <>
                                                <ShieldCheck size={24} />
                                                Save Complete Workspace (Both)
                                            </>
                                        )}
                                    </Button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                                    <Card className="p-8 border-2 border-indigo-100 hover:border-indigo-200 hover:shadow-xl transition-all group flex flex-col justify-between rounded-[2.5rem]">
                                        <div>
                                            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 transition-colors font-bold">
                                                <Activity size={28} />
                                            </div>
                                            <h4 className="text-xl font-black text-slate-900 mb-3">Save to EHR Chart</h4>
                                            <p className="text-sm text-slate-500 font-medium leading-relaxed mb-8">
                                                Convert this consultation into a structured S.O.A.P. encounter and persist it to the longitudinal clinical chart.
                                            </p>
                                        </div>
                                        <Button
                                            onClick={handleSaveToEhr}
                                            disabled={isSavingSoap}
                                            className="h-14 w-full rounded-2xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-100"
                                        >
                                            {isSavingSoap ? 'Persisting to EHR...' : 'Save SOAP to EHR'}
                                        </Button>
                                    </Card>

                                    <Card className="p-8 border-2 border-slate-100 hover:border-primary-200 hover:shadow-xl transition-all group flex flex-col justify-between rounded-[2.5rem]">
                                        <div>
                                            <div className="w-14 h-14 bg-slate-50 text-slate-400 group-hover:bg-primary-50 group-hover:text-primary-600 rounded-2xl flex items-center justify-center mb-6 transition-colors font-bold">
                                                <Save size={28} />
                                            </div>
                                            <h4 className="text-xl font-black text-slate-900 mb-3">Save to Clinical Notes</h4>
                                            <p className="text-sm text-slate-500 font-medium leading-relaxed mb-8">
                                                Append the AI-generated high-intelligence summary (Perspectives, Points, and Plan) directly to the patient's clinical timeline.
                                            </p>
                                        </div>
                                        <Button
                                            onClick={handleSaveToNotes}
                                            disabled={isSaving}
                                            className="w-full h-14 rounded-2xl font-black gap-2 shadow-lg shadow-primary-100"
                                        >
                                            {isSaving ? 'Saving note...' : (
                                                <>
                                                    <CheckCircle size={18} />
                                                    Sync to Notes
                                                </>
                                            )}
                                        </Button>
                                    </Card>

                                    <Card className="p-8 border-2 border-slate-100 hover:border-emerald-200 hover:shadow-xl transition-all group flex flex-col justify-between rounded-[2.5rem]">
                                        <div>
                                            <div className="w-14 h-14 bg-slate-50 text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 rounded-2xl flex items-center justify-center mb-6 transition-colors font-bold">
                                                <FileArchive size={28} />
                                            </div>
                                            <h4 className="text-xl font-black text-slate-900 mb-3">Archive Full Dialogue</h4>
                                            <p className="text-sm text-slate-500 font-medium leading-relaxed mb-8">
                                                Save the full labeled transcript as a permanent document record for compliance and detailed session tracking.
                                            </p>
                                        </div>
                                        <Button
                                            onClick={() => handleArchiveTranscript(false)}
                                            disabled={isArchiving}
                                            variant="secondary"
                                            className="w-full h-14 rounded-2xl font-black gap-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-none shadow-lg shadow-emerald-50"
                                        >
                                            {isArchiving ? 'Archiving...' : (
                                                <>
                                                    <Download size={18} />
                                                    Archive Transcript
                                                </>
                                            )}
                                        </Button>
                                    </Card>
                                </div>

                                <div className="mt-12">
                                    <Button variant="ghost" onClick={onClose} className="font-bold text-slate-400 hover:text-slate-600">
                                        Exit Workspace Without Saving
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default ConversationalSummarizer;
