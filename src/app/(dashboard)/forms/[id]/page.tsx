"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useParams, useRouter } from 'next/navigation';
import FormBuilder from '@/components/forms/FormBuilder';
import SubmissionList from '@/components/forms/SubmissionList';
import { FormConfig } from '@/components/forms/FormRenderer';
import { toast } from 'sonner';
import api from '@/utils/api';
import { useAuth } from '@/context/AuthContext';

// Mock Data for demo purposes
const MOCK_FORMS: Record<string, FormConfig> = {
    '1': {
        title: 'Scheduling Form',
        fields: [
            { id: 'f1', type: 'header', label: 'Patient Information', required: false, width: 'full' },
            { id: 'f2', type: 'text', label: 'Full Name', required: true, width: 'full' },
            { id: 'f3', type: 'text', label: 'Email', required: true, width: 'half' },
            { id: 'f4', type: 'text', label: 'Phone', required: true, width: 'half' },
            { id: 'f5', type: 'service_selection', label: 'Select Service', required: true, width: 'full', options: [] }, // Options will be filled by builder
        ]
    },
    '2': {
        title: 'Intake Form',
        fields: [
            { id: 'f1', type: 'header', label: 'Medical History', required: false, width: 'full' },
            { id: 'f2', type: 'textarea', label: 'Current Medications', required: false, width: 'full' },
            { id: 'f3', type: 'checkbox', label: 'Conditions', required: false, width: 'full', options: ['Diabetes', 'Hypertension', 'Asthma'] },
        ]
    }
};

const EditFormPage = () => {
    const { user } = useAuth();
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    const [form, setForm] = useState<{ id: string; status: string; config: FormConfig; type: string; isActive: boolean } | null>(null);

    useEffect(() => {
        const fetchForm = async () => {
            try {
                const response = await api.get(`/forms/${id}`);
                const fetchedConfig = response.data.config || { title: response.data.title, steps: [] };
                fetchedConfig.title = response.data.title; // Sync title

                setForm({
                    id: response.data.id,
                    status: response.data.status,
                    config: fetchedConfig,
                    type: response.data.type || 'CUSTOM',
                    isActive: response.data.isActive || false
                });
            } catch (error: any) {
                console.error("Failed to load form:", error);
                console.error("Error Response:", error.response?.data);
                console.error("Error Status:", error.response?.status);
                toast.error(`Could not load form data: ${error.response?.status || error.message}`);
            }
        };

        if (id) fetchForm();
    }, [id]);

    const handleSave = async (newConfig: FormConfig, status: 'draft' | 'published' = 'draft') => {
        if (!form) return;
        try {
            const payload = {
                title: newConfig.title,
                description: newConfig.steps?.length ? `${newConfig.steps.length} Step Form` : 'Form',
                status: status,
                config: newConfig,
                type: form.type,
                isActive: form.type === 'BOOKING' && status === 'published',
                clinicId: user?.clinicId
            };

            const response = await api.patch(`/forms/${id}`, payload);

            // Update local state with server response to ensure persistence
            setForm({
                ...form,
                id: response.data.id,
                status: response.data.status,
                config: response.data.config || newConfig
            });

            toast.success(`Form ${status === 'published' ? 'published' : 'saved'} successfully!`);
        } catch (error) {
            console.error("Failed to update form:", error);
            toast.error("Failed to update form");
        }
    };

    const [activeTab, setActiveTab] = useState<'editor' | 'submissions'>('editor');

    if (!form) return <div className="p-8">Loading...</div>;

    return (
        <div className="h-[calc(100vh-80px)] flex flex-col">
            <div className="mb-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <Link href="/forms">
                        <Button variant="outline" size="icon" className="h-9 w-9 border-slate-200">
                            <ArrowLeft size={16} />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Edit Form</h1>
                        <p className="text-slate-500 text-sm">Update your form configuration.</p>
                    </div>
                </div>
                {/* Tab Switcher */}
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab('editor')}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'editor' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                        Editor
                    </button>
                    <button
                        onClick={() => setActiveTab('submissions')}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'submissions' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                        Submissions
                    </button>
                </div>
            </div>

            {activeTab === 'editor' ? (
                <div className="flex-1 overflow-hidden">
                    <FormBuilder
                        initialConfig={form.config}
                        initialStatus={form.status as any}
                        onSave={handleSave}
                        formId={form.id}
                        formType={form.type as any}
                    />
                </div>
            ) : (
                <div className="flex-1 overflow-auto bg-white rounded-xl border border-slate-200 p-6">
                    <h2 className="text-lg font-bold mb-4">Form Submissions</h2>
                    <SubmissionList formId={form.id} />
                </div>
            )}
        </div>
    );
};

export default EditFormPage;
