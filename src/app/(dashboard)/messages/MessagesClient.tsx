"use client";

import React, { useState, useEffect } from 'react';
import {
    Search, Mail, MessageCircle, User, Filter, Phone, MessageSquare, ExternalLink, Calendar, XCircle
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import clsx from 'clsx';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import api from '@/utils/api';
import ChatInterface from '@/components/chat/ChatInterface';
import { useAuth } from '@/context/AuthContext';
import { usePermissionApi } from '@/hooks/usePermissionApi';
import { PERMISSIONS } from '@/config/apiPermissions';

const MessagesClient: React.FC = () => {
    const { user } = useAuth();
    const { get: apiGet } = usePermissionApi();
    
    const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
    const [conversations, setConversations] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const searchParams = useSearchParams();
    const activeConversationId = searchParams.get('conversationId');
    const [activeTab, setActiveTab] = useState<'patients' | 'visitors'>('patients');
    const [isNewChatOpen, setIsNewChatOpen] = useState(false);
    const [allPatients, setAllPatients] = useState<any[]>([]);
    const [allDoctors, setAllDoctors] = useState<any[]>([]);
    const [patientSearch, setPatientSearch] = useState('');

    useEffect(() => {
        if (isNewChatOpen && user) {
            // Fetch Patients
            apiGet(PERMISSIONS.VIEW_ALL_PATIENTS, '/patients')
                .then(res => res && setAllPatients(res.data))
                .catch(err => console.error(err));
            
            // Fetch Doctors/Staff (Always viewable for messaging purposes)
            api.get('/users?role=doctor')
                .then(res => setAllDoctors(res.data))
                .catch(err => console.error(err));
        }
    }, [isNewChatOpen, user, apiGet]);

    const fetchConversations = React.useCallback(async () => {
        setIsLoading(true);
        try {
            const type = activeTab === 'visitors' ? 'VISITOR' : 'INTERNAL';
            const response = await api.get('/conversations', { params: { type } });
            setConversations(response.data);
            if (activeConversationId) {
                const found = response.data.find((c: any) => c.id === activeConversationId);
                if (found) {
                    setSelectedConversationId(found.id);
                    setSelectedPatientId(found.patient?.id || found.visitor?.id);
                } else {
                    try {
                        const singleRes = await api.get(`/conversations/${activeConversationId}`);
                        if (singleRes.data) {
                            setConversations(prev => prev.some(c => c.id === singleRes.data.id) ? prev : [singleRes.data, ...prev]);
                            setSelectedConversationId(singleRes.data.id);
                            setSelectedPatientId(singleRes.data.patient?.id || singleRes.data.visitor?.id);
                        }
                    } catch (err) { console.error(err); }
                }
            }
        } catch (error) { console.error(error); } finally { setIsLoading(false); }
    }, [activeTab, activeConversationId]);

    useEffect(() => {
        if (user) fetchConversations();
    }, [user, fetchConversations]);

    const displayList = conversations.map(conv => {
        if (activeTab === 'visitors') {
            return {
                id: conv.visitor?.id || 'anon',
                conversationId: conv.id,
                name: conv.visitor?.name || 'Anonymous Visitor',
                email: conv.visitor?.email || '',
                phone: conv.visitor?.phone || '',
                source: 'web_widget' as const,
                createdAt: conv.createdAt
            };
        }
        const normalizedRole = user?.role?.toLowerCase();
        const isStaff = ['doctor', 'staff', 'system_admin', 'clinic_admin', 'saas_owner'].includes(normalizedRole || '');
        if (isStaff) {
            return {
                id: conv.patient?.id || conv.visitor?.id || 'anon',
                conversationId: conv.id,
                name: conv.patient?.name || conv.visitor?.name || 'Unknown Patient',
                email: conv.patient?.email || conv.visitor?.email,
                phone: conv.patient?.phone || conv.visitor?.phone,
                source: (conv.visitor ? 'web_widget' : 'whatsapp') as any,
                createdAt: conv.createdAt
            };
        }
        return {
            id: conv.doctor?.id,
            conversationId: conv.id,
            name: conv.doctor?.name || 'Doctor',
            email: conv.doctor?.email,
            source: 'email' as const,
            createdAt: conv.createdAt
        };
    });

    const normalizedRole = user?.role?.toLowerCase();
    const isStaff = ['doctor', 'staff', 'system_admin', 'clinic_admin', 'saas_owner'].includes(normalizedRole || '');

    const activePatient = displayList.find(p => p.id === selectedPatientId) || 
                          allPatients.find(p => p.id === selectedPatientId) || 
                          allDoctors.find(p => p.id === selectedPatientId);
    const filteredPatients = displayList.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const filteredAllPatients = allPatients.filter(p => 
        p.name.toLowerCase().includes(patientSearch.toLowerCase())
    );

    return (
        <div className="flex h-[calc(100vh-100px)] bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="w-80 lg:w-96 border-r border-slate-100 flex flex-col bg-slate-50/50">
                <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <h1 className="text-xl font-black text-slate-900">Messages</h1>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="rounded-xl h-8 px-2 border-slate-200"
                            onClick={() => setIsNewChatOpen(!isNewChatOpen)}
                        >
                            {isNewChatOpen ? <XCircle size={14} /> : <MessageSquare size={14} />}
                        </Button>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                            type="text" 
                            placeholder={isNewChatOpen ? (isStaff ? "Search patients/staff..." : "Search doctors...") : "Search messages..."} 
                            className="w-full pl-10 pr-4 py-2 bg-white border rounded-xl text-sm" 
                            value={isNewChatOpen ? patientSearch : searchQuery} 
                            onChange={e => isNewChatOpen ? setPatientSearch(e.target.value) : setSearchQuery(e.target.value)} 
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-1">
                    {isNewChatOpen ? (
                        <>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 mb-2">New Conversation</p>
                            {/* Staff can see patients to message */}
                            {isStaff && allPatients
                                .filter(p => p.name.toLowerCase().includes(patientSearch.toLowerCase()))
                                .slice(0, 10)
                                .map(patient => (
                                <div 
                                    key={`new-p-${patient.id}`} 
                                    onClick={() => { 
                                        setSelectedPatientId(patient.id); 
                                        setSelectedConversationId(null);
                                        setIsNewChatOpen(false);
                                    }} 
                                    className="p-4 rounded-2xl cursor-pointer hover:bg-white border hover:shadow-md transition-all mb-1"
                                >
                                    <p className="font-black text-slate-900 text-sm">{patient.name}</p>
                                    <p className="text-[10px] text-slate-400 uppercase">Patient</p>
                                </div>
                            ))}
                            {/* Everyone can see doctors to message */}
                            {allDoctors
                                .filter(d => d.id !== user.id && d.name.toLowerCase().includes(patientSearch.toLowerCase()))
                                .slice(0, 10)
                                .map(doctor => (
                                <div 
                                    key={`new-d-${doctor.id}`} 
                                    onClick={() => { 
                                        // For patient-to-doctor, we use doctorId as target
                                        // We need to handle this in ChatInterface/Backend
                                        setSelectedPatientId(doctor.id); 
                                        setSelectedConversationId(null);
                                        setIsNewChatOpen(false);
                                    }} 
                                    className="p-4 rounded-2xl cursor-pointer hover:bg-white border hover:shadow-md transition-all mb-1 bg-indigo-50/30"
                                >
                                    <p className="font-black text-indigo-900 text-sm">{doctor.name}</p>
                                    <p className="text-[10px] text-indigo-400 uppercase">Doctor</p>
                                </div>
                            ))}
                        </>
                    ) : (
                        filteredPatients.map(patient => (
                            <div key={patient.conversationId} onClick={() => { setSelectedPatientId(patient.id); setSelectedConversationId((patient as any).conversationId); }} className={clsx("p-4 rounded-2xl cursor-pointer transition-all border", selectedPatientId === patient.id && selectedConversationId === patient.conversationId ? "bg-white shadow-md border-primary-200" : "hover:bg-white")}>
                                <p className="font-black text-slate-900 text-sm">{patient.name}</p>
                                <p className="text-[10px] text-slate-400 uppercase">{patient.source}</p>
                            </div>
                        ))
                    )}
                </div>
            </div>
            <div className="flex-1 flex flex-col bg-white">
                {selectedPatientId ? (
                    <ChatInterface 
                        conversationId={selectedConversationId || undefined} 
                        patientId={selectedPatientId} 
                        patientName={activePatient?.name || ''} 
                        patientSource={activePatient?.source || 'whatsapp'} 
                        onConversationCreated={(id) => {
                            setSelectedConversationId(id);
                            fetchConversations();
                        }}
                    />
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                        <Mail size={48} className="mb-4 opacity-20" />
                        <p className="font-bold">Select a conversation</p>
                        <p className="text-xs">Or click the chat icon to start a new one</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MessagesClient;
