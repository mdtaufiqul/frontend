'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import Badge from '@/components/ui/badge';
import { Pill, Activity, Heart, Thermometer, Droplets, Wind, Scale, Ruler, FileText, AlertTriangle } from 'lucide-react';
import api from '@/utils/api';

interface PatientHealthRecordProps {
    patientId: string;
}

export const PatientHealthRecord: React.FC<PatientHealthRecordProps> = ({ patientId }) => {
    const [vitals, setVitals] = useState<any[]>([]);
    const [medications, setMedications] = useState<any[]>([]);
    const [diagnoses, setDiagnoses] = useState<any[]>([]);
    const [allergies, setAllergies] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [oRes, mRes, dRes, aRes] = await Promise.all([
                    api.get(`/ehr/patients/${patientId}/observations/latest`),
                    api.get(`/ehr/patients/${patientId}/medications`),
                    api.get(`/ehr/patients/${patientId}/diagnoses`),
                    api.get(`/ehr/patients/${patientId}/allergies`)
                ]);

                // Map observations back to the flat format the UI expects
                const obsMap: any = {};
                oRes.data.forEach((obs: any) => {
                    if (obs.type === 'blood_pressure') {
                        obsMap.bpSystolic = obs.systolic;
                        obsMap.bpDiastolic = obs.diastolic;
                    } else if (obs.type === 'heart_rate') {
                        obsMap.heartRate = obs.value;
                    } else if (obs.type === 'respiratory_rate') {
                        obsMap.respiratoryRate = obs.value;
                    } else if (obs.type === 'spo2') {
                        obsMap.spO2 = obs.value;
                    } else {
                        obsMap[obs.type] = obs.value;
                    }
                });

                setVitals([obsMap]); // Set as array to keep latestVitals = vitals[0] logic
                setMedications(mRes.data);
                setDiagnoses(dRes.data);
                setAllergies(aRes.data);
            } catch (error) {
                console.error('Failed to fetch patient data', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [patientId]);

    const latestVitals = vitals[0] || {};

    if (isLoading) return <div className="p-8 text-center text-slate-500 font-bold">Loading your health data...</div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Top Vitals Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Weight', value: latestVitals.weight ? `${latestVitals.weight}kg` : '--', icon: Scale, bg: 'bg-blue-50', text: 'text-blue-600' },
                    { label: 'BP', value: latestVitals.bpSystolic ? `${latestVitals.bpSystolic}/${latestVitals.bpDiastolic}` : '--', icon: Droplets, bg: 'bg-red-50', text: 'text-red-600' },
                    { label: 'Heart Rate', value: latestVitals.heartRate ? `${latestVitals.heartRate} bpm` : '--', icon: Heart, bg: 'bg-rose-50', text: 'text-rose-600' },
                    { label: 'SpO2', value: latestVitals.spO2 ? `${latestVitals.spO2}%` : '--', icon: Wind, bg: 'bg-cyan-50', text: 'text-cyan-600' },
                ].map((v, i) => (
                    <Card key={i} className="p-4 border-none shadow-sm flex flex-col items-center justify-center text-center">
                        <div className={`${v.bg} ${v.text} p-2 rounded-xl mb-2`}>
                            <v.icon size={20} />
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{v.label}</p>
                        <p className="text-lg font-black text-slate-900">{v.value}</p>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Medications */}
                <div className="space-y-4">
                    <h3 className="text-lg font-bold flex items-center gap-2 text-slate-900">
                        <Pill className="text-primary-500" /> My Medications
                    </h3>
                    <div className="space-y-3">
                        {medications.length > 0 ? medications.map((m) => (
                            <div key={m.id} className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm flex items-center justify-between">
                                <div>
                                    <p className="font-bold text-slate-900">{m.name}</p>
                                    <p className="text-xs text-slate-500 font-medium">{m.dosage} • {m.frequency}</p>
                                </div>
                                <Badge variant="primary" className="bg-primary-100 text-primary-700 font-bold border-none">Active</Badge>
                            </div>
                        )) : (
                            <p className="text-sm text-slate-400 italic">No medications listed.</p>
                        )}
                    </div>
                </div>

                {/* Conditions */}
                <div className="space-y-4">
                    <h3 className="text-lg font-bold flex items-center gap-2 text-slate-900">
                        <Activity className="text-emerald-500" /> My Conditions
                    </h3>
                    <div className="space-y-3">
                        {diagnoses.length > 0 ? diagnoses.map((d) => (
                            <div key={d.id} className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                                <p className="font-bold text-slate-900">{d.description}</p>
                                <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 tracking-wider">{d.status}</p>
                            </div>
                        )) : (
                            <p className="text-sm text-slate-400 italic">No conditions listed.</p>
                        )}
                    </div>
                </div>

                {/* Allergies */}
                {allergies.length > 0 && (
                    <div className="col-span-1 md:col-span-2 space-y-4">
                        <h3 className="text-lg font-bold flex items-center gap-2 text-red-700">
                            <AlertTriangle className="text-red-500" /> Important: Allergies
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {allergies.map((a) => (
                                <div key={a.id} className="p-4 bg-red-50/50 border border-red-100 rounded-2xl">
                                    <p className="font-bold text-red-900">{a.substance}</p>
                                    <p className="text-xs text-red-600 font-medium">{a.reaction}</p>
                                    <Badge variant="danger" className="mt-2 text-[9px] font-bold uppercase border-none">{a.severity}</Badge>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
