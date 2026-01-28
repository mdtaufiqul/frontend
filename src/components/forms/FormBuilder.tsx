"use client";

import React, { useState, useEffect } from 'react';
import { FormField, FormConfig, FormStep } from './FormRenderer';
import { Plus, Trash2, Save, MoveUp, MoveDown, Check, LayoutPanelTop, X, Database, ExternalLink, Calendar as CalendarIcon, Clock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import api from '@/utils/api';
import { toast } from 'sonner';
import clsx from 'clsx';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

interface Service {
    id: string;
    name: string;
    duration: string;
    price: number;
}

interface Practitioner {
    id: string;
    name: string;
    specialties: string[];
    consultationType?: 'Online' | 'In-person' | 'Mixed';
    schedule?: any[]; // We can refine this type if needed
}

interface FormBuilderProps {
    initialConfig?: FormConfig;
    initialStatus?: 'draft' | 'published';
    onSave?: (config: FormConfig, status: 'draft' | 'published') => void;
    formId?: string;
    formType?: 'SYSTEM' | 'BOOKING' | 'CUSTOM';
}

// Grouped Field Types
const FIELD_GROUPS = [
    {
        title: "Basic Fields",
        items: [
            { type: 'text', label: 'Short Text', icon: 'Type' },
            { type: 'textarea', label: 'Long Text', icon: 'AlignLeft' },
            { type: 'number', label: 'Number', icon: 'Hash' },
            { type: 'date', label: 'Date', icon: 'Calendar' },
            { type: 'select', label: 'Dropdown', icon: 'List' },
            { type: 'checkbox', label: 'Multiple Choice', icon: 'CheckSquare' },
            { type: 'file_upload', label: 'File Upload', icon: 'Upload' },
        ]
    },
    {
        title: "Dynamic Data",
        items: [
            { type: 'doctor_selection', label: 'Doctor Selector', icon: 'User' },
            { type: 'service_selection', label: 'Service Selection', icon: 'Stethoscope' },
            { type: 'schedule', label: 'Appointment Booking', icon: 'Calendar' },
        ]
    },
    {
        title: "Layout & Styling",
        items: [
            { type: 'header', label: 'Section Header', icon: 'Heading' },
            { type: 'spacer', label: 'Spacer', icon: 'BoxSelect' },
            { type: 'separator', label: 'Separator', icon: 'Minus' },
        ]
    }
];

const FormBuilder: React.FC<FormBuilderProps> = ({ initialConfig, initialStatus, onSave, formId, formType = 'CUSTOM' }) => {
    const router = useRouter();
    const { user } = useAuth();

    // Normalize initial config to ensure steps exist
    const normalizedConfig: FormConfig = initialConfig ? {
        ...initialConfig,
        steps: (initialConfig.steps && initialConfig.steps.length > 0)
            ? initialConfig.steps
            : (initialConfig.fields ? [{ id: 'default', title: 'Step 1', fields: initialConfig.fields }] : [{ id: crypto.randomUUID(), title: 'Step 1', fields: [] }])
    } : {
        title: formType === 'BOOKING' ? 'New Booking Form' : 'Untitled Form',
        steps: formType === 'BOOKING' ? [
            {
                id: 'step-practitioner',
                title: 'Select Practitioner',
                fields: [
                    { id: 'practitioner-select', type: 'doctor_selection' as any, label: 'Choose your Doctor', required: true, width: 'full', locked: true }
                ]
            },
            {
                id: 'step-service',
                title: 'Select Service',
                fields: [
                    { id: 'service-select', type: 'service_selection', label: 'Choose a Service', required: true, width: 'full', locked: true, options: [] }
                ]
            },
            {
                id: 'step-time',
                title: 'Select Time',
                fields: [
                    { id: 'appointment-time', type: 'schedule', label: 'Pick a Date & Time', required: true, width: 'full', locked: true }
                ]
            },
            {
                id: 'step-details',
                title: 'Your Details',
                fields: [
                    { id: 'lead-name', type: 'text', label: 'Full Name', required: true, width: 'full', locked: true },
                    { id: 'lead-email', type: 'text', label: 'Email Address', required: true, width: 'full', locked: true },
                    { id: 'lead-phone', type: 'text', label: 'Phone Number', required: true, width: 'full', locked: true },
                    { id: 'lead-password', type: 'text', label: 'Create Password', placeholder: 'Set a password to access your patient portal', required: true, width: 'full', locked: true },
                ]
            }
        ] : [{ id: crypto.randomUUID(), title: 'Step 1', fields: [] }]
    };

    const [config, setConfig] = useState<FormConfig>(normalizedConfig);
    const [activeStepId, setActiveStepId] = useState<string>(normalizedConfig.steps![0].id);
    const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
    const [services, setServices] = useState<Service[]>([]);
    const [practitioners, setPractitioners] = useState<Practitioner[]>([]);
    const [status, setStatus] = useState<'draft' | 'published'>(initialStatus || 'draft');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [isLoading, setIsLoading] = useState(true);
    const [showEmbed, setShowEmbed] = useState(false);

    useEffect(() => {
        if (initialStatus) {
            setStatus(initialStatus);
        }
    }, [initialStatus]);

    // Sync internal config when parent updates initialConfig (e.g., after save)
    useEffect(() => {
        if (initialConfig) {
            const normalized: FormConfig = {
                ...initialConfig,
                steps: (initialConfig.steps && initialConfig.steps.length > 0)
                    ? initialConfig.steps
                    : (initialConfig.fields ? [{ id: 'default', title: 'Step 1', fields: initialConfig.fields }] : [{ id: crypto.randomUUID(), title: 'Step 1', fields: [] }])
            };
            setConfig(normalized);
        }
    }, [initialConfig]);


    // Helpers
    const activeStepIndex = config.steps!.findIndex(s => s.id === activeStepId);
    const activeStep = config.steps![activeStepIndex];

    // Fetch Data
    useEffect(() => {
        const fetchData = async () => {
            try {
                const clinicId = config.clinicId || user?.clinicId;
                // Scope fetch to clinic if provided
                const servicesUrl = clinicId ? `/services?clinicId=${clinicId}` : '/services';
                const usersUrl = clinicId ? `/users?role=doctor&clinicId=${clinicId}` : '/users?role=doctor';

                // Parallel fetch but handle potential failures gracefully
                const [servicesRes, usersRes] = await Promise.allSettled([
                    api.get(servicesUrl),
                    api.get(usersUrl)
                ]);

                if (servicesRes.status === 'fulfilled') {
                    setServices(servicesRes.value.data);
                }

                if (usersRes.status === 'fulfilled') {
                    setPractitioners(usersRes.value.data);
                }
            } catch (err) {
                console.error("Failed to fetch form dependencies", err);
                toast.error("Could not load services/practitioners");
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [config.clinicId]); // Re-fetch if clinic context changes

    // Hydrate options for service/selection fields when data is available
    useEffect(() => {
        if (!services.length && !practitioners.length) return;

        setConfig(prev => {
            const updatedSteps = prev.steps!.map(step => ({
                ...step,
                fields: step.fields.map(field => {
                    // Hydrate Service Selection if empty
                    if (field.type === 'service_selection' && (!field.options || field.options.length === 0) && services.length > 0) {
                        return {
                            ...field,
                            options: services.map(s => ({
                                label: s.name,
                                value: s.id,
                                duration: s.duration,
                                price: s.price
                            }))
                        };
                    }
                    // Hydrate Schedule/Practitioner if empty
                    const isDyn = field.type === 'schedule' ||
                        (field.type as string) === 'doctor_selection' ||
                        (field.type as string) === 'practitioner_selection';
                    if (isDyn && (!field.options || field.options.length === 0) && practitioners.length > 0) {
                        return {
                            ...field,
                            options: practitioners.map(p => ({
                                label: p.name,
                                value: p.id,
                                specialty: p.specialties?.[0] || 'General'
                            }))
                        };
                    }
                    return field;
                })
            }));

            // Only update if changes were made to avoid loops (checking JSON stringify is expensive but safe here for small forms)
            if (JSON.stringify(updatedSteps) !== JSON.stringify(prev.steps)) {
                return { ...prev, steps: updatedSteps };
            }
            return prev;
        });
    }, [services, practitioners]);

    // --- Step Management ---

    const addStep = () => {
        const newStep: FormStep = {
            id: crypto.randomUUID(),
            title: `Step ${config.steps!.length + 1}`,
            fields: []
        };
        setConfig(prev => ({
            ...prev,
            steps: [...(prev.steps || []), newStep]
        }));
        setActiveStepId(newStep.id);
    };

    const removeStep = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (config.steps!.length <= 1) {
            toast.error("Form must have at least one step");
            return;
        }

        const newSteps = config.steps!.filter(s => s.id !== id);
        setConfig(prev => ({ ...prev, steps: newSteps }));

        if (activeStepId === id) {
            setActiveStepId(newSteps[0].id);
        }
    };

    const updateStepTitle = (id: string, title: string) => {
        setConfig(prev => ({
            ...prev,
            steps: prev.steps!.map(s => s.id === id ? { ...s, title } : s)
        }));
    };

    // --- Field Management ---

    const addField = (type: FormField['type']) => {
        if (!activeStep) return;

        const newField: FormField = {
            id: crypto.randomUUID(),
            type,
            label: `New ${type === 'service_selection' ? 'Service Selection' :
                (type as string) === 'doctor_selection' ? 'Doctor Selector' :
                    type === 'schedule' ? 'Appointment Schedule' :
                        type === 'header' ? 'Header' : 'Field'
                }`,
            required: false,
            width: 'full',
            options: []
        };

        // Pre-populate logic
        if (type === 'service_selection') {
            newField.options = services.map(s => ({
                label: s.name,
                value: s.id,
                duration: s.duration,
                price: s.price
            }));
            newField.label = "Select a Service";
        } else if ((type as string) === 'doctor_selection' || (type as string) === 'practitioner_selection') {
            newField.options = practitioners.map(p => ({
                label: p.name,
                value: p.id,
                specialty: p.specialties?.[0] || 'Doctor'
            }));
            newField.label = type === 'doctor_selection' ? "Choose your Doctor" : "Choose your Practitioner";
            newField.required = true;
        } else if (type === 'schedule') {
            // Initialize with all practitioners as options
            newField.options = practitioners.map(p => ({
                label: p.name,
                value: p.id,
                specialty: p.specialties?.[0] || 'General'
            }));
            newField.label = "Book Appointment";
            newField.required = true;
        } else if (type === 'file_upload') {
            newField.label = "Upload File";
            newField.placeholder = "Select or drag a file here";
        }

        const updatedSteps = config.steps!.map(step => {
            if (step.id === activeStepId) {
                return { ...step, fields: [...step.fields, newField] };
            }
            return step;
        });

        setConfig(prev => ({ ...prev, steps: updatedSteps }));
        setSelectedFieldId(newField.id);
    };

    const updateField = (id: string, updates: Partial<FormField>) => {
        const updatedSteps = config.steps!.map(step => {
            if (step.id === activeStepId) {
                return {
                    ...step,
                    fields: step.fields.map(f => f.id === id ? { ...f, ...updates } : f)
                };
            }
            return step;
        });
        setConfig(prev => ({ ...prev, steps: updatedSteps }));
    };

    const removeField = (id: string) => {
        const updatedSteps = config.steps!.map(step => {
            if (step.id === activeStepId) {
                // Prevent removing locked fields
                return { ...step, fields: step.fields.filter(f => f.id !== id || f.locked) };
            }
            return step;
        });
        setConfig(prev => ({ ...prev, steps: updatedSteps }));
        if (selectedFieldId === id) setSelectedFieldId(null);
    };

    const moveField = (index: number, direction: 'up' | 'down') => {
        if (!activeStep) return;
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === activeStep.fields.length - 1) return;

        const newFields = [...activeStep.fields];
        const swapIndex = direction === 'up' ? index - 1 : index + 1;
        [newFields[index], newFields[swapIndex]] = [newFields[swapIndex], newFields[index]];

        const updatedSteps = config.steps!.map(step => {
            if (step.id === activeStepId) {
                return { ...step, fields: newFields };
            }
            return step;
        });

        setConfig(prev => ({ ...prev, steps: updatedSteps }));
    };

    const handleSave = () => {
        if (!config.title.trim()) {
            toast.error("Please enter a form title");
            return;
        }

        // Booking Form Validation
        if (formType as string === 'INTAKE' && status === 'published') {
            const allFields = config.steps?.flatMap(s => s.fields) || [];
            const mandatoryIntake = ['patient-name', 'patient-email', 'patient-phone'];
            const missingIntake = mandatoryIntake.filter(m => !allFields.some(f => f.id === m));

            if (missingIntake.length > 0) {
                toast.error(`System intake forms must include locked fields: ${missingIntake.join(', ')}`);
                return;
            }
        }

        if (formType === 'BOOKING' && status === 'published') {
            const allFields = config.steps?.flatMap(s => s.fields) || [];
            const requiredWidgets = ['doctor_selection', 'service_selection', 'schedule'];
            const missing = requiredWidgets.filter(rw => !allFields.some(f => f.type === rw || (f.type as string) === 'practitioner_selection'));

            if (missing.length > 0) {
                toast.error(`Booking forms must include: ${missing.join(', ').replace(/_/g, ' ')}`);
                return;
            }

            const hasEmail = allFields.some(f => f.id === 'lead-email' || f.label.toLowerCase().includes('email'));
            const hasPassword = allFields.some(f => f.id === 'lead-password' || f.label.toLowerCase().includes('password'));

            if (!hasEmail || !hasPassword) {
                toast.error("Booking forms must include Email and Password fields for patient account creation.");
                return;
            }
        }

        // Ensure legacy fields is undefined to clean up
        const finalConfig = { ...config, fields: undefined };

        if (onSave) onSave(finalConfig, status);
        else toast.success(`Form saved as ${status} (Mock)`);
    };

    const selectedField = activeStep?.fields.find(f => f.id === selectedFieldId);

    // Helper to toggle a service/practitioner in options
    const toggleOption = (item: { id: string, name: string, duration?: string, price?: number, specialties?: string[] }) => {
        if (!selectedField) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const currentOptions = (selectedField.options || []) as any[];
        const exists = currentOptions.find(o => o.value === item.id);

        let newOptions;
        if (exists) {
            newOptions = currentOptions.filter(o => o.value !== item.id);
        } else {
            newOptions = [...currentOptions, {
                label: item.name,
                value: item.id,
                duration: item.duration,
                price: item.price,
                specialty: item.specialties?.[0]
            }];
        }
        updateField(selectedField.id, { options: newOptions });
    };

    return (
        <div className="h-[calc(100vh-100px)] flex flex-col md:flex-row gap-6">
            {/* Left Sidebar: Components */}
            <div className="w-full md:w-64 shrink-0 space-y-4">
                <Card className="p-4 bg-white h-full border-slate-200 overflow-y-auto">
                    <h3 className="font-bold text-slate-900 mb-6 text-sm uppercase tracking-wider text-slate-500">Components</h3>

                    <div className="space-y-6">
                        {FIELD_GROUPS.map((group, groupIndex) => (
                            <div key={groupIndex}>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">{group.title}</h4>
                                <div className="grid grid-cols-1 gap-2">
                                    {group.items.map(ft => (
                                        <button
                                            key={ft.type}
                                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                            onClick={() => addField(ft.type as any)}
                                            className="flex items-center gap-3 px-3 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-primary-200 rounded-lg text-sm font-medium text-slate-700 hover:text-primary-700 transition-all text-left shadow-sm hover:shadow group"
                                        >
                                            <span className={clsx("w-6 h-6 rounded flex items-center justify-center text-slate-500 transition-colors group-hover:bg-white",
                                                (ft.type.includes('selection') || ft.type === 'schedule') ? "bg-primary-50 text-primary-600" : "bg-slate-100"
                                            )}>
                                                {/* Icon placeholder logic or actual icons */}
                                                {ft.type.includes('text') && <span className="text-xs font-bold">T</span>}
                                                {ft.type.includes('number') && <span className="text-xs font-bold">#</span>}
                                                {ft.type.includes('date') && <span className="text-xs font-bold">D</span>}
                                                {(ft.type.includes('selection') || ft.type === 'doctor_selection') && <span className="text-xs font-bold">+</span>}
                                                {ft.type === 'schedule' && <span className="text-xs font-bold"><Clock size={12} /></span>}
                                                {ft.type === 'header' && <span className="text-xs font-bold">H</span>}
                                            </span>
                                            {ft.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>

            {/* Center: Canvas */}
            <div className="flex-1 flex flex-col min-w-0">
                <Card className="flex-1 flex flex-col bg-slate-50/50 overflow-hidden border-slate-200 shadow-sm">
                    {/* Header bar: Title & Tabs */}
                    <div className="border-b border-slate-200 bg-white">
                        <div className="p-4 flex items-center justify-between border-b border-slate-100">
                            <Input
                                value={config.title}
                                onChange={e => setConfig({ ...config, title: e.target.value })}
                                className="text-xl font-bold border-transparent hover:border-slate-200 focus:border-primary-500 w-full max-w-xs bg-transparent px-2 -ml-2"
                                placeholder="Form Title"
                            />
                            {formType as string === 'INTAKE' && (
                                <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
                                    <Label htmlFor="include-email" className="text-xs font-bold text-blue-700 cursor-pointer">
                                        Include In Email
                                    </Label>
                                    <Switch
                                        id="include-email"
                                        checked={config.includeInEmail !== false}
                                        onCheckedChange={(checked) => setConfig({ ...config, includeInEmail: checked })}
                                    />
                                </div>
                            )}
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
                                    <button
                                        onClick={() => setStatus('draft')}
                                        className={clsx("px-3 py-1 text-xs font-bold rounded-md transition-all", status === 'draft' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                                    >
                                        Draft
                                    </button>
                                    <button
                                        onClick={() => setStatus('published')}
                                        className={clsx("px-3 py-1 text-xs font-bold rounded-md transition-all", status === 'published' ? "bg-green-500 text-white shadow-sm" : "text-slate-500 hover:text-green-600")}
                                    >
                                        Published
                                    </button>
                                </div>
                                <Button onClick={handleSave} className="gap-2 shadow-sm font-semibold">
                                    <Save size={16} /> Save Form
                                </Button>
                                {status === 'published' && (
                                    <>
                                        <Button variant="outline" className="gap-2" asChild>
                                            <a
                                                href={`/public/forms/${formId || (initialConfig as any)?.id}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                <ExternalLink size={16} /> View
                                            </a>
                                        </Button>
                                        <Button variant="outline" className="gap-2" onClick={() => setShowEmbed(true)}>
                                            <ExternalLink size={16} /> Embed
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Step Tabs */}
                        <div className="flex items-center gap-1 px-2 pt-2 overflow-x-auto no-scrollbar">
                            {config.steps?.map((step) => (
                                <div
                                    key={step.id}
                                    onClick={() => setActiveStepId(step.id)}
                                    className={clsx(
                                        "group flex items-center gap-2 px-4 py-2.5 rounded-t-lg border-t border-l border-r border-b-0 cursor-pointer min-w-[120px] max-w-[200px] transition-all relative top-[1px]",
                                        activeStepId === step.id
                                            ? "bg-slate-50 border-slate-200 text-primary-700 font-bold z-10"
                                            : "bg-white border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                                    )}
                                >
                                    <span className="truncate text-sm flex-1">{step.title}</span>
                                    {config.steps!.length > 1 && (
                                        <button
                                            onClick={(e) => removeStep(step.id, e)}
                                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 hover:text-red-500 rounded-full transition-all"
                                        >
                                            <X size={12} />
                                        </button>
                                    )}
                                </div>
                            ))}
                            <button
                                onClick={addStep}
                                className="px-3 py-2 rounded-t-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-all ml-1"
                                title="Add Step"
                            >
                                <Plus size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Step Configuration (Title input for step) */}
                    <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center gap-4">
                        <Label className="shrink-0 text-slate-500">Step Title:</Label>
                        <Input
                            value={activeStep?.title || ''}
                            onChange={(e) => updateStepTitle(activeStepId, e.target.value)}
                            className="bg-white max-w-sm h-8"
                        />
                    </div>

                    {/* Fields List (Canvas) */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 bg-slate-50">
                        {(!activeStep || activeStep.fields.length === 0) ? (
                            <div className="h-64 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-white/50">
                                <div className="p-4 bg-slate-100 rounded-full mb-3">
                                    <LayoutPanelTop size={32} />
                                </div>
                                <p className="font-medium">This step is empty</p>
                                <p className="text-sm mt-1">Select components from the left to add fields</p>
                            </div>
                        ) : (
                            activeStep.fields.map((field, index) => (
                                <div
                                    key={field.id}
                                    onClick={() => setSelectedFieldId(field.id)}
                                    className={clsx(
                                        "group relative bg-white border rounded-xl p-4 transition-all hover:shadow-md cursor-pointer",
                                        selectedFieldId === field.id ? "border-primary-500 ring-2 ring-primary-500/10 z-10" : "border-slate-200"
                                    )}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            {!['header', 'separator', 'spacer'].includes(field.type) ? (
                                                <>
                                                    <label className="block text-sm font-bold text-slate-900 mb-2">
                                                        {field.label}
                                                        {field.required && <span className="text-red-500 ml-1">*</span>}
                                                    </label>
                                                    <div className="bg-slate-50 min-h-9 rounded border border-slate-100 w-full p-2">
                                                        {(field.type === 'schedule' || (field.type as string) === 'doctor_selection') ? (
                                                            <div className="space-y-2">
                                                                <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
                                                                    <CalendarIcon size={14} /> <span>{(field.type as string) === 'doctor_selection' ? 'Doctor Selection' : 'Book Appointment'}</span>
                                                                </div>
                                                                {/* Review of configured practitioners */}
                                                                {field.options && field.options.length > 0 ? (
                                                                    <div className="grid grid-cols-1 gap-2">
                                                                        {(() => {
                                                                            // Take top 3 for preview
                                                                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                                            const visible = (field.options as any[]).slice(0, 3);
                                                                            return visible.map((opt: any, i: number) => (
                                                                                <div key={i} className="flex items-center gap-2 bg-white p-2 border rounded-lg text-sm">
                                                                                    <div className="w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-bold">
                                                                                        {opt.label.charAt(0)}
                                                                                    </div>
                                                                                    <div className="flex-1">
                                                                                        <div className="font-medium text-slate-700">{opt.label}</div>
                                                                                        <div className="text-xs text-slate-400">{opt.specialty || ((field.type as string) === 'doctor_selection' ? 'Doctor' : 'Practitioner')}</div>
                                                                                    </div>
                                                                                </div>
                                                                            ));
                                                                        })()}
                                                                        {field.options.length > 3 && (
                                                                            <div className="text-xs text-center text-slate-400 font-medium py-1">
                                                                                + {field.options.length - 3} more {(field.type as string) === 'doctor_selection' ? 'doctors' : 'practitioners'}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <div className="text-xs text-slate-400 italic">No {(field.type as string) === 'doctor_selection' ? 'doctors' : 'practitioners'} selected (All will be shown)</div>
                                                                )}
                                                            </div>
                                                        ) : field.type === 'service_selection' ? (
                                                            <div className="space-y-2">
                                                                <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
                                                                    <Clock size={14} /> <span>Service List</span>
                                                                </div>
                                                                {field.options && field.options.length > 0 ? (
                                                                    <div className="grid grid-cols-1 gap-2">
                                                                        {(() => {
                                                                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                                            const visible = (field.options as any[]).slice(0, 3);
                                                                            return visible.map((opt: any, i: number) => (
                                                                                <div key={i} className="flex justify-between items-center bg-white p-2 border border-slate-200 rounded-lg shadow-sm">
                                                                                    <div>
                                                                                        <div className="font-bold text-slate-800 text-sm">{opt.label}</div>
                                                                                        <div className="text-xs text-slate-500 flex gap-2">
                                                                                            {opt.duration && <span>{opt.duration}</span>}
                                                                                            {opt.price && <span>${opt.price}</span>}
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            ));
                                                                        })()}
                                                                        {field.options.length > 3 && (
                                                                            <div className="text-xs text-center text-slate-400 font-medium py-1">
                                                                                + {field.options.length - 3} more services
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <div className="text-xs text-slate-400 italic">No specific services selected (All will be shown)</div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center px-2 text-slate-400 text-sm h-full">
                                                                {field.placeholder || (field.type === 'file_upload' ? 'File Upload' : field.type.includes('selection') ? 'Option Selection' : 'Input field')}
                                                            </div>
                                                        )}
                                                    </div>
                                                    {field.type === 'file_upload' && (
                                                        <div className="mt-2 flex items-center gap-2 text-xs text-slate-400 bg-slate-50 border border-dashed border-slate-200 p-2 rounded-lg">
                                                            <Plus size={12} /> Click to upload or drag and drop
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <div className="text-slate-900 font-bold border-b pb-1 border-slate-100">
                                                    {field.label === 'Separator' ? <hr className="my-2" /> : field.label}
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                            {field.locked && (
                                                <div className="p-1.5 text-slate-400 bg-slate-50 rounded mr-1" title="This field is locked">
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                                                </div>
                                            )}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); moveField(index, 'up'); }}
                                                disabled={index === 0}
                                                className="p-1.5 text-slate-400 hover:text-slate-600 disabled:opacity-30 hover:bg-slate-100 rounded"
                                            >
                                                <MoveUp size={14} />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); moveField(index, 'down'); }}
                                                disabled={index === activeStep.fields.length - 1}
                                                className="p-1.5 text-slate-400 hover:text-slate-600 disabled:opacity-30 hover:bg-slate-100 rounded"
                                            >
                                                <MoveDown size={14} />
                                            </button>
                                            {!field.locked && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); removeField(field.id); }}
                                                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    {field.type === 'service_selection' && (
                                        <div className="mt-2 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded w-fit">
                                            {(field.options?.length || 0)} services active in this selection
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </Card>
            </div>

            {/* Right Sidebar: Properties */}
            {selectedField && (
                <div className="w-full md:w-80 shrink-0">
                    <Card className="p-4 bg-white h-full overflow-y-auto border-slate-200">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-bold text-slate-900 text-sm border-b-2 border-primary-500 pb-1">Field Properties</h3>
                            <button onClick={() => setSelectedFieldId(null)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1 rounded"><X size={16} /></button>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-3">
                                <Label>Label</Label>
                                <Input
                                    value={selectedField.label}
                                    onChange={(e) => updateField(selectedField.id, { label: e.target.value })}
                                    className="bg-white"
                                />
                            </div>

                            {!['header', 'separator', 'spacer', 'schedule', 'doctor_selection'].includes(selectedField.type as string) && (
                                <div className="space-y-3">
                                    <Label>Placeholder</Label>
                                    <Input
                                        value={selectedField.placeholder || ''}
                                        onChange={(e) => updateField(selectedField.id, { placeholder: e.target.value })}
                                        className="bg-white"
                                    />
                                </div>
                            )}

                            {!['header', 'separator', 'spacer'].includes(selectedField.type as string) && (
                                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                                    <Label className="cursor-pointer" htmlFor="req-switch">Required Field</Label>
                                    <Switch
                                        id="req-switch"
                                        checked={selectedField.required}
                                        onCheckedChange={(checked) => updateField(selectedField.id, { required: checked })}
                                    />
                                </div>
                            )}

                            <div className="h-px bg-slate-100 my-4" />

                            {/* Service Selection Configuration */}
                            {selectedField.type === 'service_selection' && (
                                <div className="space-y-4">
                                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                                        <div className="flex items-center gap-2 text-blue-700 font-bold text-xs uppercase tracking-wider mb-2">
                                            <Database size={12} /> Data Source
                                        </div>
                                        <p className="text-xs text-blue-900 mb-3">
                                            Select which services should be available in this field.
                                        </p>

                                        <div className="space-y-2 max-h-60 overflow-y-auto border rounded-xl p-2 bg-white custom-scrollbar">
                                            {services.map(service => {
                                                const isSelected = (selectedField.options || []).some((opt: any) => opt.value === service.id);
                                                return (
                                                    <div
                                                        key={service.id}
                                                        onClick={() => toggleOption(service)}
                                                        className={clsx(
                                                            "p-2 rounded-lg cursor-pointer transition-all flex items-center gap-2 border",
                                                            isSelected ? "bg-primary-50 border-primary-200" : "bg-white border-slate-100 hover:border-primary-200"
                                                        )}
                                                    >
                                                        <div className={clsx(
                                                            "w-4 h-4 rounded border-2 flex items-center justify-center transition-all shrink-0",
                                                            isSelected ? "bg-primary-600 border-primary-600" : "border-slate-300"
                                                        )}>
                                                            {isSelected && <Check size={10} className="text-white" strokeWidth={3} />}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-xs font-bold text-slate-700 truncate">{service.name}</div>
                                                            <div className="text-[10px] text-slate-500">${service.price}</div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Doctor Selection / Appointment Configuration */}
                            {(selectedField.type === 'schedule' || (selectedField.type as string) === 'doctor_selection') && (
                                <div className="space-y-4">
                                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                                        <div className="flex items-center gap-2 text-blue-700 font-bold text-xs uppercase tracking-wider mb-2">
                                            {(selectedField.type as string) === 'doctor_selection' ? <User size={12} /> : <CalendarIcon size={12} />}
                                            {(selectedField.type as string) === 'doctor_selection' ? 'Doctor List' : 'Booking Config'}
                                        </div>
                                        <p className="text-xs text-blue-900 mb-4">
                                            {(selectedField.type as string) === 'doctor_selection'
                                                ? 'Choose which doctors appear on the form. If only one is selected, it will be auto-chosen for the patient.'
                                                : 'Patient will select a doctor from this list to see their specific availability.'}
                                        </p>

                                        <div className="space-y-2 max-h-60 overflow-y-auto border rounded-xl p-2 bg-white custom-scrollbar mb-4">
                                            {practitioners.map(doc => {
                                                const isSelected = (selectedField.options || []).some((opt: any) => opt.value === doc.id);
                                                return (
                                                    <div
                                                        key={doc.id}
                                                        onClick={() => toggleOption({
                                                            id: doc.id,
                                                            name: doc.name,
                                                            specialties: doc.specialties
                                                        })}
                                                        className={clsx(
                                                            "p-2 rounded-lg cursor-pointer transition-all flex items-center gap-2 border",
                                                            isSelected ? "bg-primary-50 border-primary-200" : "bg-white border-slate-100 hover:border-primary-200"
                                                        )}
                                                    >
                                                        <div className={clsx(
                                                            "w-4 h-4 rounded border-2 flex items-center justify-center transition-all shrink-0",
                                                            isSelected ? "bg-primary-600 border-primary-600" : "border-slate-300"
                                                        )}>
                                                            {isSelected && <Check size={10} className="text-white" strokeWidth={3} />}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-xs font-bold text-slate-700 truncate">{doc.name}</div>
                                                            <div className="text-[10px] text-slate-500">{doc.specialties?.[0] || 'Practitioner'}</div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        <div className="h-px bg-blue-100 my-4" />

                                        <div className="flex items-center gap-2 text-slate-700 font-bold text-[10px] uppercase tracking-wider mb-2">
                                            <Clock size={10} /> Availability Preview
                                        </div>
                                        <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar">
                                            {practitioners.filter(p => {
                                                const opts = selectedField.options || [];
                                                if (opts.length === 0) return true;
                                                return opts.some((opt: any) => opt.value === p.id);
                                            }).map(p => (
                                                <div key={p.id} className="bg-white p-2 rounded-lg border border-slate-200 text-[10px]">
                                                    <div className="font-bold text-slate-700 mb-1">{p.name}</div>
                                                    <div className="text-slate-500 italic">
                                                        {(!p.schedule || (Array.isArray(p.schedule) && p.schedule.length === 0)) ? 'No hours set' : 'Hours configured'}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <Link href="/settings" className="block mt-4">
                                            <Button size="sm" variant="outline" className="w-full text-[10px] h-7 bg-white">
                                                Manage Team & Schedules <ExternalLink size={10} className="ml-1" />
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            )}

                            {selectedField.type === 'practitioner_selection' && (
                                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                                    <div className="flex items-center gap-2 text-blue-700 font-bold text-xs uppercase tracking-wider mb-2">
                                        <Database size={12} /> Data Source
                                    </div>
                                    <p className="text-xs text-blue-900 mb-4">
                                        This field automatically pulls from your Team Members database.
                                    </p>
                                    <Link href="/settings">
                                        <Button size="sm" variant="outline" className="w-full bg-white text-xs h-8">
                                            Manage Team <ExternalLink size={10} className="ml-2" />
                                        </Button>
                                    </Link>
                                </div>
                            )}
                        </div>
                    </Card>
                </div>
            )}

            {/* Embed Dialog */}
            {showEmbed && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowEmbed(false)}>
                    <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-slate-900">Embed Your Form</h3>
                            <button onClick={() => setShowEmbed(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>
                        <p className="text-sm text-slate-500 mb-6">Copy this code to embed the form on your website or share the link directly.</p>

                        <div className="space-y-4">
                            <div>
                                <Label className="text-xs font-bold text-slate-700 mb-2 block uppercase tracking-wider">iFrame Embed</Label>
                                <div className="relative group">
                                    <pre className="bg-slate-900 text-slate-300 p-4 rounded-xl text-[10px] overflow-x-auto border border-slate-800 leading-relaxed font-mono">
                                        {`<iframe 
  src="${window.location.origin}/public/forms/${formId || 'FORM_ID'}" 
  width="100%" 
  height="800px" 
  frameborder="0"
></iframe>`}
                                    </pre>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-8">
                            <Button variant="outline" onClick={() => setShowEmbed(false)}>Cancel</Button>
                            <Button onClick={() => {
                                const code = `<iframe src="${window.location.origin}/public/forms/${formId || 'FORM_ID'}" width="100%" height="800px" frameborder="0"></iframe>`;
                                navigator.clipboard.writeText(code);
                                toast.success("Embed code copied to clipboard");
                            }}>Copy Embed Code</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FormBuilder;
