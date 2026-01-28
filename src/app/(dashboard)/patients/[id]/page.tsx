"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Mail, Phone, MapPin, Calendar, Clock, FileText, MessageSquare, Paperclip, Sparkles, User, XCircle, Activity, Mic } from 'lucide-react';
import clsx from 'clsx';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Badge from '@/components/ui/badge';
import api from '@/utils/api';
import { useSocket } from '@/hooks/useSocket';
import AppointmentDetailsModal from '@/components/ui/AppointmentDetailsModal';
import Modal from '@/components/ui/Modal';
import AIPatientSummary from '@/components/ai/AIPatientSummary';
import AINotesAssistant from '@/components/ai/AINotesAssistant';
import PatientFormData from '@/components/patient/PatientFormData';
import ConversationalSummarizer from '@/components/ai/ConversationalSummarizer';
import { EhrChart } from '@/components/ehr/EhrChart';
import { SoapNoteEditor } from '@/components/ehr/SoapNoteEditor';
import AppointmentBookingModal from '@/components/appointments/AppointmentBookingModal';

interface Patient {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    dob?: string;
    gender?: string;
    address?: string;
    age?: number;
    createdAt: string;
    notes?: {
        id: string;
        content: string;
        createdAt: string;
        doctor: { name: string };
    }[];
    files?: PatientFile[];
    formSubmissions?: FormSubmission[];
}

interface Appointment {
    id: string;
    date: string;
    status: string;
    notes?: string;
    service?: {
        name: string;
    };
    doctor?: {
        name: string;
        timezone?: string;
    };
    intakeSession?: {
        id: string;
        status: string;
        summary?: string;
    };
}

interface FormSubmission {
    id: string;
    data: any;
    createdAt: string;
    form: {
        title: string;
        config: any;
    };
}

interface PatientFile {
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
    createdAt: string;
}

const PatientDetails: React.FC = () => {
    const params = useParams();
    const router = useRouter();
    const patientId = params.id as string;

    const [patient, setPatient] = useState<Patient | null>(null);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [logs, setLogs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedAppointment, setSelectedAppointment] = useState<any>(null);

    const [selectedNote, setSelectedNote] = useState<any>(null);
    const [isEditorMaximized, setIsEditorMaximized] = useState(false);
    const [activeTab, setActiveTab] = useState<'ehr' | 'notes' | 'intake' | 'history' | 'files'>('ehr');
    const [isAIModalOpen, setIsAIModalOpen] = useState(false);
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
    const [isViewAppointmentsModalOpen, setIsViewAppointmentsModalOpen] = useState(false);
    const [patientAppointments, setPatientAppointments] = useState<Appointment[]>([]);
    const [selectedSubmission, setSelectedSubmission] = useState<FormSubmission | null>(null);
    const [newNote, setNewNote] = useState('');
    const [isSavingNote, setIsSavingNote] = useState(false);
    const [isUploadingFile, setIsUploadingFile] = useState(false);
    const [isContactModalOpen, setIsContactModalOpen] = useState(false);
    const [isSummarizerOpen, setIsSummarizerOpen] = useState(false);
    const [isIntakeLinkModalOpen, setIsIntakeLinkModalOpen] = useState(false);
    const [intakeLink, setIntakeLink] = useState('');
    const [isGeneratingIntakeLink, setIsGeneratingIntakeLink] = useState(false);
    const [ehrRefreshKey, setEhrRefreshKey] = useState(0);

    // Note editing states
    const [isEditingNote, setIsEditingNote] = useState(false);
    const [editedNoteContent, setEditedNoteContent] = useState('');
    const [isUpdatingNote, setIsUpdatingNote] = useState(false);

    // Voice/Encounter states
    const [isEncounterModalOpen, setIsEncounterModalOpen] = useState(false);
    const [selectedEncounter, setSelectedEncounter] = useState<any>(null);
    const [recordingMode, setRecordingMode] = useState<'CONVERSATION' | 'DICTATION' | null>(null);

    const fetchPatientData = async () => {
        setIsLoading(true);
        try {
            const [patientRes, logsRes, apptsRes] = await Promise.all([
                api.get(`/patients/${patientId}`),
                api.get(`/patients/${patientId}/logs`),
                api.get(`/appointments?patientId=${patientId}`)
            ]);

            const patientData = patientRes.data;
            setPatient(patientData);
            setAppointments(patientData.appointments || []);
            setLogs(logsRes.data || []);

            // Filter for active appointments (not cancelled or completed)
            const active = (apptsRes.data || []).filter((a: any) =>
                !['cancelled', 'completed'].includes(a.status.toLowerCase()) &&
                new Date(a.date) > new Date()
            );
            setPatientAppointments(active);

            // Trigger EHR refresh
            setEhrRefreshKey(prev => prev + 1);
        } catch (error) {
            console.error('Failed to fetch patient data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (patientId) {
            fetchPatientData();
        }
    }, [patientId]);

    // Real-time updates
    const socket = useSocket();
    useEffect(() => {
        const handleUpdate = () => {
            if (patientId) fetchPatientData();
        };
        socket.on('appointmentUpdated', handleUpdate);
        return () => {
            socket.off('appointmentUpdated', handleUpdate);
        };
    }, [socket, patientId]);

    const handleAddNote = async () => {
        if (!newNote.trim()) return;
        setIsSavingNote(true);
        try {
            await api.post(`/patients/${patientId}/notes`, { content: newNote });
            setNewNote('');
            fetchPatientData();
        } catch (error) {
            console.error('Failed to add note:', error);
        } finally {
            setIsSavingNote(false);
        }
    };

    const handleUpdateNote = async () => {
        if (!selectedNote || !editedNoteContent.trim()) return;
        setIsUpdatingNote(true);
        try {
            await api.patch(`/patients/${patientId}/notes/${selectedNote.id}`, { content: editedNoteContent });
            await fetchPatientData();
            setSelectedNote(null);
            setIsEditingNote(false);
            setEditedNoteContent('');
        } catch (error) {
            console.error('Failed to update note:', error);
        } finally {
            setIsUpdatingNote(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploadingFile(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            // Use the public upload endpoint we created earlier
            const uploadRes = await api.post('/files/upload/public', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const { url, fileName, size, mimetype } = uploadRes.data;

            // Save file reference to patient
            await api.post(`/patients/${patientId}/files`, {
                name: fileName,
                url: url,
                type: mimetype,
                size: size
            });

            fetchPatientData();
        } catch (error) {
            console.error('Failed to upload file:', error);
        } finally {
            setIsUploadingFile(false);
        }
    };

    const handleRequestIntake = async () => {
        setIsGeneratingIntakeLink(true);
        try {
            const res = await api.post('/forms/intake-session', { patientId });
            const token = res.data.token;
            const baseUrl = window.location.origin;
            const link = `${baseUrl}/public/intake/${token}`;
            setIntakeLink(link);
            setIsIntakeLinkModalOpen(true);
        } catch (error) {
            console.error('Failed to generate intake link:', error);
            alert('Failed to generate intake link');
        } finally {
            setIsGeneratingIntakeLink(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert('Link copied to clipboard');
    };

    // Get files separated by source
    const { doctorFiles, patientFiles, allFiles } = React.useMemo(() => {
        const directFiles = patient?.files || [];
        const formFiles: any[] = [];

        patient?.formSubmissions?.forEach(sub => {
            Object.entries(sub.data).forEach(([key, value]: [string, any]) => {
                // Case A: Structured File Object
                if (value && typeof value === 'object' && value.url && value.fileName) {
                    formFiles.push({
                        id: `${sub.id}-${key}`,
                        name: value.fileName,
                        url: value.url,
                        type: value.mimetype || 'application/octet-stream',
                        size: value.size || 0,
                        createdAt: sub.createdAt,
                        isFromForm: true,
                        formTitle: sub.form.title
                    });
                }
                // Case B: String URL
                else if (typeof value === 'string' && (value.startsWith('/uploads/') || value.match(/\.(jpg|jpeg|png|gif|pdf|docx?)$/i))) {
                    const fileName = value.split('/').pop() || 'Attached File';
                    const fileType = fileName.split('.').pop() || 'file';

                    formFiles.push({
                        id: `${sub.id}-${key}`,
                        name: fileName,
                        url: value,
                        type: `application/${fileType}`,
                        size: 0,
                        createdAt: sub.createdAt,
                        isFromForm: true,
                        formTitle: sub.form.title
                    });
                }
            });
        });

        const sortedDirect = directFiles.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        const sortedForm = formFiles.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return {
            doctorFiles: sortedDirect,
            patientFiles: sortedForm,
            allFiles: [...sortedDirect, ...sortedForm]
        };
    }, [patient]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-slate-500">Loading patient details...</div>
            </div>
        );
    }

    if (!patient) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <div className="text-slate-500">Patient not found</div>
                <Button onClick={() => router.push('/patients')}>
                    <ArrowLeft size={16} className="mr-2" />
                    Back to Patients
                </Button>
            </div>
        );
    }

    const age = patient.age || (patient.dob ? new Date().getFullYear() - new Date(patient.dob).getFullYear() : null);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push('/patients')}
                        className="text-slate-400 hover:text-slate-700"
                    >
                        <ArrowLeft size={20} />
                    </Button>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold text-lg shadow-sm">
                            {patient.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900 leading-tight">{patient.name}</h1>
                            <p className="text-sm text-slate-500 font-medium">
                                {age ? `${age} years old` : 'Age N/A'} • Patient
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        onClick={() => setIsAIModalOpen(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-sm shadow-blue-200"
                    >
                        <Sparkles size={16} />
                        AI Insights
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleRequestIntake}
                        disabled={isGeneratingIntakeLink}
                        className="border-primary-200 text-primary-700 hover:bg-primary-50"
                    >
                        {isGeneratingIntakeLink ? 'Generating...' : 'Request Intake'}
                    </Button>
                    <Button
                        onClick={() => {
                            if (patientAppointments.length > 0) {
                                setIsViewAppointmentsModalOpen(true);
                            } else {
                                setIsBookingModalOpen(true);
                            }
                        }}
                    >
                        Schedule Appointment
                    </Button>
                </div>
            </div >

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Patient Details */}
                <div className="lg:col-span-1 space-y-6">
                    <Card className="p-6 border-primary-100 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="bg-primary-100 p-2 rounded-xl text-primary-600">
                                <User size={20} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900">Patient Details</h3>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Full Name</p>
                                <p className="text-sm text-slate-900 font-semibold">{patient.name}</p>
                            </div>

                            {patient.email && (
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Email Address</p>
                                    <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                                        <Mail size={14} className="text-slate-400" />
                                        {patient.email}
                                    </div>
                                </div>
                            )}

                            {patient.phone && (
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Phone Number</p>
                                    <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                                        <Phone size={14} className="text-slate-400" />
                                        {patient.phone}
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-50">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Age</p>
                                    <p className="text-sm text-slate-900 font-semibold">{age ? `${age} years` : 'N/A'}</p>
                                </div>
                                {patient.dob && (
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Date of Birth</p>
                                        <div className="flex items-center gap-2 text-sm text-slate-900 font-semibold">
                                            <Calendar size={14} className="text-slate-400" />
                                            {new Date(patient.dob).toLocaleDateString()}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>

                    {/* Clinical Scribe (White Card) */}
                    <Card className="bg-white rounded-[2rem] p-6 text-slate-900 relative overflow-hidden shadow-xl border border-slate-100">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-[50px] rounded-full -translate-y-1/2 translate-x-1/2" />

                        <div className="relative z-10 space-y-4">
                            <div>
                                <h3 className="text-lg font-black tracking-tight text-slate-900">Clinical Scribe</h3>
                            </div>

                            <div className="flex flex-col gap-3">
                                <Button
                                    onClick={() => {
                                        setRecordingMode('DICTATION');
                                        setSelectedEncounter(null);
                                        setIsEncounterModalOpen(true);
                                    }}
                                    className="bg-blue-600 text-white hover:bg-blue-700 h-14 rounded-xl font-black text-xs flex items-center justify-start gap-3 w-full shadow-lg shadow-blue-100 transition-all border-none"
                                >
                                    <div className="bg-white/20 p-1.5 rounded-lg text-white">
                                        <Mic size={18} />
                                    </div>
                                    <span className="text-sm">Voice Scribe</span>
                                </Button>

                                <Button
                                    onClick={() => {
                                        setRecordingMode('CONVERSATION');
                                        setSelectedEncounter(null);
                                        setIsEncounterModalOpen(true);
                                    }}
                                    className="bg-blue-600 text-white hover:bg-blue-700 h-14 rounded-xl font-black text-xs flex items-center justify-start gap-3 w-full shadow-lg shadow-blue-100 transition-all border-none"
                                >
                                    <div className="bg-white/20 p-1.5 rounded-lg text-white">
                                        <MessageSquare size={18} />
                                    </div>
                                    <span className="text-sm">Conversational scribe</span>
                                </Button>

                                <Button
                                    onClick={() => {
                                        setRecordingMode(null);
                                        setSelectedEncounter(null);
                                        setIsEncounterModalOpen(true);
                                    }}
                                    className="bg-blue-50 text-blue-700 hover:bg-blue-100 h-14 rounded-xl font-black text-xs flex items-center justify-start gap-3 w-full transition-all border-none"
                                >
                                    <div className="bg-blue-100 p-1.5 rounded-lg text-blue-600">
                                        <FileText size={18} />
                                    </div>
                                    <span className="text-sm">Write a Scribe</span>
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Right Col: Tabs and Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Tabs Header */}
                    <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
                        {[
                            { id: 'ehr', label: 'EHR Chart', icon: Activity },
                            { id: 'notes', label: 'Doctor Notes', icon: MessageSquare },
                            { id: 'intake', label: 'Intake Forms', icon: FileText },
                            { id: 'history', label: 'Patient History', icon: Calendar },
                            { id: 'files', label: 'Files', icon: Paperclip }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={clsx(
                                    "flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-all",
                                    activeTab === tab.id
                                        ? "bg-white text-primary-600 shadow-sm"
                                        : "text-slate-500 hover:text-slate-700"
                                )}
                            >
                                <tab.icon size={16} />
                                {tab.label}
                            </button>
                        ))}
                    </div>



                    {/* Tab Content */}
                    {activeTab === 'ehr' && (
                        <EhrChart
                            patientId={patientId}
                            refreshKey={ehrRefreshKey}
                            onNewEncounter={() => {
                                setRecordingMode(null);
                                setSelectedEncounter(null);
                                setIsEncounterModalOpen(true);
                            }}
                            onEditEncounter={(enc) => {
                                setSelectedEncounter(enc);
                                setRecordingMode(null); // Or preserve original? Usually manual entry if editing
                                setIsEncounterModalOpen(true);
                            }}
                        />
                    )}

                    {activeTab === 'history' && (
                        <Card className="p-6 space-y-8">
                            {/* Appointments List */}
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 mb-4">Appointment History</h3>
                                {appointments.length > 0 ? (
                                    <div className="space-y-3">
                                        {appointments.map((apt) => (
                                            <div
                                                key={apt.id}
                                                onClick={() => {
                                                    // Find relevant form submission for this appointment session
                                                    const submission = (patient as any).formSubmissions?.find((s: any) =>
                                                        s.intakeSessionId === apt.intakeSession?.id ||
                                                        // Fallback to latest if no direct link (often the case for new patients)
                                                        (apt === appointments[0] && s === (patient as any).formSubmissions[0])
                                                    );
                                                    setSelectedAppointment({ ...apt, formSubmission: submission });
                                                }}
                                                className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer group"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-lg bg-primary-50 text-primary-600 flex flex-col items-center justify-center group-hover:bg-white group-hover:shadow-sm transition-all">
                                                        <span className="text-xs font-medium">
                                                            {new Date(apt.date).toLocaleDateString('en-US', { month: 'short', timeZone: apt.doctor?.timezone || undefined })}
                                                        </span>
                                                        <span className="text-lg font-bold">
                                                            {new Date(apt.date).toLocaleString('en-US', { day: 'numeric', timeZone: apt.doctor?.timezone || undefined })}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-slate-900 group-hover:text-primary-600 transition-colors">
                                                            {apt.service?.name || 'General Consultation'}
                                                        </p>
                                                        <div className="flex items-center gap-2 text-sm text-slate-500">
                                                            <Clock size={14} />
                                                            {new Date(apt.date).toLocaleTimeString('en-US', {
                                                                hour: '2-digit',
                                                                minute: '2-digit',
                                                                timeZone: apt.doctor?.timezone || undefined
                                                            })}
                                                            {apt.doctor && ` • Dr. ${apt.doctor.name}`}
                                                        </div>
                                                    </div>
                                                </div>
                                                <Badge
                                                    variant={
                                                        apt.status === 'completed' ? 'success' :
                                                            apt.status === 'cancelled' ? 'danger' :
                                                                'warning'
                                                    }
                                                >
                                                    {apt.status}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12 text-slate-500">
                                        <Calendar size={48} className="mx-auto mb-3 text-slate-300" />
                                        <p>No appointments found</p>
                                    </div>
                                )}
                            </div>

                            {/* Communication History */}
                            <div className="pt-6 border-t border-slate-100">
                                <h3 className="text-lg font-bold text-slate-900 mb-4">Communication History</h3>
                                {logs.length > 0 ? (
                                    <div className="space-y-4">
                                        {logs.map((log: any) => (
                                            <div key={log.id} className="flex gap-4 p-4 border border-slate-100 rounded-xl bg-slate-50/50">
                                                <div className={clsx(
                                                    "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                                                    log.type === 'EMAIL' ? "bg-blue-100 text-blue-600" :
                                                        log.type === 'WHATSAPP' ? "bg-green-100 text-green-600" :
                                                            "bg-purple-100 text-purple-600"
                                                )}>
                                                    {log.type === 'EMAIL' && <Mail size={18} />}
                                                    {log.type === 'WHATSAPP' && <MessageSquare size={18} />}
                                                    {log.type === 'SMS' && <MessageSquare size={18} />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <h4 className="font-bold text-slate-800 text-sm">
                                                            {log.type === 'EMAIL' ? 'Email Sent' :
                                                                log.type === 'WHATSAPP' ? 'WhatsApp Message' : 'SMS Sent'}
                                                        </h4>
                                                        <span className="text-[10px] text-slate-400 font-medium">
                                                            {new Date(log.sentAt).toLocaleString()}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-slate-600 line-clamp-2 mb-2">{log.content}</p>

                                                    {log.appointment && (
                                                        <div className="flex items-center gap-2 mb-2 bg-slate-100 p-1.5 rounded-lg border border-slate-200 w-fit">
                                                            <Calendar size={12} className="text-slate-500" />
                                                            <span className="text-[10px] font-medium text-slate-600">
                                                                Linked to Appointment: {new Date(log.appointment.date).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                    )}

                                                    <div className="flex items-center gap-2">
                                                        <span className={clsx(
                                                            "text-[10px] font-bold px-1.5 py-0.5 rounded",
                                                            log.status === 'SENT' ? "bg-green-100 text-green-700" :
                                                                log.status === 'FAILED' ? "bg-red-100 text-red-700" :
                                                                    "bg-slate-200 text-slate-700"
                                                        )}>
                                                            {log.status}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-slate-400 border border-dashed border-slate-200 rounded-xl">
                                        <p className="text-sm">No communication logs recorded.</p>
                                    </div>
                                )}
                            </div>
                        </Card>
                    )}

                    {activeTab === 'intake' && (
                        <div className="space-y-6">
                            {/* Intake Summaries */}
                            <Card className="p-6">
                                <h3 className="text-lg font-bold text-slate-900 mb-4">Clinical Intake Summaries</h3>
                                <div className="space-y-4">
                                    {appointments.filter(a => a.intakeSession?.status === 'COMPLETED').length > 0 ? (
                                        appointments.filter(a => a.intakeSession?.status === 'COMPLETED').map(apt => (
                                            <div key={apt.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="bg-primary-100 text-primary-700 p-1.5 rounded-lg">
                                                            <MessageSquare size={16} />
                                                        </div>
                                                        <span className="font-bold text-sm">AI Intake Summary - {new Date(apt.date).toLocaleDateString()}</span>
                                                    </div>
                                                    <Badge variant="success">Completed</Badge>
                                                </div>
                                                <p className="text-sm text-slate-700 leading-relaxed italic border-l-4 border-primary-200 pl-4 py-1">
                                                    {apt.intakeSession?.summary}
                                                </p>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-10 text-slate-400">
                                            <MessageSquare size={32} className="mx-auto mb-2 opacity-20" />
                                            <p className="text-sm font-medium">No intake summaries available.</p>
                                        </div>
                                    )}
                                </div>
                            </Card>

                            {/* Form Submissions */}
                            <Card className="p-6">
                                <h3 className="text-lg font-bold text-slate-900 mb-4">Submitted Forms</h3>
                                <div className="space-y-3">
                                    {(patient as any).formSubmissions?.length > 0 ? (
                                        (patient as any).formSubmissions.map((sub: FormSubmission) => (
                                            <div
                                                key={sub.id}
                                                onClick={() => setSelectedSubmission(sub)}
                                                className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all cursor-pointer group"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-white group-hover:shadow-sm">
                                                        <FileText size={20} />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900 text-sm">{sub.form.title}</p>
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                                            Submitted {new Date(sub.createdAt).toLocaleString()}
                                                        </p>
                                                    </div>
                                                </div>
                                                <Button variant="ghost" size="sm" className="text-xs font-bold text-primary-600">View Data</Button>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-10 text-slate-400">
                                            <FileText size={32} className="mx-auto mb-2 opacity-20" />
                                            <p className="text-sm font-medium">No forms submitted by this patient.</p>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        </div>
                    )}

                    {activeTab === 'notes' && (
                        <div className="space-y-6">
                            <Card className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-bold text-slate-900">Doctor Notes & Clinical Observations</h3>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setIsSummarizerOpen(true)}
                                        className="rounded-xl border-primary-100 text-primary-600 hover:bg-primary-50 transition-all font-bold group"
                                    >
                                        <Sparkles size={14} className="mr-2 group-hover:rotate-12 transition-transform" />
                                        Conversation
                                    </Button>
                                </div>
                                <div className="space-y-4 mb-6 relative group/editor">
                                    <div
                                        onClick={() => setIsEditorMaximized(true)}
                                        className="cursor-pointer transition-all hover:ring-2 hover:ring-primary-100 rounded-xl"
                                    >
                                        <AINotesAssistant
                                            value={newNote}
                                            onChange={setNewNote}
                                            context={`Patient: ${patient?.name}\nAge: ${patient?.dob}\nRecent Appointments: ${appointments.length}`}
                                            placeholder="Add a new clinical note, observation, or comment about this patient..."
                                        />
                                    </div>
                                    <div className="flex justify-end">
                                        <Button
                                            onClick={handleAddNote}
                                            disabled={isSavingNote || !newNote.trim()}
                                            className="px-6"
                                        >
                                            {isSavingNote ? 'Saving...' : 'Save Note'}
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {patient.notes && patient.notes.length > 0 ? (
                                        patient.notes.map((note) => (
                                            <div
                                                key={note.id}
                                                className="p-4 bg-slate-50/50 rounded-xl border border-slate-100 hover:border-primary-100 hover:bg-white transition-all cursor-pointer group"
                                                onClick={() => setSelectedNote(note)}
                                            >
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-bold text-primary-600">Dr. {note.doctor.name}</span>
                                                        {note.content.includes('### CLINICAL_SUMMARY') && (
                                                            <span className="flex items-center gap-1 px-2 py-0.5 bg-primary-50 text-primary-700 text-[9px] font-black uppercase tracking-wider rounded-md border border-primary-100">
                                                                <Sparkles size={10} />
                                                                AI Summary
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="text-[10px] text-slate-400 font-medium">
                                                        {new Date(note.createdAt).toLocaleString()}
                                                    </span>
                                                </div>
                                                {note.content.includes('### CLINICAL_SUMMARY') ? (
                                                    <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-dashed border-primary-100/50 group-hover:border-primary-300 transition-colors">
                                                        <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600">
                                                            <FileText size={16} />
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-black text-slate-900">Clinical Consultation Summary</p>
                                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">Click to view full report</p>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed line-clamp-3 group-hover:line-clamp-none">
                                                        {note.content}
                                                    </p>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-10 text-slate-400 border border-dashed border-slate-200 rounded-xl">
                                            <p className="text-sm">No doctor notes found for this patient.</p>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        </div>
                    )}

                    {activeTab === 'files' && (
                        <Card className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold text-slate-900">Patient Files & Attachments</h3>
                                <div className="relative">
                                    <input
                                        type="file"
                                        id="patient-file-upload"
                                        className="hidden"
                                        onChange={handleFileUpload}
                                        disabled={isUploadingFile}
                                    />
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => document.getElementById('patient-file-upload')?.click()}
                                        disabled={isUploadingFile}
                                    >
                                        <Paperclip size={14} className="mr-2" />
                                        {isUploadingFile ? 'Uploading...' : 'Upload File/Report'}
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-8">
                                {/* Doctor Uploaded Files */}
                                <div>
                                    <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                                        Doctor Uploaded Files
                                        <Badge variant="neutral" className="ml-auto">{doctorFiles.length}</Badge>
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {doctorFiles.length > 0 ? (
                                            doctorFiles.map((file: any) => (
                                                <div key={file.id} className="flex items-center gap-4 p-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all cursor-pointer group">
                                                    <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 group-hover:bg-white shadow-sm">
                                                        <Paperclip size={24} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-bold text-slate-900 text-sm truncate">{file.name}</p>
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase">
                                                            {(file.size / 1024).toFixed(1)} KB • {file.type.split('/')[1]?.toUpperCase() || 'FILE'}
                                                        </p>
                                                    </div>
                                                    <Button variant="ghost" size="sm" onClick={() => window.open(file.url, '_blank')}>
                                                        View
                                                    </Button>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="col-span-full text-center py-8 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                                <p className="text-sm font-medium">No files uploaded yet.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Patient Uploaded Files */}
                                <div>
                                    <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                                        Patient Uploaded Files
                                        <Badge variant="neutral" className="ml-auto">{patientFiles.length}</Badge>
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {patientFiles.length > 0 ? (
                                            patientFiles.map((file: any) => (
                                                <div key={file.id} className="flex items-center gap-4 p-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all cursor-pointer group">
                                                    <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center text-primary-500 group-hover:bg-white shadow-sm">
                                                        <FileText size={24} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-bold text-slate-900 text-sm truncate">{file.name}</p>
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-[10px] text-slate-400 font-bold uppercase">
                                                                {file.type.split('/')[1]?.toUpperCase() || 'FILE'}
                                                            </p>
                                                            <Badge variant="neutral" className="text-[8px] py-0 px-1">
                                                                Source: {file.formTitle}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                    <Button variant="ghost" size="sm" onClick={() => window.open(file.url, '_blank')}>
                                                        View
                                                    </Button>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="col-span-full text-center py-8 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                                <p className="text-sm font-medium">No patient files found.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Card>
                    )}
                </div>
            </div >

            <AppointmentDetailsModal
                isOpen={!!selectedAppointment}
                onClose={() => setSelectedAppointment(null)}
                appointment={selectedAppointment}
            />

            {/* Submission Details Modal */}
            {
                selectedSubmission && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                        <Card className="w-full max-w-2xl bg-white shadow-2xl relative overflow-hidden rounded-3xl animate-in zoom-in duration-200">
                            <div className="absolute top-0 right-0 p-6">
                                <Button variant="ghost" size="sm" onClick={() => setSelectedSubmission(null)} className="rounded-full w-10 h-10 p-0 hover:bg-slate-100">
                                    <FileText size={20} className="text-slate-400" />
                                </Button>
                            </div>
                            <div className="p-8">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="w-14 h-14 bg-primary-50 text-primary-600 rounded-2xl flex items-center justify-center shadow-inner">
                                        <FileText size={28} />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-slate-900">{selectedSubmission.form.title}</h2>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                            Submitted {new Date(selectedSubmission.createdAt).toLocaleString()}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-6 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                                    <PatientFormData
                                        data={selectedSubmission.data}
                                        formConfig={selectedSubmission.form.config}
                                    />
                                </div>

                                <div className="mt-8 pt-8 border-t border-slate-100 flex justify-end">
                                    <Button onClick={() => setSelectedSubmission(null)} className="rounded-2xl px-8 font-bold">
                                        Close Record
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    </div>
                )
            }

            {/* Contact Info Modal */}
            {
                selectedNote && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-8 bg-slate-900/60 backdrop-blur-md">
                        <Card className="w-full max-w-5xl h-[80vh] bg-white shadow-2xl relative overflow-hidden rounded-[2.5rem] animate-in zoom-in duration-250 flex flex-col">
                            <div className="absolute top-6 right-6 z-10">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setSelectedNote(null);
                                        setIsEditingNote(false);
                                    }}
                                    className="rounded-full w-12 h-12 p-0 hover:bg-slate-100 bg-white/80 backdrop-blur-sm"
                                >
                                    <XCircle size={24} className="text-slate-400" />
                                </Button>
                            </div>

                            <div className="p-8 md:p-12 flex flex-col h-full">
                                <div className="flex items-center gap-5 mb-10 pb-8 border-b border-slate-100">
                                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                                        <MessageSquare size={32} />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-slate-900">Clinical Note</h2>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-sm font-bold text-primary-600">Dr. {selectedNote.doctor.name}</span>
                                            <span className="w-1 h-1 rounded-full bg-slate-300" />
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                                {new Date(selectedNote.createdAt).toLocaleString(undefined, {
                                                    month: 'long',
                                                    day: 'numeric',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar">
                                    {isEditingNote ? (
                                        <div className="h-full flex flex-col gap-4">
                                            <textarea
                                                value={editedNoteContent}
                                                onChange={(e) => setEditedNoteContent(e.target.value)}
                                                className="flex-1 w-full p-8 text-lg text-slate-800 bg-slate-50/50 border border-primary-200 rounded-[2rem] focus:ring-4 focus:ring-primary-100 focus:border-primary-400 transition-all outline-none resize-none font-medium leading-relaxed shadow-inner"
                                                autoFocus
                                            />
                                        </div>
                                    ) : (
                                        <div className="bg-slate-50/50 p-8 rounded-[2rem] border border-slate-100">
                                            <p className="text-lg text-slate-800 leading-relaxed whitespace-pre-wrap font-medium">
                                                {selectedNote.content}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-8 pt-8 border-t border-slate-100 flex justify-end gap-4">
                                    {isEditingNote ? (
                                        <>
                                            <Button
                                                variant="ghost"
                                                onClick={() => setIsEditingNote(false)}
                                                className="rounded-2xl px-10 h-14 font-bold text-slate-500"
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                onClick={handleUpdateNote}
                                                disabled={isUpdatingNote || !editedNoteContent.trim()}
                                                className="rounded-2xl px-12 h-14 font-bold text-base shadow-lg shadow-primary-200"
                                            >
                                                {isUpdatingNote ? 'Updating...' : 'Save Changes'}
                                            </Button>
                                        </>
                                    ) : (
                                        <>
                                            <Button
                                                variant="outline"
                                                onClick={() => {
                                                    setEditedNoteContent(selectedNote.content);
                                                    setIsEditingNote(true);
                                                }}
                                                className="rounded-2xl px-10 h-14 font-bold text-base border-slate-200 hover:bg-slate-50"
                                            >
                                                Edit Note
                                            </Button>
                                            <Button
                                                onClick={() => {
                                                    setSelectedNote(null);
                                                    setIsEditingNote(false);
                                                }}
                                                className="rounded-2xl px-10 h-14 font-bold text-base shadow-lg shadow-primary-200"
                                            >
                                                Close Note
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </Card>
                    </div>
                )
            }

            {/* Contact Info Modal */}
            {
                isContactModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                        <Card className="w-full max-w-sm bg-white shadow-2xl relative overflow-hidden rounded-3xl animate-in zoom-in duration-200">
                            <div className="absolute top-0 right-0 p-4">
                                <Button variant="ghost" size="sm" onClick={() => setIsContactModalOpen(false)} className="rounded-full w-8 h-8 p-0 hover:bg-slate-100">
                                    <ArrowLeft size={16} className="text-slate-400" />
                                </Button>
                            </div>
                            <div className="p-8 text-center bg-slate-50/50 border-b border-primary-100/50">
                                <div className="w-24 h-24 mx-auto rounded-full bg-white text-primary-600 flex items-center justify-center font-bold text-3xl shadow-md border-4 border-primary-50 mb-4">
                                    {patient.name.split(' ').map(n => n[0]).join('')}
                                </div>
                                <h2 className="text-xl font-black text-slate-900 leading-tight">{patient.name}</h2>
                                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Patient Details</p>
                            </div>
                            <div className="p-6 space-y-4">
                                {patient.email && (
                                    <div className="flex items-center gap-4 group p-2 hover:bg-slate-50 rounded-xl transition-colors">
                                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                                            <Mail size={18} />
                                        </div>
                                        <div className="flex-1 min-w-0 text-left">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Email Address</p>
                                            <p className="text-sm font-bold text-slate-900 truncate">{patient.email}</p>
                                        </div>
                                    </div>
                                )}

                                {patient.phone && (
                                    <div className="flex items-center gap-4 group p-2 hover:bg-slate-50 rounded-xl transition-colors">
                                        <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0">
                                            <Phone size={18} />
                                        </div>
                                        <div className="flex-1 min-w-0 text-left">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Phone Number</p>
                                            <p className="text-sm font-bold text-slate-900 truncate">{patient.phone}</p>
                                        </div>
                                    </div>
                                )}

                                {patient.address && (
                                    <div className="flex items-center gap-4 group p-2 hover:bg-slate-50 rounded-xl transition-colors">
                                        <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                                            <MapPin size={18} />
                                        </div>
                                        <div className="flex-1 min-w-0 text-left">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Home Address</p>
                                            <p className="text-sm font-bold text-slate-900 truncate">{patient.address}</p>
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4 pt-2">
                                    {patient.dob && (
                                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Calendar size={14} className="text-slate-400" />
                                                <span className="text-[10px] font-black text-slate-400 uppercase">DOB</span>
                                            </div>
                                            <p className="text-sm font-bold text-slate-900">{new Date(patient.dob).toLocaleDateString()}</p>
                                        </div>
                                    )}
                                    {patient.gender && (
                                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                            <div className="flex items-center gap-2 mb-1">
                                                <User size={14} className="text-slate-400" />
                                                <span className="text-[10px] font-black text-slate-400 uppercase">Gender</span>
                                            </div>
                                            <p className="text-sm font-bold text-slate-900">{patient.gender}</p>
                                        </div>
                                    )}
                                </div>
                                <div className="pt-4 mt-2">
                                    <Button onClick={() => setIsContactModalOpen(false)} className="w-full font-bold rounded-xl h-11">
                                        Close
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    </div>
                )
            }
            {/* Maximized Editor Modal */}
            {
                isEditorMaximized && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 md:p-8 bg-slate-900/60 backdrop-blur-md">
                        <Card className="w-full max-w-6xl h-[85vh] bg-white shadow-2xl relative overflow-hidden rounded-[2.5rem] animate-in zoom-in duration-250 flex flex-col">
                            <div className="absolute top-6 right-6 z-10">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setIsEditorMaximized(false)}
                                    className="rounded-full w-12 h-12 p-0 hover:bg-slate-100 bg-white/80 backdrop-blur-sm"
                                >
                                    <XCircle size={24} className="text-slate-400" />
                                </Button>
                            </div>

                            <div className="p-8 md:p-12 flex flex-col h-full">
                                <div className="flex items-center gap-5 mb-10 pb-8 border-b border-slate-100">
                                    <div className="w-16 h-16 bg-primary-50 text-primary-600 rounded-2xl flex items-center justify-center">
                                        <FileText size={32} />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-slate-900">Patient Consultation Note</h2>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Expanding your clinical workspace</p>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-visible pr-2">
                                    <div className="h-full flex flex-col gap-6">
                                        <AINotesAssistant
                                            value={newNote}
                                            onChange={setNewNote}
                                            context={`Patient: ${patient?.name}\nAge: ${patient?.dob}\nRecent Appointments: ${appointments.length}`}
                                            placeholder="Start typing your clinical observations here..."
                                        />

                                        <div className="flex items-center justify-between p-6 bg-slate-50 rounded-[2rem] border border-slate-100 mt-auto">
                                            <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                                                <Sparkles size={16} className="text-primary-500" />
                                                AI insights active and ready to assist.
                                            </div>
                                            <div className="flex gap-4">
                                                <Button
                                                    variant="outline"
                                                    onClick={() => setIsEditorMaximized(false)}
                                                    className="rounded-2xl px-8 h-14 font-bold border-slate-200"
                                                >
                                                    Discard Changes
                                                </Button>
                                                <Button
                                                    onClick={() => {
                                                        handleAddNote();
                                                        setIsEditorMaximized(false);
                                                    }}
                                                    disabled={isSavingNote || !newNote.trim()}
                                                    className="rounded-2xl px-12 h-14 font-bold text-base shadow-lg shadow-primary-200"
                                                >
                                                    {isSavingNote ? 'Saving...' : 'Finalize & Save Note'}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>
                )
            }

            {
                isSummarizerOpen && (
                    <ConversationalSummarizer
                        onClose={() => setIsSummarizerOpen(false)}
                        patientId={patientId}
                        patientName={patient?.name}
                        onSuccess={fetchPatientData}
                    />
                )
            }

            {
                isAIModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                        <Card className="w-full max-w-3xl bg-white shadow-2xl relative overflow-hidden rounded-3xl animate-in zoom-in duration-200 max-h-[85vh] flex flex-col">
                            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                <div className="flex items-center gap-3">
                                    <div className="bg-blue-100 text-blue-600 p-2 rounded-xl">
                                        <Sparkles size={20} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-slate-900">AI Clinical Insights</h2>
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Powered by OpenAI</p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => setIsAIModalOpen(false)} className="rounded-full w-10 h-10 p-0 hover:bg-slate-200">
                                    <span className="text-xl">×</span>
                                </Button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-0">
                                <AIPatientSummary
                                    patient={{
                                        ...patient,
                                        appointments,
                                        notes: (patient as any).notes,
                                        formSubmissions: (patient as any).formSubmissions,
                                        files: allFiles
                                    }}
                                />
                            </div>
                        </Card>
                    </div>
                )
            }

            {/* Encounter Scribe Modal */}
            {isEncounterModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
                    <div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto custom-scrollbar relative rounded-[2rem] shadow-2xl animate-in zoom-in duration-300">
                        <button
                            onClick={() => setIsEncounterModalOpen(false)}
                            className="absolute top-6 right-8 z-[110] p-2 hover:bg-white/10 text-white/60 hover:text-white rounded-full transition-all"
                        >
                            <XCircle size={28} />
                        </button>
                        <SoapNoteEditor
                            patientId={patientId}
                            mode={recordingMode}
                            initialData={selectedEncounter || {}}
                            onSuccess={() => {
                                setIsEncounterModalOpen(false);
                                fetchPatientData();
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Appointment Booking Modal */}
            {patient && (
                <AppointmentBookingModal
                    isOpen={isBookingModalOpen}
                    onClose={() => setIsBookingModalOpen(false)}
                    onSuccess={() => {
                        fetchPatientData();
                    }}
                    patientId={patient.id}
                    patientName={patient.name}
                />
            )}

            {/* View Active Appointments Modal */}
            <Modal
                isOpen={isViewAppointmentsModalOpen}
                onClose={() => setIsViewAppointmentsModalOpen(false)}
                title="Active Schedules"
                maxWidth="md"
            >
                <div className="space-y-4 text-left">
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                        {patientAppointments.map((appt) => (
                            <div
                                key={appt.id}
                                className="p-4 rounded-xl border border-slate-100 bg-slate-50 hover:border-primary-200 transition-all group cursor-pointer"
                                onClick={() => {
                                    setSelectedAppointment(appt);
                                    setIsViewAppointmentsModalOpen(false);
                                }}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <p className="font-bold text-slate-900">{appt.service?.name || 'Consultation'}</p>
                                    <Badge variant={appt.status === 'confirmed' ? 'info' : (appt.status === 'scheduled' ? 'warning' : 'info')}>
                                        {appt.status}
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-4 text-xs text-slate-500 font-medium">
                                    <div className="flex items-center gap-1.5">
                                        <Calendar size={12} className="text-slate-400" />
                                        {new Date(appt.date).toLocaleDateString()}
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Clock size={12} className="text-slate-400" />
                                        {new Date(appt.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="pt-4 flex flex-col gap-2">
                        <Button
                            className="w-full py-4 rounded-xl"
                            onClick={() => {
                                setIsViewAppointmentsModalOpen(false);
                                setIsBookingModalOpen(true);
                            }}
                        >
                            Schedule a new one
                        </Button>
                        <Button
                            variant="ghost"
                            className="w-full py-4 rounded-xl text-slate-500"
                            onClick={() => setIsViewAppointmentsModalOpen(false)}
                        >
                            Close
                        </Button>
                    </div>
                </div>
            </Modal>
            {/* Intake Link Modal */}
            <Modal
                isOpen={isIntakeLinkModalOpen}
                onClose={() => setIsIntakeLinkModalOpen(false)}
                title="Intake Form Link"
                maxWidth="sm"
            >
                <div className="p-1 space-y-4">
                    <p className="text-sm text-slate-600">
                        Share this unique link with <strong>{patient.name}</strong>. They can fill out their medical history and vitals directly through this link.
                    </p>

                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 break-all text-xs font-mono text-primary-700 select-all">
                        {intakeLink}
                    </div>

                    <div className="flex gap-3">
                        <Button
                            className="flex-1"
                            onClick={() => copyToClipboard(intakeLink)}
                        >
                            Copy Link
                        </Button>
                        <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => setIsIntakeLinkModalOpen(false)}
                        >
                            Close
                        </Button>
                    </div>

                    <p className="text-[10px] text-slate-400 text-center">
                        This link is single-use and will expire in 7 days.
                    </p>
                </div>
            </Modal>

        </div >
    );
};

export default PatientDetails;
