
"use client";

import { useState, useEffect } from 'react';
import { UnifiedChat } from '@/components/chat/UnifiedChat';
import { NoShowScore } from '@/components/patient/NoShowScore';
import { Search, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getApiBaseUrl } from '@/utils/api';

export default function MessagesPage() {
    const { user } = useAuth();
    const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
    const [patients, setPatients] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    // Fetch Patients (Mock or Real)
    useEffect(() => {
        // In a real app, we'd fetch "patients with recent messages"
        // For now, fetch all patients
        fetch(`${getApiBaseUrl()}/api/patients`)
            .then(res => res.json())
            .then(data => setPatients(data))
            .catch(err => console.error('Failed to fetch patients', err));
    }, []);

    const filteredPatients = patients.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.phone && p.phone.includes(searchTerm))
    );

    const selectedPatient = patients.find(p => p.id === selectedPatientId);

    return (
        <div className="flex h-[calc(100vh-100px)] gap-6">
            {/* Sidebar: Patient List */}
            <div className="w-1/3 bg-white rounded-lg border shadow-sm flex flex-col">
                <div className="p-4 border-b">
                    <h2 className="font-semibold text-lg mb-3">Messages</h2>
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search patients..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {filteredPatients.map(patient => (
                        <div
                            key={patient.id}
                            onClick={() => setSelectedPatientId(patient.id)}
                            className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-between ${selectedPatientId === patient.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}`}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold">
                                    {patient.name.charAt(0)}
                                </div>
                                <div>
                                    <h4 className="font-medium text-sm text-gray-900">{patient.name}</h4>
                                    <p className="text-xs text-gray-500 truncate max-w-[150px]">{patient.phone || patient.email}</p>
                                </div>
                            </div>

                            {/* Optional: Show last msg time or unread badge */}
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Content: Chat & Score */}
            <div className="flex-1 flex flex-col gap-4">
                {selectedPatient ? (
                    <>
                        {/* Patient Header / Score Board */}
                        <div className="bg-white p-4 rounded-lg border shadow-sm flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">{selectedPatient.name}</h2>
                                <div className="flex gap-2 text-sm text-gray-500 mt-1">
                                    <span>{selectedPatient.phone}</span>
                                    <span>•</span>
                                    <span>{selectedPatient.email}</span>
                                </div>
                            </div>

                            {/* No Show Score Component */}
                            <NoShowScore score={selectedPatient.noShowScore || 100} />
                        </div>

                        {/* Unified Chat */}
                        <UnifiedChat
                            patientId={selectedPatient.id}
                            doctorId={user?.id || 'd1'} // Fallback if context not ready
                            apiBaseUrl={getApiBaseUrl()}
                        />
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50 rounded-lg border border-dashed">
                        <User className="w-16 h-16 mb-4 opacity-20" />
                        <p>Select a patient to start messaging</p>
                    </div>
                )}
            </div>
        </div>
    );
}
