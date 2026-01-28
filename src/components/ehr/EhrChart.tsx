'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Badge from '@/components/ui/badge';
import clsx from 'clsx';
import { Activity, Pill, AlertTriangle, FileText, Plus, Thermometer, Droplets, Heart, Wind, Scale, Ruler, XCircle, Mic, Square, MessageSquare, Bot, Zap, RotateCcw, CheckCircle2, Headphones, Save, Lock } from 'lucide-react';
import api from '@/utils/api';
import { toast } from 'sonner';
import { SoapNoteEditor } from './SoapNoteEditor';
import { AddVitalsModal, AddMedicationModal, AddDiagnosisModal, AddAllergyModal, VitalsHistoryModal } from './AddRecordModals';

interface EhrChartProps {
    patientId: string;
    onNewEncounter?: () => void;
    onEditEncounter?: (encounter: any) => void;
    refreshKey?: number;
}

export const EhrChart: React.FC<EhrChartProps> = ({ patientId, onNewEncounter, onEditEncounter, refreshKey = 0 }) => {
    const [vitals, setVitals] = useState<any[]>([]);
    const [medications, setMedications] = useState<any[]>([]);
    const [diagnoses, setDiagnoses] = useState<any[]>([]);
    const [allergies, setAllergies] = useState<any[]>([]);
    const [encounters, setEncounters] = useState<any[]>([]);
    const [history, setHistory] = useState<Record<string, any[]>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isVitalsModalOpen, setIsVitalsModalOpen] = useState(false);
    const [isMedicationModalOpen, setIsMedicationModalOpen] = useState(false);
    const [isDiagnosisModalOpen, setIsDiagnosisModalOpen] = useState(false);
    const [isAllergyModalOpen, setIsAllergyModalOpen] = useState(false);
    const [historyModal, setHistoryModal] = useState<{ isOpen: boolean; type: string; label: string; color: string }>({
        isOpen: false,
        type: '',
        label: '',
        color: ''
    });

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [oRes, mRes, dRes, aRes, eRes] = await Promise.all([
                api.get(`/ehr/patients/${patientId}/observations/latest`).catch(() => ({ data: [] })),
                api.get(`/ehr/patients/${patientId}/medications`).catch(() => ({ data: [] })),
                api.get(`/ehr/patients/${patientId}/diagnoses`).catch(() => ({ data: [] })),
                api.get(`/ehr/patients/${patientId}/allergies`).catch(() => ({ data: [] })),
                api.get(`/ehr/patients/${patientId}/encounters`).catch(() => ({ data: [] }))
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

            setVitals([obsMap]);
            setMedications(mRes.data || []);
            setDiagnoses(dRes.data || []);
            setAllergies(aRes.data || []);
            setEncounters(eRes.data || []);

            // Fetch history for sparklines
            const types = ['weight', 'blood_pressure', 'heart_rate', 'temperature', 'spo2'];
            const historyData: Record<string, any[]> = {};
            await Promise.all(types.map(async (type) => {
                const res = await api.get(`/ehr/patients/${patientId}/observations/history/${type}?limit=10`).catch(() => ({ data: [] }));
                historyData[type] = res.data.reverse(); // Chronological for chart
            }));
            setHistory(historyData);
        } catch (error) {
            console.error('Failed to fetch EHR data', error);
            toast.error('Failed to load clinical record');
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyMedication = async (id: string) => {
        try {
            await api.patch(`/ehr/medications/${id}`, { status: 'ACTIVE' });
            toast.success('Medication verified');
            fetchData();
        } catch (err) {
            toast.error('Failed to verify medication');
        }
    };

    const handleVerifyAllergy = async (id: string) => {
        try {
            await api.patch(`/ehr/allergies/${id}`, { status: 'ACTIVE' });
            toast.success('Allergy verified');
            fetchData();
        } catch (err) {
            toast.error('Failed to verify allergy');
        }
    };

    useEffect(() => {
        if (patientId) fetchData();
    }, [patientId, refreshKey]);

    const latestVitals = vitals[0] || {};

    return (
        <div className="space-y-6">
            {/* Vitals Summary Grid */}
            <div className="relative group/vitals">
                <Button
                    onClick={() => setIsVitalsModalOpen(true)}
                    className="absolute -top-3 -right-3 z-10 w-8 h-8 rounded-full bg-primary-600 text-white shadow-lg opacity-0 group-hover/vitals:opacity-100 transition-all hover:scale-110"
                >
                    <Plus size={16} />
                </Button>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {[
                        { label: 'Weight', type: 'weight', value: latestVitals.weight ? `${latestVitals.weight}kg` : '--', icon: Scale, color: 'text-blue-600', bg: 'bg-blue-50', sparkColor: '#2563eb' },
                        { label: 'Height', type: 'height', value: latestVitals.height ? `${latestVitals.height}cm` : '--', icon: Ruler, color: 'text-slate-600', bg: 'bg-slate-50', sparkColor: '#475569' },
                        { label: 'BP', type: 'blood_pressure', value: latestVitals.bpSystolic ? `${latestVitals.bpSystolic}/${latestVitals.bpDiastolic}` : '--', icon: Droplets, color: 'text-red-600', bg: 'bg-red-50', sparkColor: '#dc2626' },
                        { label: 'HR', type: 'heart_rate', value: latestVitals.heartRate ? `${latestVitals.heartRate} bpm` : '--', icon: Heart, color: 'text-rose-600', bg: 'bg-rose-50', sparkColor: '#e11d48' },
                        { label: 'Temp', type: 'temperature', value: latestVitals.temperature ? `${latestVitals.temperature}°C` : '--', icon: Thermometer, color: 'text-orange-600', bg: 'bg-orange-50', sparkColor: '#ea580c' },
                        { label: 'SpO2', type: 'spo2', value: latestVitals.spO2 ? `${latestVitals.spO2}%` : '--', icon: Wind, color: 'text-cyan-600', bg: 'bg-cyan-50', sparkColor: '#0891b2' },
                    ].map((item, idx) => (
                        <Card
                            key={idx}
                            onClick={() => setHistoryModal({ isOpen: true, type: item.type, label: item.label, color: item.sparkColor })}
                            className="p-4 flex flex-col items-center justify-center text-center space-y-2 border-slate-100 hover:border-primary-200 transition-all shadow-sm overflow-hidden relative cursor-pointer active:scale-95 hover:shadow-md"
                        >
                            <div className={`${item.bg} ${item.color} p-2 rounded-xl`}>
                                <item.icon size={20} />
                            </div>
                            <div className="z-10">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{item.label}</p>
                                <p className="text-sm font-black text-slate-900">{item.value}</p>
                            </div>
                            {/* Sparkline */}
                            <div className="absolute bottom-0 left-0 right-0 h-8 opacity-50">
                                <Sparkline data={history[item.type] || []} color={item.sparkColor} />
                            </div>
                        </Card>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Active Medications */}
                <Card className="p-6 border-primary-50">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <div className="bg-primary-100 text-primary-600 p-2 rounded-xl">
                                <Pill size={18} />
                            </div>
                            <h3 className="font-bold text-slate-900">Active Medications</h3>
                        </div>
                        <Button
                            onClick={() => setIsMedicationModalOpen(true)}
                            variant="ghost"
                            size="sm"
                            className="rounded-xl h-8 text-[10px] font-bold uppercase tracking-wider text-primary-600"
                        >
                            <Plus size={14} className="mr-1" /> Add Medication
                        </Button>
                    </div>

                    <div className="space-y-3">
                        {medications.length > 0 ? medications.map((med) => (
                            <div key={med.id} className={clsx(
                                "flex items-center justify-between p-3 rounded-xl group transition-all",
                                med.status === 'DRAFT'
                                    ? "bg-amber-50/50 border border-dashed border-amber-200"
                                    : "bg-slate-50 border border-slate-100 hover:border-primary-100"
                            )}>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-bold text-slate-900">{med.name}</p>
                                        {med.status === 'DRAFT' && <Badge variant="warning" className="text-[8px] h-4">Intake Proposed</Badge>}
                                    </div>
                                    <p className="text-[10px] text-slate-500 font-medium">{med.dosage} • {med.frequency}</p>
                                </div>
                                {med.status === 'DRAFT' ? (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 text-[10px] font-bold border-amber-200 text-amber-700 bg-white hover:bg-amber-100"
                                        onClick={() => handleVerifyMedication(med.id)}
                                    >
                                        Verify
                                    </Button>
                                ) : (
                                    <Badge variant="primary" className="bg-primary-100 text-primary-700 font-bold border-none">Active</Badge>
                                )}
                            </div>
                        )) : (
                            <div className="text-center py-8 text-slate-400">
                                <p className="text-xs font-medium">No active medications listed.</p>
                            </div>
                        )}
                    </div>
                </Card>

                {/* Chronic Conditions / Diagnoses */}
                <Card className="p-6 border-slate-100">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <div className="bg-slate-100 text-slate-600 p-2 rounded-xl">
                                <FileText size={18} />
                            </div>
                            <h3 className="font-bold text-slate-900">Conditions & Diagnoses</h3>
                        </div>
                        <Button
                            onClick={() => setIsDiagnosisModalOpen(true)}
                            variant="ghost"
                            size="sm"
                            className="rounded-xl h-8 text-[10px] font-bold uppercase tracking-wider text-slate-600"
                        >
                            <Plus size={14} className="mr-1" /> Add Diagnosis
                        </Button>
                    </div>

                    <div className="space-y-3">
                        {diagnoses.length > 0 ? diagnoses.map((diag) => (
                            <div key={diag.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                                <div className="flex items-center justify-between mb-1">
                                    <p className="text-sm font-bold text-slate-900">{diag.description}</p>
                                    <Badge variant="neutral" className="text-[9px] font-bold uppercase tracking-widest">{diag.code}</Badge>
                                </div>
                                <p className="text-[10px] text-slate-500 font-bold uppercase">{diag.status}</p>
                            </div>
                        )) : (
                            <div className="text-center py-8 text-slate-400">
                                <p className="text-xs font-medium">No recorded conditions.</p>
                            </div>
                        )}
                    </div>
                </Card>

                {/* Allergies & Risks */}
                <Card className="p-6 border-red-50">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <div className="bg-red-100 text-red-600 p-2 rounded-xl">
                                <AlertTriangle size={18} />
                            </div>
                            <h3 className="font-bold text-slate-900 text-red-950">Allergies & Sensitivities</h3>
                        </div>
                        <Button
                            onClick={() => setIsAllergyModalOpen(true)}
                            variant="ghost"
                            size="sm"
                            className="rounded-xl h-8 text-[10px] font-bold uppercase tracking-wider text-red-600"
                        >
                            <Plus size={14} className="mr-1" /> Add Allergy
                        </Button>
                    </div>

                    <div className="space-y-3">
                        {allergies.length > 0 ? allergies.map((all) => (
                            <div key={all.id} className={clsx(
                                "p-3 rounded-xl flex items-center justify-between transition-all",
                                all.status === 'DRAFT'
                                    ? "bg-amber-50/50 border border-dashed border-amber-200"
                                    : "bg-red-50/30 border border-red-100"
                            )}>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className={clsx("text-sm font-bold", all.status === 'DRAFT' ? "text-slate-900" : "text-red-900")}>{all.name || all.substance}</p>
                                        {all.status === 'DRAFT' && <Badge variant="warning" className="text-[8px] h-4">Intake Proposed</Badge>}
                                    </div>
                                    <p className={clsx("text-[10px] font-medium", all.status === 'DRAFT' ? "text-slate-500" : "text-red-600")}>Reaction: {all.reaction}</p>
                                </div>
                                {all.status === 'DRAFT' ? (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 text-[10px] font-bold border-amber-200 text-amber-700 bg-white hover:bg-amber-100"
                                        onClick={() => handleVerifyAllergy(all.id)}
                                    >
                                        Verify
                                    </Button>
                                ) : (
                                    <Badge className="bg-red-600 text-white font-bold border-none text-[9px] uppercase">{all.severity}</Badge>
                                )}
                            </div>
                        )) : (
                            <div className="text-center py-8 text-slate-400">
                                <p className="text-xs font-medium">No allergies recorded.</p>
                            </div>
                        )}
                    </div>
                </Card>

                {/* Longitudinal Encounters */}
                <Card className="p-6 border-slate-100">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <div className="bg-slate-100 text-slate-600 p-2 rounded-xl">
                                <Activity size={18} />
                            </div>
                            <h3 className="font-bold text-slate-900">Longitudinal Encounters</h3>
                        </div>
                        <Button
                            onClick={() => onNewEncounter?.()}
                            variant="ghost"
                            size="sm"
                            className="rounded-xl h-8 text-[10px] font-bold uppercase tracking-wider text-primary-600"
                        >
                            <Plus size={14} className="mr-1" /> New Encounter
                        </Button>
                    </div>

                    <div className="space-y-3">
                        {encounters.length > 0 ? encounters.map((enc: any) => (
                            <div
                                key={enc.id}
                                onClick={() => onEditEncounter?.(enc)}
                                className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl hover:border-primary-100 transition-all cursor-pointer group"
                            >
                                <div>
                                    <p className="text-sm font-bold text-slate-900 group-hover:text-primary-600 transition-colors">
                                        {new Date(enc.recordedAt).toLocaleDateString()} Encounter
                                    </p>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{enc.type}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge className={enc.status === 'FINALIZED' ? "bg-emerald-100 text-emerald-700 border-none font-black text-[9px] uppercase" : "bg-amber-100 text-amber-700 border-none font-black text-[9px] uppercase"}>
                                        {enc.status}
                                    </Badge>
                                </div>
                            </div>
                        )) : (
                            <div className="text-center py-8 text-slate-400">
                                <p className="text-xs font-medium">No recorded encounters.</p>
                            </div>
                        )}
                    </div>
                </Card>
            </div>


            <AddVitalsModal
                isOpen={isVitalsModalOpen}
                onClose={() => setIsVitalsModalOpen(false)}
                onSuccess={fetchData}
                patientId={patientId}
            />
            <AddMedicationModal
                isOpen={isMedicationModalOpen}
                onClose={() => setIsMedicationModalOpen(false)}
                onSuccess={fetchData}
                patientId={patientId}
            />
            <AddDiagnosisModal
                isOpen={isDiagnosisModalOpen}
                onClose={() => setIsDiagnosisModalOpen(false)}
                onSuccess={fetchData}
                patientId={patientId}
            />
            <AddAllergyModal
                isOpen={isAllergyModalOpen}
                onClose={() => setIsAllergyModalOpen(false)}
                onSuccess={fetchData}
                patientId={patientId}
            />

            <VitalsHistoryModal
                isOpen={historyModal.isOpen}
                onClose={() => setHistoryModal({ ...historyModal, isOpen: false })}
                patientId={patientId}
                type={historyModal.type}
                label={historyModal.label}
                color={historyModal.color}
            />
        </div>
    );
};

const Sparkline: React.FC<{ data: any[], color: string }> = ({ data, color }) => {
    if (!data || data.length < 2) return null;

    const values = data.map(d => {
        if (d.type === 'blood_pressure') return d.systolic || 0;
        return parseFloat(d.value) || 0;
    });

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const padding = range * 0.1;

    const points = values.map((v, i) => {
        const x = (i / (values.length - 1)) * 100;
        const y = 100 - ((v - (min - padding)) / (range + padding * 2)) * 100;
        return `${x},${y}`;
    }).join(' ');

    return (
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
            <polyline
                fill="none"
                stroke={color}
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points}
            />
        </svg>
    );
};

