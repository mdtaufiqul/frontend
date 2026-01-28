'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, ChevronRight, Stethoscope, User, Calendar, History, ClipboardCheck } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';

export default function PublicIntakePage() {
    const params = useParams();
    const token = params.token as string;
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [sessionData, setSessionData] = useState<any>(null);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [step, setStep] = useState(1);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchSession = async () => {
            try {
                const res = await apiGet(`/forms/intake-session/${token}`);
                setSessionData(res);

                // Initialize form data with patient info if available
                if (res.session?.patient) {
                    setFormData({
                        'patient-name': res.session.patient.name,
                        'patient-email': res.session.patient.email,
                        'patient-phone': res.session.patient.phone,
                    });
                }
            } catch (err: any) {
                console.error('Failed to fetch intake session:', err);
                setError(err.message || 'Invalid or expired magic link');
            } finally {
                setLoading(false);
            }
        };

        if (token) {
            fetchSession();
        }
    }, [token]);

    const handleInputChange = (fieldId: string, value: any) => {
        setFormData(prev => ({ ...prev, [fieldId]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);

        try {
            const formId = sessionData.form.id;
            await apiPost(`/forms/${formId}/submissions`, {
                sessionToken: token,
                ...formData
            });
            setSubmitted(true);
        } catch (err: any) {
            console.error('Submission failed:', err);
            setError(err.message || 'Failed to submit form. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center space-y-4">
                    <Spinner size="lg" className="mx-auto text-primary-600" />
                    <p className="text-slate-500 font-medium">Loading medical intake form...</p>
                </div>
            </div>
        );
    }

    if (error && !sessionData) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <Card className="max-w-md w-full p-8 text-center space-y-6 shadow-xl border-none">
                    <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
                        <History size={32} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Link Expired</h1>
                        <p className="text-slate-500 mt-2">
                            This intake link is no longer valid or has already been used. Please contact your clinic for a new link.
                        </p>
                    </div>
                    <Button onClick={() => window.location.reload()} variant="outline" className="w-full">
                        Try Again
                    </Button>
                </Card>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <Card className="max-w-md w-full p-8 text-center space-y-6 shadow-xl border-none">
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle2 size={32} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Thank You!</h1>
                        <p className="text-slate-500 mt-2">
                            Your medical intake form has been successfully submitted to <strong>{sessionData?.session?.appointment?.doctor?.name || 'the clinic'}</strong>.
                        </p>
                    </div>
                    <p className="text-sm text-slate-400">
                        You can now close this window.
                    </p>
                </Card>
            </div>
        );
    }

    const patient = sessionData.session.patient;
    const doctor = sessionData.session.appointment?.doctor;
    const formFields = sessionData.form?.fields || [];

    const sections = [
        { id: 1, name: 'Personal Information', icon: User },
        { id: 2, name: 'Medical History', icon: History },
        { id: 3, name: 'Vitals & Measurements', icon: Stethoscope },
        { id: 4, name: 'Review & Submit', icon: ClipboardCheck },
    ];

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white">
                            <Stethoscope size={18} />
                        </div>
                        <span className="font-bold text-slate-900 hidden sm:inline">MediFlow Intake</span>
                    </div>
                    <Badge variant="outline" className="text-slate-500 border-slate-200 font-medium">
                        Secure Patient Form
                    </Badge>
                </div>
            </div>

            <main className="max-w-3xl mx-auto px-4 pt-8">
                {/* Intro Card */}
                <Card className="p-6 mb-8 border-none shadow-sm bg-gradient-to-br from-primary-600 to-primary-700 text-white">
                    <h1 className="text-2xl font-bold mb-2">Hello, {patient.name}</h1>
                    <p className="text-primary-100">
                        Please complete this medical intake form before your appointment with <strong>Dr. {doctor?.name || 'your physician'}</strong>. This information will help us provide the best care.
                    </p>
                </Card>

                {/* Progress Tracks */}
                <div className="flex justify-between items-center mb-10 px-2">
                    {sections.map((s, idx) => (
                        <div key={s.id} className="flex items-center flex-1 last:flex-none">
                            <div
                                className={`flex flex-col items-center gap-2 relative z-10`}
                                onClick={() => step > s.id && setStep(s.id)}
                            >
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${step === s.id ? 'bg-primary-600 text-white shadow-lg ring-4 ring-primary-100' :
                                    step > s.id ? 'bg-green-500 text-white' : 'bg-white text-slate-300 border border-slate-200'
                                    }`}>
                                    {step > s.id ? <CheckCircle2 size={20} /> : <s.icon size={20} />}
                                </div>
                                <span className={`text-[10px] font-bold uppercase tracking-wider hidden sm:block ${step === s.id ? 'text-primary-600' : 'text-slate-400'
                                    }`}>
                                    {s.name.split(' ')[0]}
                                </span>
                            </div>
                            {idx < sections.length - 1 && (
                                <div className={`h-[2px] flex-1 mx-2 ${step > s.id ? 'bg-green-500' : 'bg-slate-200'
                                    }`} />
                            )}
                        </div>
                    ))}
                </div>

                <form onSubmit={handleSubmit}>
                    {step === 1 && (
                        <Card className="p-8 shadow-xl border-none space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="space-y-1">
                                <h2 className="text-xl font-bold text-slate-900">Personal Information</h2>
                                <p className="text-sm text-slate-500">Verify your contact details for our records.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Full Name</Label>
                                    <Input
                                        id="name"
                                        value={formData['patient-name'] || ''}
                                        onChange={(e) => handleInputChange('patient-name', e.target.value)}
                                        placeholder="Enter your full name"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email Address</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={formData['patient-email'] || ''}
                                        onChange={(e) => handleInputChange('patient-email', e.target.value)}
                                        placeholder="email@example.com"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Phone Number</Label>
                                    <Input
                                        id="phone"
                                        value={formData['patient-phone'] || ''}
                                        onChange={(e) => handleInputChange('patient-phone', e.target.value)}
                                        placeholder="+1 (555) 000-0000"
                                        required
                                    />
                                </div>
                            </div>

                            <Button type="button" onClick={() => setStep(2)} className="w-full h-12 rounded-xl text-lg font-bold gap-2">
                                Next Step
                                <ChevronRight size={20} />
                            </Button>
                        </Card>
                    )}

                    {step === 2 && (
                        <Card className="p-8 shadow-xl border-none space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="space-y-1">
                                <h2 className="text-xl font-bold text-slate-900">Medical History</h2>
                                <p className="text-sm text-slate-500">Provide details about your health history and current medications.</p>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="intake-allergies">Allergies</Label>
                                    <Input
                                        id="intake-allergies"
                                        value={formData['intake-allergies'] || ''}
                                        onChange={(e) => handleInputChange('intake-allergies', e.target.value)}
                                        placeholder="Pollen, Penicillin, Peanuts (comma separated)"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="intake-meds">Current Medications</Label>
                                    <Input
                                        id="intake-meds"
                                        value={formData['intake-meds'] || ''}
                                        onChange={(e) => handleInputChange('intake-meds', e.target.value)}
                                        placeholder="Lisinopril 10mg, Aspirin (comma separated)"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="intake-hist">General Medical History</Label>
                                    <textarea
                                        id="intake-hist"
                                        className="w-full min-h-[100px] p-3 rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                                        value={formData['intake-hist'] || ''}
                                        onChange={(e) => handleInputChange('intake-hist', e.target.value)}
                                        placeholder="Past surgeries, chronic conditions, etc."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="intake-surg">Surgical History</Label>
                                    <textarea
                                        id="intake-surg"
                                        className="w-full min-h-[80px] p-3 rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                                        value={formData['intake-surg'] || ''}
                                        onChange={(e) => handleInputChange('intake-surg', e.target.value)}
                                        placeholder="Any major surgeries in the past..."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="intake-family">Family Medical History</Label>
                                    <textarea
                                        id="intake-family"
                                        className="w-full min-h-[80px] p-3 rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                                        value={formData['intake-family'] || ''}
                                        onChange={(e) => handleInputChange('intake-family', e.target.value)}
                                        placeholder="History of diabetes, heart disease, etc. in family"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1 h-12 rounded-xl">Back</Button>
                                <Button type="button" onClick={() => setStep(3)} className="flex-[2] h-12 rounded-xl text-lg font-bold">Next Step</Button>
                            </div>
                        </Card>
                    )}

                    {step === 3 && (
                        <Card className="p-8 shadow-xl border-none space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="space-y-1">
                                <h2 className="text-xl font-bold text-slate-900">Vitals & Measurements</h2>
                                <p className="text-sm text-slate-500">Known vitals (Optional, if you have recently measured them).</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="intake-temp">Temperature (Celsius)</Label>
                                    <Input
                                        id="intake-temp"
                                        placeholder="36.5"
                                        value={formData['intake-temp'] || ''}
                                        onChange={(e) => handleInputChange('intake-temp', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="intake-bp">Blood Pressure (Systolic/Diastolic)</Label>
                                    <Input
                                        id="intake-bp"
                                        placeholder="120/80"
                                        value={formData['intake-bp'] || ''}
                                        onChange={(e) => handleInputChange('intake-bp', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="intake-hr">Heart Rate (BPM)</Label>
                                    <Input
                                        id="intake-hr"
                                        placeholder="72"
                                        value={formData['intake-hr'] || ''}
                                        onChange={(e) => handleInputChange('intake-hr', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <Button type="button" variant="outline" onClick={() => setStep(2)} className="flex-1 h-12 rounded-xl">Back</Button>
                                <Button type="button" onClick={() => setStep(4)} className="flex-[2] h-12 rounded-xl text-lg font-bold">Review</Button>
                            </div>
                        </Card>
                    )}

                    {step === 4 && (
                        <Card className="p-8 shadow-xl border-none space-y-6 animate-in fade-in zoom-in-95 duration-500 text-center">
                            <div className="w-20 h-20 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center mx-auto mb-2">
                                <ClipboardCheck size={40} />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-2xl font-bold text-slate-900">Ready to Submit?</h2>
                                <p className="text-slate-500">
                                    Please verify that the information you provided is accurate to the best of your knowledge.
                                </p>
                            </div>

                            <div className="p-4 bg-slate-50 rounded-xl text-left text-sm space-y-2 border border-slate-100">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Patient:</span>
                                    <span className="font-bold">{formData['patient-name']}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Contact:</span>
                                    <span className="font-bold">{formData['patient-phone']}</span>
                                </div>
                                <div className="flex justify-between border-t border-slate-200 pt-2 pb-1">
                                    <span className="text-slate-500 font-medium">History:</span>
                                </div>
                                <p className="text-slate-700 italic">
                                    {formData['intake-hist'] ? formData['intake-hist'].substring(0, 100) + '...' : 'No medical history provided.'}
                                </p>
                            </div>

                            <div className="flex flex-col gap-3 pt-4">
                                <Button
                                    type="submit"
                                    className="w-full h-14 rounded-xl text-xl font-bold shadow-lg shadow-primary-200"
                                    disabled={submitting}
                                >
                                    {submitting ? <Spinner size="sm" className="mr-2" /> : null}
                                    Submit Medical Intake
                                </Button>
                                <Button type="button" variant="ghost" onClick={() => setStep(3)} className="text-slate-500">
                                    I need to make changes
                                </Button>
                            </div>

                            {error && <p className="text-red-500 text-sm font-medium">{error}</p>}
                        </Card>
                    )}
                </form>
            </main>

            {/* Footer */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 py-3 text-center">
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                    Powered by MediFlow Secure Systems
                </p>
            </div>
        </div>
    );
}
