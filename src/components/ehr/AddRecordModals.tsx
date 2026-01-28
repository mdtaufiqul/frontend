'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle, Activity, Pill, AlertTriangle, FileText, Scale, Ruler, Droplets, Heart, Thermometer, Wind, Save, Calendar, Clock, TrendingUp } from 'lucide-react';
import api from '@/utils/api';
import { toast } from 'sonner';

interface BaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    patientId: string;
    encounterId?: string;
}

// --- ADD VITALS MODAL ---
export const AddVitalsModal: React.FC<BaseModalProps> = ({ isOpen, onClose, onSuccess, patientId, encounterId }) => {
    const [formData, setFormData] = useState({
        weight: '',
        height: '',
        bpSystolic: '',
        bpDiastolic: '',
        heartRate: '',
        temperature: '',
        spO2: '',
        position: 'SITTING',
        method: 'AUTOMATED'
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const data = {
                weight: formData.weight ? parseFloat(formData.weight) : undefined,
                height: formData.height ? parseFloat(formData.height) : undefined,
                bpSystolic: formData.bpSystolic ? parseInt(formData.bpSystolic) : undefined,
                bpDiastolic: formData.bpDiastolic ? parseInt(formData.bpDiastolic) : undefined,
                heartRate: formData.heartRate ? parseInt(formData.heartRate) : undefined,
                temperature: formData.temperature ? parseFloat(formData.temperature) : undefined,
                spO2: formData.spO2 ? parseInt(formData.spO2) : undefined,
                position: formData.position,
                method: formData.method,
                encounterId: encounterId
            };
            await api.post(`/ehr/patients/${patientId}/vitals`, data);
            toast.success('Vitals recorded successfully');
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Failed to save vitals', error);
            toast.error('Failed to save vitals');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <Card className="w-full max-w-lg bg-white shadow-2xl rounded-[2.5rem] overflow-hidden border-none animate-in zoom-in duration-300">
                <div className="p-8">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-100 text-blue-600 p-2 rounded-xl">
                                <Activity size={24} />
                            </div>
                            <h2 className="text-xl font-black text-slate-900">Record Vitals</h2>
                        </div>
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                            <XCircle size={28} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <InputField label="Weight (kg)" icon={Scale} value={formData.weight} onChange={(v) => setFormData({ ...formData, weight: v })} placeholder="70.5" />
                            <InputField label="Height (cm)" icon={Ruler} value={formData.height} onChange={(v) => setFormData({ ...formData, height: v })} placeholder="175" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <InputField label="BP Systolic" icon={Droplets} value={formData.bpSystolic} onChange={(v) => setFormData({ ...formData, bpSystolic: v })} placeholder="120" />
                            <InputField label="BP Diastolic" icon={Droplets} value={formData.bpDiastolic} onChange={(v) => setFormData({ ...formData, bpDiastolic: v })} placeholder="80" />
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <InputField label="HR (bpm)" icon={Heart} value={formData.heartRate} onChange={(v) => setFormData({ ...formData, heartRate: v })} placeholder="72" />
                            <InputField label="Temp (°C)" icon={Thermometer} value={formData.temperature} onChange={(v) => setFormData({ ...formData, temperature: v })} placeholder="36.6" />
                            <InputField label="SpO2 (%)" icon={Wind} value={formData.spO2} onChange={(v) => setFormData({ ...formData, spO2: v })} placeholder="98" />
                        </div>

                        <Button type="submit" disabled={isSubmitting} className="w-full h-14 bg-primary-600 hover:bg-primary-700 text-white font-black rounded-2xl shadow-lg shadow-primary-200">
                            {isSubmitting ? 'Saving...' : 'Save Vitals'}
                        </Button>
                    </form>
                </div>
            </Card>
        </div>
    );
};

// --- ADD MEDICATION MODAL ---
export const AddMedicationModal: React.FC<BaseModalProps> = ({ isOpen, onClose, onSuccess, patientId }) => {
    const [formData, setFormData] = useState({ name: '', dosage: '', frequency: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await api.post(`/ehr/patients/${patientId}/medications`, {
                ...formData,
                encounterId
            });
            toast.success('Medication added to chart');
            onSuccess();
            onClose();
        } catch (error) {
            toast.error('Failed to add medication');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <Card className="w-full max-w-lg bg-white shadow-2xl rounded-[2.5rem] overflow-hidden border-none animate-in zoom-in duration-300">
                <div className="p-8">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="bg-emerald-100 text-emerald-600 p-2 rounded-xl">
                                <Pill size={24} />
                            </div>
                            <h2 className="text-xl font-black text-slate-900">Add Medication</h2>
                        </div>
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                            <XCircle size={28} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <InputField label="Medication Name" icon={Pill} value={formData.name} onChange={(v) => setFormData({ ...formData, name: v })} placeholder="e.g. Lisinopril" required />
                        <InputField label="Dosage" icon={Activity} value={formData.dosage} onChange={(v) => setFormData({ ...formData, dosage: v })} placeholder="e.g. 10mg" required />
                        <InputField label="Frequency" icon={ClockIcon} value={formData.frequency} onChange={(v) => setFormData({ ...formData, frequency: v })} placeholder="e.g. Once daily" required />

                        <Button type="submit" disabled={isSubmitting} className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl shadow-lg shadow-emerald-200">
                            {isSubmitting ? 'Saving...' : 'Add to Medications'}
                        </Button>
                    </form>
                </div>
            </Card>
        </div>
    );
};

// --- ADD DIAGNOSIS MODAL ---
export const AddDiagnosisModal: React.FC<BaseModalProps> = ({ isOpen, onClose, onSuccess, patientId }) => {
    const [formData, setFormData] = useState({ description: '', code: '', status: 'ACTIVE' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await api.post(`/ehr/patients/${patientId}/diagnoses`, {
                ...formData,
                encounterId
            });
            toast.success('Diagnosis recorded');
            onSuccess();
            onClose();
        } catch (error) {
            toast.error('Failed to save diagnosis');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <Card className="w-full max-w-lg bg-white shadow-2xl rounded-[2.5rem] overflow-hidden border-none animate-in zoom-in duration-300">
                <div className="p-8">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="bg-amber-100 text-amber-600 p-2 rounded-xl">
                                <FileText size={24} />
                            </div>
                            <h2 className="text-xl font-black text-slate-900">Add Diagnosis</h2>
                        </div>
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                            <XCircle size={28} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <InputField label="Condition Description" icon={FileText} value={formData.description} onChange={(v) => setFormData({ ...formData, description: v })} placeholder="e.g. Essential Hypertension" required />
                        <InputField label="ICD-10 Code" icon={BadgeCheck} value={formData.code} onChange={(v) => setFormData({ ...formData, code: v })} placeholder="e.g. I10" required />

                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Status</label>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                            >
                                <option value="ACTIVE">Active</option>
                                <option value="RESOLVED">Resolved</option>
                                <option value="CHRONIC">Chronic</option>
                            </select>
                        </div>

                        <Button type="submit" disabled={isSubmitting} className="w-full h-14 bg-amber-600 hover:bg-amber-700 text-white font-black rounded-2xl shadow-lg shadow-amber-200">
                            {isSubmitting ? 'Saving...' : 'Record Diagnosis'}
                        </Button>
                    </form>
                </div>
            </Card>
        </div>
    );
};

// --- ADD ALLERGY MODAL ---
export const AddAllergyModal: React.FC<BaseModalProps> = ({ isOpen, onClose, onSuccess, patientId }) => {
    const [formData, setFormData] = useState({ substance: '', reaction: '', severity: 'MODERATE' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await api.post(`/ehr/patients/${patientId}/allergies`, {
                ...formData,
                encounterId
            });
            toast.success('Allergy added to record');
            onSuccess();
            onClose();
        } catch (error) {
            toast.error('Failed to save allergy');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <Card className="w-full max-w-lg bg-white shadow-2xl rounded-[2.5rem] overflow-hidden border-none animate-in zoom-in duration-300">
                <div className="p-8">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="bg-red-100 text-red-600 p-2 rounded-xl">
                                <AlertTriangle size={24} />
                            </div>
                            <h2 className="text-xl font-black text-slate-900">Add Allergy</h2>
                        </div>
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                            <XCircle size={28} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <InputField label="Substance / Allergen" icon={AlertTriangle} value={formData.substance} onChange={(v) => setFormData({ ...formData, substance: v })} placeholder="e.g. Penicillin" required />
                        <InputField label="Reaction" icon={Activity} value={formData.reaction} onChange={(v) => setFormData({ ...formData, reaction: v })} placeholder="e.g. Hives, Anaphylaxis" required />

                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Severity</label>
                            <select
                                value={formData.severity}
                                onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                                className="w-full h-12 bg-red-50 border border-red-100 rounded-xl px-4 text-sm font-bold text-red-700 focus:ring-2 focus:ring-red-500 outline-none transition-all"
                            >
                                <option value="MILD">Mild</option>
                                <option value="MODERATE">Moderate</option>
                                <option value="SEVERE">Severe</option>
                                <option value="CRITICAL">Critical</option>
                            </select>
                        </div>

                        <Button type="submit" disabled={isSubmitting} className="w-full h-14 bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl shadow-lg shadow-red-200">
                            {isSubmitting ? 'Saving...' : 'Add Allergy'}
                        </Button>
                    </form>
                </div>
            </Card>
        </div>
    );
};

// --- VITALS HISTORY MODAL ---
interface HistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    patientId: string;
    type: string;
    label: string;
    color: string;
}

export const VitalsHistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose, patientId, type, label, color }) => {
    const [history, setHistory] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchHistory = async () => {
        setIsLoading(true);
        try {
            const res = await api.get(`/ehr/patients/${patientId}/observations/history/${type}?limit=20`);
            setHistory(res.data || []);
        } catch (error) {
            console.error('Failed to fetch history', error);
        } finally {
            setIsLoading(false);
        }
    };

    React.useEffect(() => {
        if (isOpen) fetchHistory();
    }, [isOpen, type]);

    if (!isOpen) return null;

    const values = history.map(h => {
        if (type === 'blood_pressure') return h.systolic || 0;
        return parseFloat(h.value) || 0;
    });

    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const range = max - min || 1;
    const padding = range * 0.2;

    const points = values.length > 1 ? values.map((v, i) => {
        const x = (i / (values.length - 1)) * 100;
        const y = 80 - ((v - (min - padding)) / (range + padding * 2)) * 80;
        return `${x},${y}`;
    }).join(' ') : "";

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
            <Card className="w-full max-w-2xl bg-white shadow-2xl rounded-[2.5rem] overflow-hidden border-none animate-in zoom-in duration-300">
                <div className="p-8">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl" style={{ backgroundColor: `${color}10`, color: color }}>
                                <TrendingUp size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-slate-900">{label} History</h2>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Longitudinal Clinical View</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                            <XCircle size={28} className="text-slate-300 hover:text-slate-500" />
                        </button>
                    </div>

                    <div className="space-y-6">
                        {/* Chart Area */}
                        <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 relative h-64 flex items-center justify-center">
                            {isLoading ? (
                                <div className="text-slate-400 font-bold text-xs uppercase animate-pulse">Fetching Data...</div>
                            ) : history.length > 1 ? (
                                <div className="w-full h-full pt-10 pb-6 px-4">
                                    <svg viewBox="0 0 100 80" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                                        {/* Grid Lines */}
                                        <line x1="0" y1="0" x2="100" y2="0" stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="2" />
                                        <line x1="0" y1="40" x2="100" y2="40" stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="2" />
                                        <line x1="0" y1="80" x2="100" y2="80" stroke="#e2e8f0" strokeWidth="1" />

                                        {/* Line */}
                                        <polyline
                                            fill="none"
                                            stroke={color}
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            points={points}
                                            className="drop-shadow-sm"
                                        />

                                        {/* Data Points */}
                                        {values.map((v, i) => {
                                            const x = (i / (values.length - 1)) * 100;
                                            const y = 80 - ((v - (min - padding)) / (range + padding * 2)) * 80;
                                            return (
                                                <circle key={i} cx={x} cy={y} r="1.5" fill="white" stroke={color} strokeWidth="1" />
                                            );
                                        })}
                                    </svg>
                                    <div className="flex justify-between mt-4">
                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Earliest</span>
                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Latest</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-slate-400 font-bold text-xs uppercase">Insufficent data for charting</div>
                            )}
                        </div>

                        {/* Data List */}
                        <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                            {history.length > 0 ? [...history].reverse().map((h, i) => (
                                <div key={i} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100 hover:border-primary-100 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-100">
                                            <Calendar size={14} className="text-slate-400" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-slate-900">
                                                {type === 'blood_pressure' ? `${h.systolic}/${h.diastolic} mmHg` : `${h.value} ${h.unit || ''}`}
                                            </p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <Clock size={10} className="text-slate-400" />
                                                <p className="text-[10px] font-bold text-slate-500 uppercase">
                                                    {new Date(h.recordedAt).toLocaleDateString()} at {new Date(h.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    {h.encounterId && (
                                        <div className="bg-primary-50 text-primary-600 px-2.5 py-1 rounded-lg">
                                            <p className="text-[8px] font-black uppercase tracking-widest">Encounter Linked</p>
                                        </div>
                                    )}
                                </div>
                            )) : !isLoading && (
                                <div className="text-center py-8 text-slate-400 text-xs font-bold uppercase">No records found</div>
                            )}
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
};

// --- UTILITIES ---
const ClockIcon = ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
);

const BadgeCheck = ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3 6 7.3 1-5.3 5.2 1.2 7.3-6.2-3.3-6.2 3.3 1.2-7.3-5.3-5.2 7.3-1 3-6z" /></svg>
);

const InputField = ({ label, icon: Icon, value, onChange, placeholder, required = false, type = 'text' }: { label: string, icon: any, value: string, onChange: (v: string) => void, placeholder?: string, required?: boolean, type?: string }) => (
    <div>
        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{label}</label>
        <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <Icon size={18} />
            </div>
            <input
                type={type}
                required={required}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl pl-12 pr-4 text-sm font-bold text-slate-900 placeholder:text-slate-300 focus:ring-2 focus:ring-primary-500 outline-none transition-all"
            />
        </div>
    </div>
);
