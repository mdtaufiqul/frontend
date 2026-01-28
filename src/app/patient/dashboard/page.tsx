
'use client';

import { useEffect, useState } from 'react';
import { UnifiedChat } from '@/components/chat/UnifiedChat';
import { PatientHealthRecord } from '@/components/patient/PatientHealthRecord';
import { MessageSquare, Activity, Settings, LogOut, User } from 'lucide-react';
import clsx from 'clsx';

export default function PatientDashboard() {
    const [patient, setPatient] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'chat' | 'health'>('chat');

    useEffect(() => {
        const p = localStorage.getItem('patient_info');
        if (p) {
            setPatient(JSON.parse(p));
        }
    }, []);

    if (!patient) return <div>Loading...</div>;

    return (
        <div className="min-h-screen bg-slate-50 flex">
            {/* Sidebar */}
            <aside className="w-20 md:w-64 bg-slate-900 text-white flex flex-col p-4 md:p-6 transition-all duration-300">
                <div className="flex items-center gap-3 mb-10 px-2">
                    <div className="bg-primary-500 p-2 rounded-xl scale-110 md:scale-100">
                        <Activity className="text-white" size={24} />
                    </div>
                    <span className="text-xl font-black hidden md:block">Mediflow Portal</span>
                </div>

                <nav className="flex-1 space-y-3">
                    <button
                        onClick={() => setActiveTab('chat')}
                        className={clsx(
                            "w-full flex items-center gap-3 p-3 rounded-xl font-black transition-all",
                            activeTab === 'chat' ? "bg-primary-600 shadow-lg shadow-primary-900/20" : "text-slate-400 hover:bg-white/5"
                        )}
                    >
                        <MessageSquare size={20} />
                        <span className="hidden md:block">Messages</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('health')}
                        className={clsx(
                            "w-full flex items-center gap-3 p-3 rounded-xl font-black transition-all",
                            activeTab === 'health' ? "bg-primary-600 shadow-lg shadow-primary-900/20" : "text-slate-400 hover:bg-white/5"
                        )}
                    >
                        <Activity size={20} />
                        <span className="hidden md:block">Health Record</span>
                    </button>
                </nav>

                <div className="pt-6 border-t border-white/10 space-y-4">
                    <button className="w-full flex items-center gap-3 p-3 text-slate-400 hover:text-white transition-colors">
                        <User size={20} />
                        <span className="hidden md:block text-sm font-bold">Account Settings</span>
                    </button>
                    <button
                        onClick={() => {
                            localStorage.removeItem('patient_token');
                            localStorage.removeItem('patient_info');
                            window.location.href = '/patient/login';
                        }}
                        className="w-full flex items-center gap-3 p-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                    >
                        <LogOut size={20} />
                        <span className="hidden md:block text-sm font-black">Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-8 shrink-0">
                    <div>
                        <h1 className="text-lg font-black text-slate-900">
                            Welcome back, <span className="text-primary-600">{patient.name}</span>
                        </h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                            {activeTab === 'chat' ? 'Secure Clinical Communication' : 'Your Personal Health Record'}
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-black text-slate-900 uppercase tracking-tighter">Next Appointment</p>
                            <p className="text-[10px] font-bold text-primary-600">Jan 24, 2024 at 10:00 AM</p>
                        </div>
                        <div className="w-10 h-10 bg-slate-100 rounded-full border-2 border-white shadow-sm ring-2 ring-primary-50"></div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar bg-slate-50/50">
                    <div className="max-w-6xl mx-auto h-full">
                        {activeTab === 'chat' ? (
                            <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 h-[750px] overflow-hidden border border-slate-100">
                                <UnifiedChat
                                    patientId={patient.id}
                                    doctorId={patient.doctorId || 'unknown'}
                                />
                            </div>
                        ) : (
                            <PatientHealthRecord patientId={patient.id} />
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
