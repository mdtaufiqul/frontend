import React, { useState, useEffect } from 'react';
import { CheckSquare, AlertCircle, Clock, Calendar, ChevronLeft, ChevronRight, Sun, Moon, Sunrise, Video, MapPin, Upload, File, X, Loader2, Paperclip } from 'lucide-react';
import { toast } from 'sonner';
import clsx from 'clsx';
import { Button } from '../ui/button';
import { format } from 'date-fns'; // Keep format if used elsewhere, check usage
import ScheduleField from './ScheduleField';

export interface FormField {
    id: string;
    type: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'checkbox' | 'header' | 'spacer' | 'separator' | 'service_selection' | 'practitioner_selection' | 'schedule' | 'doctor_selection' | 'file_upload';
    label: string;
    placeholder?: string;
    required: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    options?: string[] | { label: string; value: string;[key: string]: any }[];
    width: 'full' | 'half';
    logic?: {
        fieldId: string;
        value: string;
        action: 'show' | 'hide';
    };
    design?: {
        marginTop?: number;
        marginBottom?: number;
        height?: number;
    };
    locked?: boolean;
}

export interface FormStep {
    id: string;
    title: string;
    fields: FormField[];
}

export interface FormConfig {
    id?: string;
    title: string;
    description?: string;
    status?: 'draft' | 'published';
    steps?: FormStep[];
    fields?: FormField[]; // Backward compatibility
    clinicId?: string;
    includeInEmail?: boolean;
}

interface FormRendererProps {
    config: FormConfig;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onSubmit?: (data: any) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onDataChange?: (data: any) => void; // Callback to expose formData to parent
}

const ROWS = [
    { label: 'Morning', icon: Sunrise, range: [9, 12] },
    { label: 'Afternoon', icon: Sun, range: [12, 17] },
    { label: 'Evening', icon: Moon, range: [17, 20] },
];

const FileUploadField: React.FC<{
    id: string;
    value?: string;
    placeholder?: string;
    onChange: (value: string | null) => void;
    hasError?: boolean;
}> = ({ id, value, placeholder, onChange, hasError }) => {
    const [isUploading, setIsUploading] = useState(false);
    const [fileName, setFileName] = useState<string | null>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setIsUploading(true);
            const formData = new FormData();
            formData.append('file', file);

            const { default: api } = await import('@/utils/api');
            const response = await api.post('/files/upload/public', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            if (response.data?.url) {
                onChange(response.data.url);
                setFileName(file.name);
                toast.success('File uploaded successfully');
            }
        } catch (error: any) {
            console.error('File upload failed', error);
            toast.error(error.response?.data?.message || 'File upload failed');
        } finally {
            setIsUploading(false);
        }
    };

    const handleClear = () => {
        onChange(null);
        setFileName(null);
    };

    return (
        <div className="space-y-2">
            {!value ? (
                <div className="relative">
                    <input
                        type="file"
                        id={`${id}-input`}
                        className="hidden"
                        onChange={handleFileChange}
                        disabled={isUploading}
                    />
                    <label
                        htmlFor={`${id}-input`}
                        className={clsx(
                            "flex flex-col items-center justify-center w-full h-32 px-4 transition bg-white border-2 border-dashed rounded-xl cursor-pointer hover:bg-slate-50 hover:border-primary-400 group",
                            hasError ? "border-red-300" : "border-slate-200"
                        )}
                    >
                        {isUploading ? (
                            <div className="flex flex-col items-center gap-2">
                                <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
                                <span className="text-sm font-medium text-slate-500">Uploading...</span>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-2">
                                <Upload className="w-8 h-8 text-slate-400 group-hover:text-primary-500 transition-colors" />
                                <span className="text-sm font-medium text-slate-600">{placeholder || 'Click to upload file'}</span>
                                <span className="text-xs text-slate-400 font-normal">Max 10MB (PDF, JPG, PNG, DOCX)</span>
                            </div>
                        )}
                    </label>
                </div>
            ) : (
                <div className="flex items-center justify-between p-3 bg-primary-50 border border-primary-100 rounded-xl animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="p-2 bg-primary-100 text-primary-600 rounded-lg">
                            <File size={20} />
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-bold text-primary-900 truncate">{fileName || 'File Uploaded'}</p>
                            <a
                                href={`${process.env.NEXT_PUBLIC_API_URL}${value}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary-600 hover:underline flex items-center gap-1"
                            >
                                <Paperclip size={10} /> View attachment
                            </a>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={handleClear}
                        className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                    >
                        <X size={16} />
                    </button>
                </div>
            )}
        </div>
    );
};

const FormRenderer: React.FC<FormRendererProps> = ({ config, onSubmit, onDataChange }) => {
    // Normalize steps: use config.steps if available, otherwise wrap config.fields in a default step
    const steps = config.steps || (config.fields ? [{ id: 'default', title: 'Details', fields: config.fields }] : []);

    // State
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitted, setSubmitted] = useState(false);

    // Dynamic Field Logic (Email Lookup)
    const [isCheckingEmail, setIsCheckingEmail] = useState(false);
    const [dynamicHiddenFields, setDynamicHiddenFields] = useState<string[]>([]);

    // Calendar State
    const [calendarViewDate, setCalendarViewDate] = useState(new Date());

    // Reset when config changes
    useEffect(() => {
        setCurrentStepIndex(0);
        setFormData({});
        setErrors({});
        setSubmitted(false);
         
    }, [config.title]); // Reset if form title changes (implies new form)

    // Sync formData changes to parent on mount and when formData changes
    useEffect(() => {
        if (onDataChange) {
            console.log('[FormRenderer] Syncing formData to parent:', formData);
            onDataChange(formData);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formData]); // Only depend on formData, not onDataChange to avoid infinite loops

    const currentStep = steps[currentStepIndex];
    if (!currentStep) return <div className="p-8 text-center text-red-500">Invalid Configuration: No steps found.</div>;

    const isLastStep = currentStepIndex === steps.length - 1;
    const isFirstStep = currentStepIndex === 0;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleChange = (id: string, value: any) => {
        console.log("DEBUG: handleChange called", { id, value, currentFormData: formData });
        const newFormData = { ...formData, [id]: value };
        setFormData(newFormData);
        // Notify parent of data change
        if (onDataChange) {
            onDataChange(newFormData);
        }
        // Clear error when modified
        if (errors[id]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[id];
                return newErrors;
            });
        }
    };

    const isFieldVisible = (field: FormField): boolean => {
        if (dynamicHiddenFields.includes(field.id)) return false;
        if (!field.logic) return true;

        const { fieldId, value, action } = field.logic;
        const dependentValue = formData[fieldId];
        const isMatch = dependentValue === value;

        return action === 'show' ? isMatch : !isMatch;
    };

    const handleBlur = async (fieldId: string, value: any) => {
        // Smart Email Lookup - Robust Check
        const isEmailField = fieldId.toLowerCase().includes('email');

        if (isEmailField && value && typeof value === 'string' && value.includes('@')) {
            try {
                setIsCheckingEmail(true);
                const { default: api } = await import('@/utils/api');
                const clinicIdParam = config.clinicId ? `?clinicId=${config.clinicId}` : '';
                const response = await api.get(`/patients/check-email/${encodeURIComponent(value)}${clinicIdParam}`);

                // Helper to find field across steps
                const findField = (predicate: (f: FormField) => boolean) => {
                    for (const step of steps) {
                        const found = step.fields.find(predicate);
                        if (found) return found;
                    }
                    return null;
                };

                if (response.data?.exists && response.data?.user) {
                    console.log('Patient exists, autofilling...', response.data.user);
                    const user = response.data.user;
                    toast.success("Existing patient recognized! Welcome back, " + user.name);

                    // 1. Auto-fill Fields
                    setFormData(prev => {
                        const newData = { ...prev };

                        // Name
                        const nameField = findField(f => f.id.toLowerCase().includes('name'));
                        if (nameField && !newData[nameField.id] && user.name) {
                            newData[nameField.id] = user.name;
                        }

                        // Phone
                        const phoneField = findField(f => f.id.includes('phone') || f.label.toLowerCase().includes('phone'));
                        if (phoneField && !newData[phoneField.id] && user.phone) {
                            newData[phoneField.id] = user.phone;
                        }

                        // DOB
                        const dobField = findField(f => f.id.includes('dob') || f.label.toLowerCase().includes('birth'));
                        if (dobField && !newData[dobField.id] && user.dob) {
                            // Ensure date format YYYY-MM-DD
                            const dateVal = new Date(user.dob).toISOString().split('T')[0];
                            newData[dobField.id] = dateVal;
                        }

                        return newData;
                    });

                    // 2. Hide Password Field (if exists)
                    const passwordField = findField(f => f.id === 'password' || f.label.toLowerCase().includes('password'));
                    if (passwordField) {
                        setDynamicHiddenFields(prev => [...prev, passwordField.id]);
                        // Clear password value if it was typed? Optional.
                    }

                } else {
                    // Patient doesn't exist, ensure password field is visible
                    const passwordField = findField(f => f.id === 'password' || f.label.toLowerCase().includes('password'));
                    if (passwordField) {
                        setDynamicHiddenFields(prev => prev.filter(id => id !== passwordField.id));
                    }
                }
            } catch (error) {
                console.error('Failed to check email', error);
            } finally {
                setIsCheckingEmail(false);
            }
        }
    };

    const validateStep = (silent = false) => {
        const newErrors: Record<string, string> = {};
        let hasError = false;

        currentStep.fields.forEach(field => {
            if (isFieldVisible(field) && field.required && !['header', 'spacer', 'separator'].includes(field.type)) {
                if (!formData[field.id] || (Array.isArray(formData[field.id]) && formData[field.id].length === 0)) {
                    if (!silent) newErrors[field.id] = 'This field is required';
                    hasError = true;
                }
            }
        });

        if (hasError && !silent) {
            setErrors(newErrors);
            return false;
        }
        return !hasError;
    };

    // Auto-advance logic removed per user request

    const handleNext = (e: React.MouseEvent) => {
        if (e && e.preventDefault) e.preventDefault();
        if (validateStep()) {
            setCurrentStepIndex(prev => prev + 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleBack = (e: React.MouseEvent) => {
        e.preventDefault();
        if (!isFirstStep) {
            setCurrentStepIndex(prev => prev - 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (validateStep()) {
            if (onSubmit) {
                // If onSubmit is provided, let it handle logic. 
                // We await it in case it returns a promise, but we don't assume success.
                // The parent (PublicFormPage) is responsible for unmounting/redirecting on success.
                await onSubmit(formData);
            } else {
                // Only use local success state if no handler (e.g. preview mode)
                setSubmitted(true);
            }
        }
    };

    // Data State
    const [practitioners, setPractitioners] = useState<any[]>([]);
    const [services, setServices] = useState<any[]>([]);
    const [timezone, setTimezone] = useState<string>('UTC');

    // Fetch Dependencies
    useEffect(() => {
        const fetchData = async () => {
            try {
                const { default: api } = await import('@/utils/api');
                const clinicId = config.clinicId;
                const usersUrl = clinicId ? `/users?role=doctor&clinicId=${clinicId}` : '/users?role=doctor';
                const servicesUrl = clinicId ? `/services?clinicId=${clinicId}` : '/services';
                const [usersRes, servicesRes, clinicsRes] = await Promise.all([
                    api.get(usersUrl),
                    api.get(servicesUrl),
                    clinicId ? api.get(`/clinics/${clinicId}`) : api.get('/clinics')
                ]);

                setPractitioners(usersRes.data);
                setServices(servicesRes.data);

                if (clinicsRes.data && clinicsRes.data.length > 0) {
                    setTimezone(clinicsRes.data[0].timezone || 'UTC');
                }
            } catch (err) {
                console.error("Failed to load form dependencies", err);
            }
        };
        fetchData();
    }, [config.clinicId]);

    // Track selected doctor to filter services
    const doctorField = steps.flatMap(s => s.fields).find(f => f.type === 'doctor_selection' || f.type === 'practitioner_selection');
    const selectedDoctorId = doctorField ? formData[doctorField.id] : null;

    // Re-enabled doctor-specific service fetching per user request
    useEffect(() => {
        if (!selectedDoctorId) return;

        const fetchDoctorServices = async () => {
            try {
                const { default: api } = await import('@/utils/api');
                const clinicId = config.clinicId;
                const url = `/services?${clinicId ? `clinicId=${clinicId}&` : ''}doctorId=${selectedDoctorId}`;
                const res = await api.get(url);
                setServices(res.data);
            } catch (err) {
                console.error("Failed to fetch doctor-specific services", err);
            }
        };

        fetchDoctorServices();
    }, [selectedDoctorId, config.clinicId]);

    // Debug: Log when formData or practitioners change
    useEffect(() => {
        console.log("DEBUG: State changed", {
            formData,
            practitionersCount: practitioners.length,
            practitionerNames: practitioners.map(p => ({ id: p.id, name: p.name }))
        });
    }, [formData, practitioners]);



    if (submitted) {
        return (
            <div className="text-center py-12 bg-green-50 rounded-xl border border-green-100 p-8">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckSquare size={32} />
                </div>
                <h3 className="text-2xl font-bold text-green-800 mb-2">Submission Received</h3>
                <p className="text-green-700">Thank you for filling out the form. We have received your information.</p>
                <button
                    onClick={() => { setSubmitted(false); setFormData({}); setCurrentStepIndex(0); }}
                    className="mt-6 text-sm font-bold text-green-600 hover:text-green-800 underline"
                >
                    Submit another response
                </button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="w-full">
            <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden">
                {/* Form Header with Stepper */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6 sm:p-10">
                    {/* Stepper UI */}
                    {steps.length > 1 && (
                        <div className="flex items-center justify-between max-w-2xl mx-auto mb-8">
                            {steps.map((step, index) => {
                                const isCompleted = index < currentStepIndex;
                                const isCurrent = index === currentStepIndex;

                                return (
                                    <div key={step.id || index} className="flex-1 flex items-center">
                                        <div className="relative flex flex-col items-center group w-full">
                                            <div className="flex items-center w-full">
                                                {/* Left Line */}
                                                <div className={clsx(
                                                    "h-1 flex-1 rounded-full transition-all duration-500",
                                                    index === 0 ? "invisible" : // No line before first
                                                        isCompleted || isCurrent ? "bg-white/40" : "bg-white/10"
                                                )} />

                                                {/* Circle */}
                                                <div className={clsx(
                                                    "w-8 h-8 md:w-10 md:h-10 shrink-0 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all z-10 mx-2",
                                                    isCompleted ? "bg-white text-indigo-700 border-white shadow-lg" :
                                                        isCurrent ? "bg-white text-indigo-700 border-white shadow-[0_0_20px_rgba(255,255,255,0.4)] scale-110" :
                                                            "bg-transparent border-white/30 text-white/50"
                                                )}>
                                                    {isCompleted ? <CheckSquare size={16} /> : index + 1}
                                                </div>

                                                {/* Right Line */}
                                                <div className={clsx(
                                                    "h-1 flex-1 rounded-full transition-all duration-500",
                                                    index === steps.length - 1 ? "invisible" : // No line after last
                                                        isCompleted ? "bg-white/40" : "bg-white/10"
                                                )} />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Step Title */}
                    {steps.length > 1 && (
                        <h2 className="text-2xl font-bold text-white text-center animate-in fade-in slide-in-from-top-2 duration-300">
                            {currentStep.title}
                        </h2>
                    )}
                </div>

                {/* Form Body */}
                <div className="p-6 sm:p-8 min-h-[400px]">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-6">
                        {currentStep.fields.map((field) => {
                            if (!isFieldVisible(field)) return null;

                            const isFullWidth = field.width === 'full' || !field.width;
                            const colSpan = isFullWidth ? 'col-span-2' : 'col-span-1';
                            const hasError = !!errors[field.id];

                            const style = {
                                marginTop: field.design?.marginTop ? `${field.design.marginTop}px` : undefined,
                                marginBottom: field.design?.marginBottom ? `${field.design.marginBottom}px` : undefined,
                            };

                            // Render Logic
                            return (
                                <div key={field.id} className={colSpan} style={style}>
                                    {field.type === 'header' ? (
                                        <h2 className="text-xl font-bold text-slate-800 border-b border-slate-100 pb-2 mb-2 pt-2">{field.label}</h2>
                                    ) : field.type === 'separator' ? (
                                        <div className="h-px bg-slate-200 w-full my-4"></div>
                                    ) : field.type === 'spacer' ? (
                                        <div style={{ height: `${field.design?.height || 20}px` }}></div>
                                    ) : field.type === 'schedule' ? (
                                        // Custom Schedule Renderer
                                        <ScheduleField
                                            field={field}
                                            formData={formData}
                                            handleChange={handleChange}
                                            config={config}
                                            practitioners={practitioners}
                                            services={services}
                                            hasError={hasError}
                                            errors={errors}
                                            timezone={timezone}
                                        />
                                    ) : (
                                        <div className="space-y-2">
                                            <label className="block text-sm font-bold text-slate-700">
                                                {field.label}
                                                {field.required && <span className="text-red-500 ml-1">*</span>}
                                            </label>

                                            <div className="relative">
                                                {/* Text & Number Inputs */}
                                                {(field.type === 'text' || field.type === 'number' || field.type === 'date') && (
                                                    <input
                                                        type={field.type}
                                                        value={formData[field.id] || ''}
                                                        onChange={(e) => handleChange(field.id, e.target.value)}
                                                        onBlur={(e) => handleBlur(field.id, e.target.value)}
                                                        placeholder={field.placeholder}
                                                        className={clsx(
                                                            "w-full px-4 py-3 rounded-lg border text-sm transition-all focus:ring-4 focus:ring-primary-500/10 outline-none",
                                                            hasError
                                                                ? "border-red-300 focus:border-red-500 bg-red-50 text-red-900 placeholder-red-300"
                                                                : "border-slate-200 focus:border-primary-500 bg-white text-slate-900 hover:border-slate-300"
                                                        )}
                                                    />
                                                )}

                                                {/* Textarea */}
                                                {field.type === 'textarea' && (
                                                    <textarea
                                                        value={formData[field.id] || ''}
                                                        onChange={(e) => handleChange(field.id, e.target.value)}
                                                        placeholder={field.placeholder}
                                                        rows={4}
                                                        className={clsx(
                                                            "w-full px-4 py-3 rounded-lg border text-sm transition-all focus:ring-4 focus:ring-primary-500/10 custom-scrollbar resize-none outline-none",
                                                            hasError
                                                                ? "border-red-300 focus:border-red-500 bg-red-50 text-red-900 placeholder-red-300"
                                                                : "border-slate-200 focus:border-primary-500 bg-white text-slate-900 hover:border-slate-300"
                                                        )}
                                                    />
                                                )}

                                                {/* Select */}
                                                {field.type === 'select' && (
                                                    <div className="relative">
                                                        <select
                                                            value={formData[field.id] || ''}
                                                            onChange={(e) => handleChange(field.id, e.target.value)}
                                                            className={clsx(
                                                                "w-full px-4 py-3 rounded-lg border text-sm transition-all focus:ring-4 focus:ring-primary-500/10 appearance-none outline-none",
                                                                hasError
                                                                    ? "border-red-300 focus:border-red-500 bg-red-50 text-red-900"
                                                                    : "border-slate-200 focus:border-primary-500 bg-white text-slate-900 hover:border-slate-300"
                                                            )}
                                                        >
                                                            <option value="" disabled>Select an option...</option>
                                                            {field.options?.map((opt, i) => {
                                                                const val = typeof opt === 'string' ? opt : opt.value;
                                                                const lbl = typeof opt === 'string' ? opt : opt.label;
                                                                return <option key={i} value={val}>{lbl}</option>;
                                                            })}
                                                        </select>
                                                        {/* Custom Arrow */}
                                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Checkbox Group */}
                                                {field.type === 'checkbox' && (
                                                    <div className="space-y-2 mt-2">
                                                        {field.options?.map((opt, i) => {
                                                            const optionLabel = typeof opt === 'string' ? opt : opt.label;
                                                            const optionValue = typeof opt === 'string' ? opt : opt.value;
                                                            const isChecked = (formData[field.id] || []).includes(optionValue);
                                                            return (
                                                                <label key={i} className="flex items-center gap-3 cursor-pointer group">
                                                                    <div className={clsx(
                                                                        "w-5 h-5 rounded border flex items-center justify-center transition-all",
                                                                        isChecked
                                                                            ? "bg-primary-600 border-primary-600 text-white"
                                                                            : "bg-white border-slate-300 group-hover:border-primary-400"
                                                                    )}>
                                                                        {isChecked && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                                                                    </div>
                                                                    <input
                                                                        type="checkbox"
                                                                        className="hidden"
                                                                        checked={isChecked}
                                                                        onChange={(e) => {
                                                                            const current = formData[field.id] || [];
                                                                            const newValue = e.target.checked
                                                                                ? [...current, optionValue]
                                                                                : current.filter((v: string) => v !== optionValue);
                                                                            handleChange(field.id, newValue);
                                                                        }}
                                                                    />
                                                                    <span className="text-sm text-slate-700">{optionLabel}</span>
                                                                </label>
                                                            );
                                                        })}
                                                    </div>
                                                )}

                                                {/* File Upload Component */}
                                                {field.type === 'file_upload' && (
                                                    <FileUploadField
                                                        id={field.id}
                                                        value={formData[field.id]}
                                                        placeholder={field.placeholder}
                                                        onChange={(val) => handleChange(field.id, val)}
                                                        hasError={hasError}
                                                    />
                                                )}

                                                {/* Practitioner Selection - Dropdown Style */}
                                                {field.type === 'practitioner_selection' && (
                                                    <div className="relative">
                                                        <select
                                                            value={formData[field.id] || ''}
                                                            onChange={(e) => handleChange(field.id, e.target.value)}
                                                            className={clsx(
                                                                "w-full px-4 py-3 rounded-lg border text-sm transition-all focus:ring-4 focus:ring-primary-500/10 appearance-none outline-none",
                                                                hasError
                                                                    ? "border-red-300 focus:border-red-500 bg-red-50 text-red-900"
                                                                    : "border-slate-200 focus:border-primary-500 bg-white text-slate-900 hover:border-slate-300"
                                                            )}
                                                        >
                                                            <option value="" disabled>Select a practitioner...</option>
                                                            {(() => {
                                                                let effectiveOptions = field.options || [];
                                                                if (effectiveOptions.length === 0) {
                                                                    effectiveOptions = practitioners.map(p => ({
                                                                        label: p.name,
                                                                        value: p.id,
                                                                        specialty: p.specialties?.[0]
                                                                    }));
                                                                }
                                                                return effectiveOptions.map((opt, i) => {
                                                                    const val = typeof opt === 'string' ? opt : opt.value;
                                                                    const lbl = typeof opt === 'string' ? opt : opt.label;
                                                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                                    const meta = (typeof opt === 'object' ? opt : {}) as any;
                                                                    return <option key={i} value={val}>{lbl} {meta.specialty ? `(${meta.specialty})` : ''}</option>;
                                                                });
                                                            })()}
                                                        </select>
                                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Service Selection - Radio Cards with Consultation Type Toggle */}
                                                {field.type === 'service_selection' && (
                                                    <div className="space-y-3 mt-2">

                                                        {(() => {
                                                            let effectiveOptions = [];

                                                            // If field has configured options, use those (respecting form builder configuration)
                                                            if (field.options && field.options.length > 0) {
                                                                effectiveOptions = field.options.map((opt: any) => {
                                                                    // If it's already an object with metadata, use it
                                                                    if (typeof opt === 'object' && opt.value) {
                                                                        // Enrich with live data if available
                                                                        const liveService = services.find(s => String(s.id) === String(opt.value));
                                                                        return liveService ? {
                                                                            label: liveService.name,
                                                                            value: liveService.id,
                                                                            duration: liveService.duration,
                                                                            price: liveService.price,
                                                                            type: liveService.type
                                                                        } : opt;
                                                                    }
                                                                    // If it's a string (service ID), look it up
                                                                    const liveService = services.find(s => String(s.id) === String(opt));
                                                                    return liveService ? {
                                                                        label: liveService.name,
                                                                        value: liveService.id,
                                                                        duration: liveService.duration,
                                                                        price: liveService.price,
                                                                        type: liveService.type
                                                                    } : { label: opt, value: opt };
                                                                });

                                                                // Filter removed to prevent hiding valid services due to ID mismatches
                                                                // We trust the form configuration specifically
                                                            } else if (services.length > 0) {
                                                                // No specific services configured, show all
                                                                effectiveOptions = services.map(s => ({
                                                                    label: s.name,
                                                                    value: s.id,
                                                                    duration: s.duration,
                                                                    price: s.price,
                                                                    type: s.type
                                                                }));
                                                            }

                                                            if (effectiveOptions.length === 0) {
                                                                return (
                                                                    <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                                                                        <p className="font-medium">No services available</p>
                                                                        <p className="text-xs mt-1">Select a doctor to see their services.</p>
                                                                    </div>
                                                                );
                                                            }

                                                            return effectiveOptions.map((opt, i) => {
                                                                const optionLabel = typeof opt === 'string' ? opt : opt.label;
                                                                const optionValue = typeof opt === 'string' ? opt : opt.value;
                                                                const isSelected = formData[field.id] === optionValue; // Single selection

                                                                // Metadata
                                                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                                const meta = (typeof opt === 'object' ? opt : {}) as any;

                                                                // Get consultation type for this service
                                                                const consultationTypeFieldId = `${field.id}-consultation-type`;
                                                                const selectedConsultationType = formData[consultationTypeFieldId] || 'Offline';

                                                                return (
                                                                    <div
                                                                        key={i}
                                                                        className={clsx(
                                                                            "rounded-xl border-2 transition-all overflow-hidden",
                                                                            isSelected
                                                                                ? "border-primary-500 shadow-md shadow-primary-500/10"
                                                                                : "border-slate-200 hover:border-slate-300 hover:shadow-sm"
                                                                        )}
                                                                    >
                                                                        {/* Service Card */}
                                                                        <div
                                                                            onClick={() => {
                                                                                handleChange(field.id, optionValue); // Single selection
                                                                            }}
                                                                            className="p-4 cursor-pointer bg-white hover:bg-slate-50/50 transition-colors"
                                                                        >
                                                                            <div className="flex items-center gap-4">
                                                                                {/* Radio Button */}
                                                                                <div className={clsx(
                                                                                    "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0",
                                                                                    isSelected
                                                                                        ? "border-primary-600 bg-primary-600"
                                                                                        : "border-slate-300"
                                                                                )}>
                                                                                    {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                                                                                </div>

                                                                                {/* Service Icon */}
                                                                                <div className={clsx(
                                                                                    "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                                                                                    isSelected ? "bg-primary-100 text-primary-600" : "bg-slate-100 text-slate-400"
                                                                                )}>
                                                                                    <span className="text-sm font-black">{optionLabel.charAt(0)}</span>
                                                                                </div>

                                                                                {/* Service Info */}
                                                                                <div className="flex-1">
                                                                                    <div className={clsx("font-bold text-sm transition-colors", isSelected ? "text-primary-900" : "text-slate-800")}>{optionLabel}</div>
                                                                                    {(meta.duration || meta.price) && (
                                                                                        <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-3 font-medium">
                                                                                            {meta.duration && <span className="flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded text-slate-600"><Clock size={10} /> {meta.duration}</span>}
                                                                                            {meta.price && <span className="text-green-600 bg-green-50 px-1.5 py-0.5 rounded">${meta.price}</span>}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </div>

                                                                        {/* Consultation Type Toggle (only when selected) */}
                                                                        {isSelected && (
                                                                            <div className="px-4 pb-4 bg-slate-50/50 border-t border-slate-100">
                                                                                <label className="text-xs font-bold text-slate-600 mb-2 block">Consultation Type</label>
                                                                                <div className="flex gap-2">
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => handleChange(consultationTypeFieldId, 'Online')}
                                                                                        className={clsx(
                                                                                            "flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2",
                                                                                            selectedConsultationType === 'Online'
                                                                                                ? "bg-blue-600 text-white shadow-sm"
                                                                                                : "bg-white text-slate-600 border border-slate-200 hover:border-blue-300"
                                                                                        )}
                                                                                    >
                                                                                        <Video size={14} />
                                                                                        Online
                                                                                    </button>
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => handleChange(consultationTypeFieldId, 'Offline')}
                                                                                        className={clsx(
                                                                                            "flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2",
                                                                                            selectedConsultationType === 'Offline'
                                                                                                ? "bg-emerald-600 text-white shadow-sm"
                                                                                                : "bg-white text-slate-600 border border-slate-200 hover:border-emerald-300"
                                                                                        )}
                                                                                    >
                                                                                        <MapPin size={14} />
                                                                                        In-Person
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            });
                                                        })()}
                                                    </div>
                                                )}

                                                {/* Doctor Selection (Multi-doctor Support) */}
                                                {field.type === 'doctor_selection' && (
                                                    <>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                                                            {(() => {
                                                                let options = field.options || [];
                                                                if (options.length === 0) {
                                                                    options = practitioners.map(p => ({
                                                                        label: p.name,
                                                                        value: p.id,
                                                                        specialty: p.specialties?.[0] || 'Doctor'
                                                                    }));
                                                                }

                                                                if (options.length === 0) return (
                                                                    <div className="col-span-2 text-center py-4 text-slate-400 italic">No doctors available.</div>
                                                                );

                                                                // Auto-select if only one option and not already selected
                                                                if (options.length === 1 && !formData[field.id]) {
                                                                    const singleValue = typeof options[0] === 'string' ? options[0] : options[0].value;
                                                                    // Use a small timeout to avoid updating state during render
                                                                    setTimeout(() => {
                                                                        if (!formData[field.id]) {
                                                                            handleChange(field.id, singleValue);
                                                                        }
                                                                    }, 0);
                                                                }

                                                                return options.map((opt: any, i: number) => {
                                                                    const val = typeof opt === 'string' ? opt : opt.value;
                                                                    const lbl = typeof opt === 'string' ? opt : opt.label;
                                                                    const specialty = opt.specialty || (opt.specialties ? opt.specialties[0] : 'Specialist');
                                                                    const isSelected = formData[field.id] === val;

                                                                    return (
                                                                        <div
                                                                            key={i}
                                                                            onClick={() => handleChange(field.id, val)}
                                                                            className={clsx(
                                                                                "relative flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all",
                                                                                isSelected
                                                                                    ? "border-primary-500 bg-primary-50/50 ring-4 ring-primary-500/10 shadow-sm"
                                                                                    : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                                                                            )}
                                                                        >
                                                                            <div className={clsx(
                                                                                "w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shrink-0 transition-transform",
                                                                                isSelected ? "bg-primary-600 text-white scale-105" : "bg-slate-100 text-slate-400"
                                                                            )}>
                                                                                {lbl.charAt(0)}
                                                                            </div>
                                                                            <div className="flex-1 min-w-0">
                                                                                <h4 className={clsx("font-bold text-sm truncate", isSelected ? "text-primary-900" : "text-slate-900")}>{lbl}</h4>
                                                                                <p className="text-xs text-slate-500 font-medium truncate">{specialty}</p>
                                                                            </div>
                                                                            {isSelected && (
                                                                                <div className="absolute top-3 right-3 w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center text-white scale-110 shadow-md">
                                                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                });
                                                            })()}
                                                        </div>
                                                        {/* Dynamic Specialty Selection for Selected Doctor */}
                                                        {(() => {
                                                            const selectedDocId = formData[field.id];
                                                            if (!selectedDocId) return null;

                                                            const docResponse = practitioners.find(p => p.id === selectedDocId);

                                                            if (docResponse && docResponse.specialties && docResponse.specialties.length > 1) {
                                                                const specialtyFieldId = `${field.id}_specialty`;
                                                                const currentSpec = formData[specialtyFieldId];

                                                                return (
                                                                    <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200 animate-in fade-in slide-in-from-top-2">
                                                                        <label className="block text-sm font-bold text-slate-700 mb-3">
                                                                            Select Department / Specialty
                                                                        </label>
                                                                        <div className="flex flex-wrap gap-2">
                                                                            {docResponse.specialties.map((spec: string, idx: number) => {
                                                                                const isSpecSelected = currentSpec === spec;
                                                                                return (
                                                                                    <button
                                                                                        key={idx}
                                                                                        type="button"
                                                                                        onClick={() => handleChange(specialtyFieldId, spec)}
                                                                                        className={clsx(
                                                                                            "px-4 py-2 rounded-lg text-sm font-bold transition-all border",
                                                                                            isSpecSelected
                                                                                                ? "bg-slate-800 text-white border-slate-800 shadow-md transform scale-105"
                                                                                                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-white"
                                                                                        )}
                                                                                    >
                                                                                        {spec}
                                                                                    </button>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            }
                                                            return null;
                                                        })()}
                                                    </>
                                                )}

                                                {/* Error Message */}
                                                {hasError && (
                                                    <div className="absolute -bottom-5 left-0 flex items-center gap-1 text-xs font-bold text-red-500 animate-in fade-in slide-in-from-top-1">
                                                        <AlertCircle size={10} />
                                                        {errors[field.id]}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )
                                    }
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer Navigation */}
                <div className="p-6 sm:p-8 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                    {/* Back Button */}
                    <div className="flex-1">
                        {!isFirstStep && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleBack}
                                className="px-6 border-slate-300 hover:bg-white hover:text-slate-900"
                            >
                                Back
                            </Button>
                        )}
                    </div>

                    {/* Next/Submit Button */}
                    <div className="flex-1 flex justify-end">
                        {!isLastStep ? (
                            <Button
                                type="button"
                                onClick={handleNext}
                                className="px-8 bg-primary-600 hover:bg-primary-700 text-white shadow-lg shadow-primary-500/30"
                            >
                                Next Step
                            </Button>
                        ) : (
                            <Button
                                type="submit"
                                onClick={handleSubmit}
                                className="px-8 bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-500/30"
                            >
                                Submit Registration
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </form >
    );
};

export default FormRenderer;
