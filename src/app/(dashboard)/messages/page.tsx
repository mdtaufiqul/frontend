"use client";

import React, { useState, useEffect } from 'react';
import {
    Search, Mail, MessageCircle, MoreVertical, Send,
    User, CheckCircle2, Clock, Filter, Phone,
    Video, Info, Paperclip, Smile,
    XCircle, MapPin, ExternalLink, Calendar
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import clsx from 'clsx';
import Badge from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

import api from '@/utils/api';
import ChatInterface from '@/components/chat/ChatInterface';
import { useAuth } from '@/context/AuthContext';

interface Patient {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    source?: 'whatsapp' | 'email';
    createdAt?: string;
}

interface Conversation {
    id: string;
    patientName: string;
    patientId: string;
    lastMessage: string;
    timestamp: string;
    unread: number;
    source: 'whatsapp' | 'email';
    status: 'active' | 'pending';
    messages: Message[];
}

interface Message {
    id: string;
    text: string;
    sender: 'doctor' | 'patient';
    timestamp: string;
}

const mockConversations: Conversation[] = [
    {
        id: '1',
        patientName: 'Sarah Connor',
        patientId: 'PT-8802',
        lastMessage: 'Thank you, doctor. I will take the medicine as prescribed.',
        timestamp: '10:45 AM',
        unread: 0,
        source: 'whatsapp',
        status: 'active',
        messages: [
            { id: 'm1', text: 'Hello, I have been feeling a bit dizzy today.', sender: 'patient', timestamp: '09:00 AM' },
            { id: 'm2', text: 'I am sorry to hear that, Sarah. Have you been staying hydrated?', sender: 'doctor', timestamp: '09:15 AM' },
            { id: 'm3', text: 'Thank you, doctor. I will take the medicine as prescribed.', sender: 'patient', timestamp: '10:45 AM' },
        ]
    },
    {
        id: '2',
        patientName: 'James Wilson',
        patientId: 'PT-4421',
        lastMessage: 'Regarding my lab results from yesterday...',
        timestamp: '9:30 AM',
        unread: 2,
        source: 'email',
        status: 'active',
        messages: [
            { id: 'm4', text: 'Hello Doctor, I received my lab results.', sender: 'patient', timestamp: '08:00 AM' },
            { id: 'm5', text: 'Regarding my lab results from yesterday...', sender: 'patient', timestamp: '09:30 AM' },
        ]
    },
    {
        id: '3',
        patientName: 'Emma Watson',
        patientId: 'PT-9912',
        lastMessage: 'Hi, I would like to book an appointment for next week.',
        timestamp: '11:20 AM',
        unread: 1,
        source: 'whatsapp',
        status: 'pending',
        messages: [
            { id: 'm6', text: 'Hi, I would like to book an appointment for next week.', sender: 'patient', timestamp: '11:20 AM' },
        ]
    },
    {
        id: '4',
        patientName: 'Michael Chen',
        patientId: 'PT-1234',
        lastMessage: 'Question about my prescription refill.',
        timestamp: 'Yesterday',
        unread: 0,
        source: 'email',
        status: 'pending',
        messages: [
            { id: 'm7', text: 'Question about my prescription refill.', sender: 'patient', timestamp: 'Yesterday' },
        ]
    }
];

// Removed mockAllPatients as we fetch real data

const Messages: React.FC = () => {
    const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
    const [conversations, setConversations] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const { user } = useAuth(); // Get current user
    const searchParams = useSearchParams();
    const activeConversationId = searchParams.get('conversationId');

    const [activeTab, setActiveTab] = useState<'patients' | 'visitors'>('patients');

    useEffect(() => {
        const fetchConversations = async () => {
            setIsLoading(true);
            try {
                const type = activeTab === 'visitors' ? 'VISITOR' : 'INTERNAL';
                const response = await api.get('/conversations', { params: { type } });
                setConversations(response.data);

                // If specialized conversation ID in URL
                if (activeConversationId) {
                    const found = response.data.find((c: any) => c.id === activeConversationId);
                    if (found) {
                        setSelectedConversationId(found.id);
                        setSelectedPatientId(found.patient?.id || found.visitor?.id);
                    } else {
                        // If not in list (maybe new or different type), try fetching single
                        try {
                            const singleRes = await api.get(`/conversations/${activeConversationId}`);
                            if (singleRes.data) {
                                // Add to list if not present so UI can render it
                                setConversations(prev => {
                                    if (prev.some(c => c.id === singleRes.data.id)) return prev;
                                    return [singleRes.data, ...prev];
                                });
                                setSelectedConversationId(singleRes.data.id);
                                setSelectedPatientId(singleRes.data.patient?.id || singleRes.data.visitor?.id);
                            }
                        } catch (err) {
                            console.error("Failed to fetch specific conversation:", err);
                        }
                    }
                }
            } catch (error) {
                console.error('Failed to fetch conversations:', error);
            } finally {
                setIsLoading(false);
            }
        };

        if (user) {
            fetchConversations();
        }
    }, [user, activeTab, activeConversationId]); // Added activeConversationId dep

    // Map conversations to standardized display objects
    const displayList = conversations.map(conv => {
        if (activeTab === 'visitors') {
            return {
                id: conv.visitor?.id || 'anon',
                conversationId: conv.id,
                name: conv.visitor?.name || 'Anonymous Visitor',
                email: conv.visitor?.email || '',
                phone: conv.visitor?.phone || '',
                source: 'web_widget' as const,
                createdAt: conv.createdAt,
                lastMessage: conv.messages?.[0]?.content || 'No messages yet'
            };
        }

        const normalizedRole = user?.role?.toLowerCase();
        const isStaffOrDoctor = normalizedRole === 'doctor' || normalizedRole === 'staff' || normalizedRole === 'system_admin' || normalizedRole === 'clinic_admin' || normalizedRole === 'saas_owner';

        // Existing Staff/Doctor Logic
        if (isStaffOrDoctor) {
            return {
                id: conv.patient?.id || conv.visitor?.id || 'anon',
                conversationId: conv.id,
                name: conv.patient?.name || conv.visitor?.name || 'Unknown Patient',
                email: conv.patient?.email || conv.visitor?.email,
                phone: conv.patient?.phone || conv.visitor?.phone,
                source: (conv.visitor ? 'web_widget' : 'whatsapp') as any,
                createdAt: conv.createdAt,
                lastMessage: conv.messages?.[0]?.content || 'No messages yet'
            };
        } else {
            // Patient View
            return {
                id: conv.doctor?.id,
                conversationId: conv.id,
                name: conv.doctor?.name || 'Doctor',
                email: conv.doctor?.email,
                phone: '',
                source: 'email' as const,
                createdAt: conv.createdAt,
                lastMessage: conv.messages?.[0]?.content || 'No messages yet'
            };
        }
    });

    const activePatient = displayList.find(p => p.id === selectedPatientId);

    const filteredPatients = displayList.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex h-[calc(100vh-100px)] bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            {/* Sidebar */}
            <div className="w-80 lg:w-96 border-r border-slate-100 flex flex-col bg-slate-50/50">
                <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <h1 className="text-xl font-black text-slate-900">Messages</h1>
                        <Button variant="outline" size="sm" className="w-8 h-8 p-0 rounded-full">
                            <Filter size={14} />
                        </Button>
                    </div>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search patients..."
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all shadow-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                <XCircle size={14} />
                            </button>
                        )}
                    </div>

                    <div className="flex p-1 bg-slate-100 rounded-xl mb-4">
                        <button
                            onClick={() => setActiveTab('patients')}
                            className={clsx(
                                "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all",
                                activeTab === 'patients' ? "bg-white text-primary-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            <span className="flex items-center justify-center gap-2">
                                <User size={14} />
                                Patients
                            </span>
                        </button>
                        <button
                            onClick={() => setActiveTab('visitors')}
                            className={clsx(
                                "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all",
                                activeTab === 'visitors' ? "bg-white text-primary-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            <span className="flex items-center justify-center gap-2">
                                <MessageCircle size={14} />
                                Visitors
                            </span>
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-1">
                    {isLoading ? (
                        <div className="text-center py-10 text-slate-400">Loading patients...</div>
                    ) : filteredPatients.length === 0 ? (
                        <div className="text-center py-10 text-slate-400">No patients found.</div>
                    ) : (
                        filteredPatients.map(patient => (
                            <div
                                key={patient.id}
                                onClick={() => {
                                    setSelectedPatientId(patient.id);
                                    setSelectedConversationId((patient as any).conversationId);
                                }}
                                className={clsx(
                                    "p-4 rounded-2xl cursor-pointer transition-all border border-transparent group",
                                    selectedPatientId === patient.id
                                        ? "bg-white border-slate-100 shadow-md ring-1 ring-slate-100"
                                        : "hover:bg-white hover:shadow-sm"
                                )}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-sm border-2 border-white shadow-sm overflow-hidden">
                                            <User size={20} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <div className="font-black text-slate-900 text-sm group-hover:text-primary-600 transition-colors">{patient.name}</div>
                                                {patient.createdAt && !isNaN(new Date(patient.createdAt).getTime()) && (
                                                    <span className="text-[10px] font-medium text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded-md">
                                                        {format(new Date(patient.createdAt), 'MMM yyyy')}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                                    {patient.phone || patient.email || 'No contact info'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col bg-white">
                {(activePatient || (selectedPatientId && selectedConversationId)) ? (
                    <ChatInterface
                        conversationId={selectedConversationId!}
                        patientId={selectedPatientId!}
                        patientName={activePatient?.name || 'Loading Patient...'}
                        patientSource={activePatient?.source || 'whatsapp'}
                    />
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-slate-50/20">
                        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-xl shadow-slate-100 mb-8 relative">
                            <MessageCircle size={40} className="text-primary-500" />
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 mb-2">Select a patient</h2>
                        <div className="text-slate-500 text-sm max-w-sm font-medium leading-relaxed">
                            Pick a patient from the sidebar to start secure messaging.
                        </div>
                    </div>
                )}
            </div>

            {/* Right Context Sidebar (Optional Extra) */}
            <div className="hidden xl:flex w-72 border-l border-slate-100 flex-col bg-white">
                {activePatient && (
                    <div className="p-8 space-y-8 overflow-y-auto">
                        <div className="text-center">
                            <div className="w-24 h-24 rounded-3xl bg-slate-100 flex items-center justify-center mx-auto mb-4 text-slate-400 border border-slate-200 overflow-hidden shadow-inner">
                                <User size={48} />
                            </div>
                            <h3 className="font-black text-slate-900 text-lg">{activePatient.name}</h3>
                            {activePatient.createdAt && (
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                                    Member since {format(new Date(activePatient.createdAt), 'MMMM yyyy')}
                                </div>
                            )}

                            {/* Contact Details */}
                            <div className="mt-4 flex flex-col gap-1 items-center">
                                {activePatient.email && (
                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                                        <Mail size={12} className="text-slate-400" />
                                        {activePatient.email}
                                    </div>
                                )}
                                {activePatient.phone && (
                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                                        <Phone size={12} className="text-slate-400" />
                                        {activePatient.phone}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-6 pt-4 border-t border-slate-100">
                            <div>
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Communication Source</div>
                                <div className={clsx(
                                    "p-4 rounded-2xl flex items-center gap-3 border shadow-sm",
                                    activePatient.source === 'whatsapp' ? "bg-green-50 border-green-100 text-green-700" : "bg-blue-50 border-blue-100 text-blue-700"
                                )}>
                                    {activePatient.source === 'whatsapp' ? <MessageCircle size={20} /> : <Mail size={20} />}
                                    <div>
                                        <div className="text-xs font-black capitalize">{activePatient.source || 'Unknown'}</div>
                                        <div className="text-[10px] font-bold opacity-70">Authenticated Channel</div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Quick Actions</div>
                                <div className="grid grid-cols-1 gap-2">
                                    <Button variant="outline" className="w-full justify-start text-xs font-bold border-slate-100 hover:border-primary-200 py-5 rounded-2xl">
                                        <ExternalLink size={14} className="mr-3 text-slate-400" />
                                        View Full EHR Record
                                    </Button>
                                    <Button variant="outline" className="w-full justify-start text-xs font-bold border-slate-100 hover:border-primary-200 py-5 rounded-2xl">
                                        <Calendar size={14} className="mr-3 text-slate-400" />
                                        Schedule Follow-up
                                    </Button>
                                </div>
                            </div>

                            <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl shadow-slate-200 mt-6 overflow-hidden relative group">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700"></div>
                                <h4 className="text-[10px] font-bold opacity-50 uppercase tracking-widest mb-1 underline">Active Plan</h4>
                                <div className="text-xs font-bold leading-relaxed mb-4">Post-op Recovery Phase 1</div>
                                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-primary-400" style={{ width: '65%' }}></div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Messages;
