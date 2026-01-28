"use client";

import React, { useState } from 'react';
import FormBuilder from '@/components/forms/FormBuilder';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Layers, FileText, LayoutTemplate, ArrowRight, ArrowLeft, Calendar, UserPlus, Stethoscope } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormConfig } from '@/components/forms/FormRenderer';
import api from '@/utils/api';
import { useAuth } from '@/context/AuthContext';
import { useSearchParams } from 'next/navigation';

type ViewState = 'selection' | 'templates' | 'builder';

const TEMPLATES: { id: string; title: string; description: string; icon: React.ElementType; config: FormConfig }[] = [
    {
        id: 'appointment',
        title: 'Booking Appointment',
        description: 'Standard multi-step wizard for scheduling services.',
        icon: Calendar,
        config: {
            title: 'Book Appointment',
            steps: [
                {
                    id: 'step-1',
                    title: 'Select Service',
                    fields: [
                        { id: 'f-1', type: 'service_selection', label: 'Choose a Service', required: true, width: 'full', options: [] },
                    ]
                },
                {
                    id: 'step-2',
                    title: 'Practitioner',
                    fields: [
                        { id: 'f-2', type: 'practitioner_selection', label: 'Choose a Practitioner', required: true, width: 'full', options: [] },
                    ]
                },
                {
                    id: 'step-3',
                    title: 'Your Details',
                    fields: [
                        { id: 'f-3', type: 'text', label: 'Full Name', required: true, width: 'full' },
                        { id: 'f-4', type: 'text', label: 'Email', required: true, width: 'half' },
                        { id: 'f-5', type: 'text', label: 'Phone', required: true, width: 'half' },
                    ]
                }
            ]
        }
    },
    {
        id: 'intake',
        title: 'Patient Intake',
        description: 'Collect medical history and consent before visits.',
        icon: UserPlus,
        config: {
            title: 'Patient Intake Form',
            steps: [
                {
                    id: 'step-1',
                    title: 'Personal Info',
                    fields: [
                        { id: 't-1', type: 'text', label: 'Full Name', required: true, width: 'full' },
                        { id: 't-2', type: 'date', label: 'Date of Birth', required: true, width: 'half' },
                        { id: 't-3', type: 'select', label: 'Gender', required: true, width: 'half', options: ['Male', 'Female', 'Other'] },
                    ]
                },
                {
                    id: 'step-2',
                    title: 'Medical History',
                    fields: [
                        { id: 't-4', type: 'textarea', label: 'Current Medications', required: false, width: 'full' },
                        { id: 't-5', type: 'textarea', label: 'Allergies', required: false, width: 'full' },
                        { id: 't-6', type: 'checkbox', label: 'Have you had surgery in the past?', required: false, width: 'full', options: ['Yes', 'No'] },
                    ]
                }
            ]
        }
    },
    {
        id: 'contact',
        title: 'Contact Us',
        description: 'Simple single-page contact form for general inquiries.',
        icon: Stethoscope,
        config: {
            title: 'Contact Form',
            steps: [
                {
                    id: 'step-1',
                    title: 'Details',
                    fields: [
                        { id: 'c-1', type: 'text', label: 'Name', required: true, width: 'full' },
                        { id: 'c-2', type: 'text', label: 'Subject', required: true, width: 'full' },
                        { id: 'c-3', type: 'textarea', label: 'Message', required: true, width: 'full' },
                    ]
                }
            ]
        }
    }
];

const NewFormPage = () => {
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const type = searchParams.get('type') || 'CUSTOM';

    const [view, setView] = useState<ViewState>('selection');
    const [initialConfig, setInitialConfig] = useState<FormConfig | undefined>(undefined);

    const handleSave = async (config: FormConfig, status: 'draft' | 'published') => {
        try {
            // POST to backend
            const payload = {
                title: config.title,
                description: config.steps?.length ? `${config.steps.length} Step Form` : 'Simple Form',
                status: status || 'draft',
                config: config,
                type: type,
                isActive: type === 'BOOKING' && status === 'published',
                clinicId: user?.clinicId
            };

            const response = await api.post('/forms', payload);

            if (response.data) {
                toast.success("Form created successfully!");
                // Redirect to the edit page of the newly created form, or list
                router.push(`/forms/${response.data.id}`);
            }
        } catch (error) {
            console.error("Failed to save form:", error);
            toast.error("Failed to save form. Please try again.");
        }
    };

    const startMultiStep = () => {
        setInitialConfig({
            title: 'New Multi-step Form',
            steps: [
                { id: crypto.randomUUID(), title: 'Step 1', fields: [] },
                { id: crypto.randomUUID(), title: 'Step 2', fields: [] }
            ]
        });
        setView('builder');
    };

    const startSimple = () => {
        setInitialConfig({
            title: 'New Simple Form',
            steps: [
                { id: crypto.randomUUID(), title: 'Form Details', fields: [] }
            ]
        });
        setView('builder');
    };

    const startTemplate = (template: typeof TEMPLATES[0]) => {
        setInitialConfig(template.config);
        setView('builder');
    };

    // --- Render Builder ---
    if (view === 'builder') {
        return (
            <div className="h-[calc(100vh-80px)]">
                {/* Optional back button in header could be added here or inside FormBuilder */}
                <FormBuilder
                    initialConfig={initialConfig}
                    onSave={handleSave}
                    formType={type as any}
                />
            </div>
        );
    }

    // --- Render Selection ---
    return (
        <div className="max-w-5xl mx-auto py-12 px-4">
            <div className="mb-8 text-center">
                <h1 className="text-3xl font-black text-slate-900 mb-2">Create New Form</h1>
                <p className="text-slate-500">Choose how you want to start building your form.</p>
            </div>

            {view === 'selection' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Option 1: Multi-Step */}
                    <Card
                        onClick={startMultiStep}
                        className="group relative p-8 cursor-pointer border-slate-200 hover:border-primary-500 hover:shadow-xl hover:shadow-primary-500/10 transition-all text-center flex flex-col items-center"
                    >
                        <div className="w-16 h-16 bg-primary-50 text-primary-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <Layers size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">Multi-Step Wizard</h3>
                        <p className="text-slate-500 text-sm mb-6">
                            Best for application flows, booking wizards, and long surveys. Splits content across pages.
                        </p>
                        <Button variant="outline" className="mt-auto group-hover:bg-primary-50 group-hover:text-primary-700 group-hover:border-primary-200">
                            Select Wizard <ArrowRight size={14} className="ml-2" />
                        </Button>
                    </Card>

                    {/* Option 2: Simple Form */}
                    <Card
                        onClick={startSimple}
                        className="group relative p-8 cursor-pointer border-slate-200 hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/10 transition-all text-center flex flex-col items-center"
                    >
                        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <FileText size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">Simple Form</h3>
                        <p className="text-slate-500 text-sm mb-6">
                            Single page form. Ideal for contact forms, fast data entry, and simple records.
                        </p>
                        <Button variant="outline" className="mt-auto group-hover:bg-blue-50 group-hover:text-blue-700 group-hover:border-blue-200">
                            Select Simple <ArrowRight size={14} className="ml-2" />
                        </Button>
                    </Card>

                    {/* Option 3: Templates */}
                    <Card
                        onClick={() => setView('templates')}
                        className="group relative p-8 cursor-pointer border-slate-200 hover:border-purple-500 hover:shadow-xl hover:shadow-purple-500/10 transition-all text-center flex flex-col items-center"
                    >
                        <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <LayoutTemplate size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">Premade Templates</h3>
                        <p className="text-slate-500 text-sm mb-6">
                            Start with a pre-configured structure for bookings, intake, or feedback.
                        </p>
                        <Button variant="outline" className="mt-auto group-hover:bg-purple-50 group-hover:text-purple-700 group-hover:border-purple-200">
                            Browse Templates <ArrowRight size={14} className="ml-2" />
                        </Button>
                    </Card>
                </div>
            )}

            {view === 'templates' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <button
                        onClick={() => setView('selection')}
                        className="flex items-center text-slate-500 hover:text-slate-800 mb-6 font-medium"
                    >
                        <ArrowLeft size={16} className="mr-2" /> Back to options
                    </button>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {TEMPLATES.map(template => {
                            const Icon = template.icon;
                            return (
                                <Card
                                    key={template.id}
                                    onClick={() => startTemplate(template)}
                                    className="p-6 cursor-pointer border-slate-200 hover:border-slate-800 hover:shadow-lg transition-all flex flex-col"
                                >
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center text-slate-700">
                                            <Icon size={20} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900">{template.title}</h4>
                                        </div>
                                    </div>
                                    <p className="text-slate-500 text-sm mb-4 flex-1">
                                        {template.description}
                                    </p>
                                    <div className="w-full py-2 bg-slate-50 text-slate-600 font-bold text-xs rounded text-center uppercase tracking-wider hover:bg-slate-800 hover:text-white transition-colors">
                                        Use Template
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NewFormPage;
