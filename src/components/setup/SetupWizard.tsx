'use client';


import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import {
    X, Check, Building2, User,
    Activity, Globe, FileText, ArrowLeft, ArrowRight,
    Clock, Plus, Trash2, Shield, Sparkles, CreditCard, Mic, Wand2, DollarSign
} from 'lucide-react';
import React, { useState } from 'react';
import { SmartTimePicker } from "@/components/ui/smart-time-picker";
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import clsx from 'clsx';
import { useAuth } from '@/context/AuthContext';
// import api from '@/utils/api'; // Re-adding api import
import { usePermissionApi } from '@/hooks/usePermissionApi';
import { PERMISSIONS } from '@/config/apiPermissions';

interface SetupWizardProps {
    isOpen: boolean;
    onClose: () => void;
    initialStepId?: string;
}

const ALL_STEPS = [ // Renamed from STEPS to ALL_STEPS to filter later
    { id: 'welcome', label: 'Welcome', icon: FileText, roles: ['CLINIC_ADMIN', 'DOCTOR', 'CLINIC_REPRESENTATIVE'] },
    { id: 'business', label: 'Business Information', icon: Building2, roles: ['CLINIC_ADMIN'] },
    { id: 'practitioner', label: 'Practitioner Setup', icon: User, roles: ['DOCTOR'] }, // Doctor only
    { id: 'ai_scribe', label: 'AI Assistant', icon: Sparkles, roles: ['DOCTOR'] },
    { id: 'services', label: 'Services', icon: Activity, roles: ['DOCTOR'] }, // Doctor only
    { id: 'payments', label: 'Payments & Deposits', icon: CreditCard, roles: ['CLINIC_ADMIN'] }, // Clinic only
    { id: 'portal', label: 'Online Portal', icon: Globe, roles: ['CLINIC_ADMIN'] }, // Clinic only
    { id: 'resources', label: 'Additional Resources', icon: FileText, roles: ['CLINIC_ADMIN', 'DOCTOR', 'CLINIC_REPRESENTATIVE'] },
];

const LocationPicker = dynamic(() => import('@/components/ui/LocationPicker').then(mod => mod.LocationPicker), { ssr: false });

const SetupWizard: React.FC<SetupWizardProps> = ({ isOpen, onClose, initialStepId }) => {
    const { user } = useAuth();
    const { get: apiGet, post: apiPost, patch: apiPatch, delete: apiDelete } = usePermissionApi();
    const [activeStepIndex, setActiveStepIndex] = useState(0);

    // Filter steps based on role
    const STEPS = ALL_STEPS.filter(step => !step.roles || step.roles.includes(user?.role || 'DOCTOR'));

    // Handle initial step
    React.useEffect(() => {
        if (isOpen && initialStepId) {
            const index = STEPS.findIndex(s => s.id === initialStepId);
            if (index !== -1) {
                setActiveStepIndex(index);
            } else {
                setActiveStepIndex(0);
            }
        } else if (isOpen) {
            setActiveStepIndex(0);
        }
    }, [isOpen, initialStepId, STEPS.length]); // Use length as proxy for STEPS change to avoid loop if STEPS is new ref every render

    const [formData, setFormData] = useState({
        clinicId: null as string | null, // Track IDs
        practitionerId: null as string | null,
        businessName: '',
        address: '',
        phone: '',
        mapLink: '', // Added mapLink
        mapPin: '', // Added mapPin
        latitude: null as number | null,
        longitude: null as number | null,
        timezone: 'America/New_York',
        practitionerName: '',
        email: '', // Added email
        specialties: [''] as string[],
        consultationType: 'Mixed', // Default
        slotDuration: 30, // Default slot duration
        breakTime: 0, // Default break time
        services: [] as { id: string; name: string; duration: number; price: number }[],
        cancellationPolicy: '24h',
        schedule: [
            { day: 'Mon', active: true, slots: [{ start: '09:00', end: '17:00', type: 'in-person' }] },
            { day: 'Tue', active: true, slots: [{ start: '09:00', end: '17:00', type: 'in-person' }] },
            { day: 'Wed', active: true, slots: [{ start: '09:00', end: '17:00', type: 'in-person' }] },
            { day: 'Thu', active: true, slots: [{ start: '09:00', end: '17:00', type: 'in-person' }] },
            { day: 'Fri', active: true, slots: [{ start: '09:00', end: '13:00', type: 'in-person' }] },
            { day: 'Sat', active: false, slots: [] },
            { day: 'Sun', active: false, slots: [] },
        ],
        aiSettings: {
            enabled: true,
            ambientMode: true,
            noteStyle: 'SOAP',
            autoShare: false
        },
        paymentSettings: {
            requireCard: true,
            depositAmount: 50,
            currency: 'USD',
            acceptInsurance: true
        }
    });

    // Track saved state to determine button text
    const [savedData, setSavedData] = useState<typeof formData | null>(null);

    // Hydrate data on open
    React.useEffect(() => {
        if (isOpen) {
            const fetchData = async () => {
                try {
                    let clinicRes, userRes, serviceRes;

                    // 1. Fetch Clinic
                    if (user?.clinicId) {
                        clinicRes = await apiGet(PERMISSIONS.VIEW_CLINIC, `/clinics/${user.clinicId}`);
                    } else {
                        clinicRes = await apiGet(PERMISSIONS.VIEW_ALL_CLINICS, '/clinics');
                    }

                    // 2. Fetch Users (Doctors)
                    if (user?.role === 'DOCTOR') {
                        userRes = { data: [user] };
                    } else {
                        userRes = await apiGet(PERMISSIONS.VIEW_STAFF, '/users?role=doctor');
                    }

                    // 3. Fetch Services
                    serviceRes = await apiGet(PERMISSIONS.VIEW_CLINIC, '/services');

                    // Handle responses: findOne returns object, findAll returns array
                    const clinic = (clinicRes?.data && Array.isArray(clinicRes.data))
                        ? clinicRes.data[0]
                        : clinicRes?.data;

                    const doctor = userRes?.data?.[0]; // Assuming single doctor for now
                    const services = serviceRes?.data || [];

                    // Helper to migrate or normalize schedule data
                    const normalizeSchedule = (scheduleData: any) => {
                        let days = scheduleData;
                        let duration = 30;

                        // Handle new object structure { days: [...], slotDuration: 30 }
                        if (scheduleData && !Array.isArray(scheduleData) && scheduleData.days) {
                            days = scheduleData.days;
                            duration = scheduleData.slotDuration || 30;
                        }

                        if (!days || !Array.isArray(days)) {
                            return {
                                days: [
                                    { day: 'Mon', active: true, slots: [{ start: '09:00', end: '17:00', type: 'in-person' }] },
                                    { day: 'Tue', active: true, slots: [{ start: '09:00', end: '17:00', type: 'in-person' }] },
                                    { day: 'Wed', active: true, slots: [{ start: '09:00', end: '17:00', type: 'in-person' }] },
                                    { day: 'Thu', active: true, slots: [{ start: '09:00', end: '17:00', type: 'in-person' }] },
                                    { day: 'Fri', active: true, slots: [{ start: '09:00', end: '13:00', type: 'in-person' }] },
                                    { day: 'Sat', active: false, slots: [] },
                                    { day: 'Sun', active: false, slots: [] },
                                ],
                                duration
                            };
                        }

                        // Handle migration from legacy flat structure
                        const normalizedDays = days.map((day: any) => {
                            if (day.slots) return day; // Already new format

                            // Convert flat to slots
                            const slots = [];
                            if (day.active && day.start && day.end) {
                                slots.push({ start: day.start, end: day.end, type: 'in-person' });
                            }
                            return {
                                day: day.day,
                                active: day.active,
                                slots: slots
                            };
                        });

                        return { days: normalizedDays, duration };
                    };

                    const normalizedSchedule = normalizeSchedule(doctor?.schedule);

                    const hydratedData = {
                        clinicId: clinic?.id || null, // Hydrate IDs
                        practitionerId: doctor?.id || null,
                        businessName: clinic?.name || '',
                        address: clinic?.address || '',
                        phone: clinic?.phone || '',
                        mapLink: clinic?.mapLink || '',
                        mapPin: clinic?.mapPin || '',
                        timezone: doctor?.timezone || clinic?.timezone || 'America/New_York', // Hydrate timezone
                        practitionerName: doctor?.name || '',
                        email: doctor?.email || '', // Hydrate email
                        consultationType: doctor?.consultationType || 'Mixed',
                        specialties: (doctor?.specialties && doctor.specialties.length > 0) ? doctor.specialties : [''],
                        slotDuration: normalizedSchedule.duration,
                        breakTime: doctor?.breakTime || 0,
                        cancellationPolicy: '24h',
                        schedule: normalizedSchedule.days,
                        services: services.map((s: any) => ({
                            id: s.id,
                            name: s.name,
                            duration: typeof s.duration === 'string' ? parseInt(s.duration) : s.duration, // Parse "45 Minutes" -> 45
                            price: s.price
                        })) || [],
                        aiSettings: {
                            enabled: true,
                            ambientMode: true,
                            noteStyle: 'SOAP',
                            autoShare: false
                        },
                        paymentSettings: {
                            requireCard: true,
                            depositAmount: 50,
                            currency: 'USD',
                            acceptInsurance: true
                        },
                        latitude: clinic?.latitude || null,
                        longitude: clinic?.longitude || null,
                    };

                    setFormData(hydratedData);
                    setSavedData(JSON.parse(JSON.stringify(hydratedData))); // Deep copy for comparison

                } catch (error) {
                    console.error("Failed to hydrate wizard data", error);
                }
            };
            fetchData();
        }
    }, [isOpen]);


    // Toast state managed by sonner globally

    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        toast(message, {
            description: type === 'error' ? 'Please check your inputs.' : 'Operation successful.',
            action: {
                label: 'Dismiss',
                onClick: () => console.log('Dismissed'),
            },
        });
    };

    // START: Completeness Logic
    const calculateCompleteness = () => {
        let fields: boolean[] = [];

        if (user?.role === 'CLINIC_ADMIN') {
            fields = [
                !!formData.businessName?.trim(),
                !!formData.phone?.trim(),
                !!formData.address?.trim()
            ];
        } else if (user?.role === 'DOCTOR') {
            fields = [
                !!formData.practitionerName?.trim(),
                !!formData.email?.trim(),
                !!(formData.specialties?.length > 0 && formData.specialties[0]),
                !!formData.schedule?.some(day => day.active),
                !!(formData.services?.length > 0)
            ];
        }

        if (fields.length === 0) return 0;

        const score = fields.filter(Boolean).length;
        return Math.round((score / fields.length) * 100);
    };

    const completeness = calculateCompleteness();
    // END: Completeness Logic

    const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false);

    const handleLocationSelect = (lat: number, lng: number) => {
        const googleMapsLink = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
        setFormData(prev => ({
            ...prev,
            latitude: lat,
            longitude: lng,
            mapLink: googleMapsLink
        }));
    };

    const activeStep = STEPS[activeStepIndex];
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Validation Logic
    const isCurrentStepValid = () => {
        switch (activeStep.id) {
            case 'business':
                return !!(
                    (user?.role === 'CLINIC_ADMIN' ? formData.businessName.trim() : true) &&
                    (user?.role === 'CLINIC_ADMIN' ? formData.phone.trim() : true) &&
                    (user?.role === 'CLINIC_ADMIN' ? formData.address.trim() : true) &&
                    (user?.role === 'DOCTOR' ? formData.timezone : true)
                );
            case 'practitioner':
                return formData.schedule.some(day => day.active) && formData.specialties.length > 0 && !!formData.specialties[0] && !!formData.email;
            case 'services':
                return formData.services.length > 0;
            default:
                return true;
        }
    };

    // Helper to check if current step needs saving (dirty OR new record)
    const needsSaving = () => {
        if (!savedData) return true;

        // Always save if the core ID for this step is missing (implies not persisted yet)
        if (activeStep.id === 'business' && !formData.clinicId) return true;
        if (activeStep.id === 'practitioner' && !formData.practitionerId) return true;

        switch (activeStep.id) {
            case 'business':
                return (
                    formData.businessName !== savedData.businessName ||
                    formData.phone !== savedData.phone ||
                    formData.address !== savedData.address ||
                    formData.timezone !== savedData.timezone
                );
            case 'practitioner':
                return (
                    formData.practitionerName !== savedData.practitionerName ||
                    formData.email !== savedData.email ||
                    formData.timezone !== savedData.timezone ||
                    JSON.stringify(formData.specialties) !== JSON.stringify(savedData.specialties) ||
                    JSON.stringify(formData.schedule) !== JSON.stringify(savedData.schedule) ||
                    formData.slotDuration !== savedData.slotDuration
                );
            case 'services':
                // For services, if any service lacks an ID (or we treat them all as needing save if changed)
                // If the list is different, save.
                return JSON.stringify(formData.services) !== JSON.stringify(savedData.services);
            default:
                return false;
        }
    };

    const getMissingFields = (stepId?: string) => {
        const missing: string[] = [];
        const checkGlobal = !stepId; // If no specific step, check all for completeness

        // Business (Only for Clinic Admin)
        if ((checkGlobal && user?.role === 'CLINIC_ADMIN') || stepId === 'business') {
            if (user?.role === 'CLINIC_ADMIN') {
                if (!formData.businessName.trim()) missing.push("Clinic Name");
                if (!formData.phone.trim()) missing.push("Phone Number");
                if (!formData.address.trim()) missing.push("Address");
            }
        }

        // Practitioner (Only for Doctor)
        if ((checkGlobal && user?.role === 'DOCTOR') || stepId === 'practitioner') {
            if (user?.role === 'DOCTOR') {
                if (!formData.practitionerName.trim()) missing.push("Practitioner Name");
                if (!formData.email.trim()) missing.push("Email");
                if (!formData.timezone) missing.push("Timezone");
                if (formData.specialties.length === 0 || !formData.specialties[0]) missing.push("Specialty");
                if (!formData.schedule.some(day => day.active)) missing.push("At least one active schedule day");
            }
        }

        // Services (Only for Doctor)
        if ((checkGlobal && user?.role === 'DOCTOR') || stepId === 'services') {
            if (user?.role === 'DOCTOR' && (!formData.services || formData.services.length === 0)) {
                // console.log('[SetupWizard] Missing services'); // Debug
                missing.push("At least one Service");
            }
        }

        // Console log validation failures for debugging
        if (missing.length > 0 && !checkGlobal) {
            console.log(`[SetupWizard] Validation failed for ${stepId}:`, missing);
        }

        return missing;
    };

    const saveStepData = async () => {
        console.log('[SetupWizard] saveStepData CALLED for:', activeStep.id);
        console.log('[SetupWizard] Current FormData:', JSON.stringify(formData, null, 2));
        try {
            // Track updates to apply to both formData and savedData
            const updates: Partial<typeof formData> = {};

            console.log('[SetupWizard] Entering switch case...');
            switch (activeStep.id) {
                case 'business':
                    const clinicPayload = {
                        name: formData.businessName,
                        address: formData.address,
                        phone: formData.phone,
                        mapLink: formData.mapLink,
                        mapPin: formData.mapPin,
                        latitude: formData.latitude,
                        longitude: formData.longitude,
                        timezone: formData.timezone
                    };
                    try {
                        let res;
                        if (formData.clinicId) {
                            res = await apiPatch(PERMISSIONS.MANAGE_CLINIC, `/clinics/${formData.clinicId}`, clinicPayload);
                        } else {
                            res = await apiPost(PERMISSIONS.MANAGE_CLINIC, '/clinics', clinicPayload);
                        }
                        if (res?.data?.id) {
                            updates.clinicId = res.data.id;
                        }
                    } catch (error) {
                        console.error("Failed to save clinic data", error);
                        throw error;
                    }
                    break;
                case 'practitioner':
                    const userPayload = {
                        name: formData.practitionerName,
                        role: 'DOCTOR',
                        email: formData.email,
                        timezone: formData.timezone, // Save Timezone
                        consultationType: formData.consultationType,
                        specialties: formData.specialties.filter(s => s.trim() !== ''),
                        schedule: {
                            days: formData.schedule,
                            slotDuration: formData.slotDuration
                        },
                        breakTime: formData.breakTime || 0
                    };
                    console.log('[SetupWizard] Saving Practitioner. Payload:', userPayload);
                    console.log('[SetupWizard] Existing PractitionerId:', formData.practitionerId);

                    if (formData.practitionerId) {
                        console.log('[SetupWizard] Calling PATCH /users/' + formData.practitionerId);

                        // Fix for Self-Update: Doctor updating own profile shouldn't need MANAGE_STAFF
                        // If targeting self, bypass client-side permission check (backend still validates ID match)
                        const permission = (user?.id === formData.practitionerId) ? null : PERMISSIONS.MANAGE_STAFF;

                        await apiPatch(permission, `/users/${formData.practitionerId}`, userPayload);
                    } else {
                        console.log('[SetupWizard] Calling POST /users');
                        const res = await apiPost(PERMISSIONS.MANAGE_STAFF, '/users', userPayload);
                        if (res?.data?.id) {
                            updates.practitionerId = res.data.id;
                        }
                    }
                    break;
                case 'services':
                    try {
                        const permission = PERMISSIONS.MANAGE_OWN_PROFILE; // Doctor needs to view services
                        const servicesRes = await apiGet(permission, '/services');
                        const dbServices = servicesRes?.data || [];
                        const formServiceIds = new Set(formData.services.map(s => s.id));

                        // 1. DELETE: Services in DB but not in Form
                        const toDelete = dbServices.filter((s: any) => !formServiceIds.has(s.id));
                        await Promise.all(toDelete.map((s: any) => apiDelete(PERMISSIONS.MANAGE_OWN_PROFILE, `/services/${s.id}`)));

                        // 2. CREATE & UPDATE
                        const updatedServicesState: typeof formData.services = [];
                        for (const s of formData.services) {
                            const durationStr = s.duration.toString().includes('Minutes')
                                ? s.duration
                                : `${s.duration} Minutes`;

                            const payload = {
                                name: s.name,
                                duration: durationStr,
                                price: s.price,
                                doctorId: user?.id,
                                clinicId: formData.clinicId || user?.clinicId
                            };

                            const existsInDb = dbServices.some((dbS: any) => dbS.id === s.id);

                            // DOCTOR: Use MANAGE_OWN_PROFILE (maps to manage_own_config) instead of MANAGE_SERVICES (maps to manage_clinic_info)
                            // This ensures Doctors can manage their services.
                            const permission = PERMISSIONS.MANAGE_OWN_PROFILE;

                            if (existsInDb) {
                                await apiPatch(permission, `/services/${s.id}`, payload);
                                updatedServicesState.push(s);
                            } else {
                                const res = await apiPost(permission, '/services', payload);
                                if (res?.data?.id) {
                                    updatedServicesState.push({ ...s, id: res.data.id });
                                }
                            }
                        }

                        updates.services = updatedServicesState;
                    } catch (error) {
                        console.error("Failed to sync services", error);
                        throw error;
                    }
                    break;
            }

            // Apply updates to formData
            if (Object.keys(updates).length > 0) {
                setFormData(prev => ({ ...prev, ...updates }));
            }

            // Update savedData with current formData + new updates
            setSavedData(prev => ({ ...prev, ...formData, ...updates }));

        } catch (error) {
            console.error(`Failed to save step ${activeStep.id}`, error);
            throw error;
        }
    };

    const handleNext = async () => {
        console.log('[SetupWizard] handleNext CLICKED for step:', activeStep.id);
        const missing = getMissingFields(activeStep.id);
        if (missing.length > 0) {
            console.log('[SetupWizard] Validation FAILED:', missing);
            showToast(`Please complete: ${missing.join(', ')}`, 'error');
            return;
        }
        console.log('[SetupWizard] Validation PASSED. Proceeding to save...');

        setIsSubmitting(true);
        try {
            // Force save every time "Save & Continue" is clicked to ensure persistence
            // if (needsSaving()) { 
            await saveStepData();
            // }

            if (activeStepIndex < STEPS.length - 1) {
                setActiveStepIndex(prev => prev + 1);
            } else {
                await handleFinish();
            }
        } catch (e) {
            showToast("Failed to save progress. Please try again.", 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleFinish = async () => {
        const missing = getMissingFields(); // Global check
        if (missing.length > 0) {
            showToast(`Please complete the following to finish: ${missing.join(', ')}`, 'error');
            return;
        }

        try {
            // Save remaining settings if any (AI, Payments)
            onClose();
        } catch (error) {
            console.error("Failed to finish setup:", error);
            showToast("Failed to finalize. Please try again.", 'error');
        }
    };

    const handleBack = () => {
        if (activeStepIndex > 0) {
            setActiveStepIndex(prev => prev - 1);
        }
    };

    const handleStepClick = async (index: number) => {
        if (isSubmitting || index === activeStepIndex) return;

        // If moving forward, enforce validation and saving
        if (index > activeStepIndex) {
            const missing = getMissingFields(activeStep.id);
            if (missing.length > 0) {
                showToast(`Please complete: ${missing.join(', ')}`, 'error');
                return;
            }

            // Force save when moving forward via stepper
            // if (needsSaving()) {
            setIsSubmitting(true);
            try {
                await saveStepData();
                setActiveStepIndex(index);
            } catch (e) {
                showToast("Failed to save progress.", 'error');
            } finally {
                setIsSubmitting(false);
            }
            // } else {
            //     setActiveStepIndex(index);
            // }
        } else {
            // Moving backward allows review without forced saving
            setActiveStepIndex(index);
        }
    };


    // Helper for Service Management
    const addService = () => {
        setFormData(prev => ({
            ...prev,
            services: [...prev.services, { id: Date.now().toString(), name: '', duration: 30, price: 0 }]
        }));
    };

    const updateService = (id: string, field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            services: prev.services.map(s => s.id === id ? { ...s, [field]: value } : s)
        }));
    };

    const removeService = (id: string) => {
        setFormData(prev => ({
            ...prev,
            services: prev.services.filter(s => s.id !== id)
        }));
    };

    // Helper for Availability
    const toggleDay = (index: number) => {
        const newSchedule = [...formData.schedule];
        newSchedule[index].active = !newSchedule[index].active;
        if (newSchedule[index].active && newSchedule[index].slots.length === 0) {
            newSchedule[index].slots.push({ start: '09:00', end: '17:00', type: formData.consultationType === 'Online' ? 'online' : 'in-person' });
        }
        setFormData({ ...formData, schedule: newSchedule });
    };

    if (!isOpen) return null;

    const isPractitionerStep = (user?.role === 'DOCTOR');
    const isClinicStep = (user?.role === 'CLINIC_ADMIN');
    const isStaffStep = (user?.role === 'CLINIC_ADMIN');
    const isServicesStep = (user?.role === 'CLINIC_ADMIN');
    const isScheduleStep = (user?.role === 'DOCTOR');

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 lg:p-8">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl h-full max-h-[800px] flex overflow-hidden border border-slate-100"
            >
                {/* Left Sidebar - Stepper */}
                <div className="w-80 bg-slate-50 border-r border-slate-100 flex flex-col p-8 hidden md:flex">
                    <div className="mb-10">
                        <div className="flex items-center gap-3 text-primary-600 mb-2">
                            <div className="w-8 h-8 rounded-xl bg-primary-100 flex items-center justify-center">
                                <Activity size={20} />
                            </div>
                            <span className="font-black text-xl tracking-tight">Setup</span>
                        </div>
                        <p className="text-slate-500 text-sm">Let's get your practice up and running.</p>
                    </div>

                    <div className="space-y-1 relative">
                        {/* Vertical Line */}
                        <div className="absolute left-[15px] top-4 bottom-4 w-0.5 bg-slate-200 -z-10"></div>

                        {STEPS.map((step, index) => {
                            const isActive = index === activeStepIndex;
                            const isCompleted = index < activeStepIndex;

                            return (
                                <div
                                    key={step.id}
                                    onClick={() => handleStepClick(index)}
                                    className={clsx(
                                        "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all",
                                        isActive ? "bg-white shadow-sm ring-1 ring-slate-100" : "hover:bg-slate-100/50"
                                    )}
                                >
                                    <div className={clsx(
                                        "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors z-10 border-2",
                                        isActive ? "bg-primary-600 border-primary-600 text-white" :
                                            isCompleted ? "bg-green-500 border-green-500 text-white" : "bg-white border-slate-300 text-slate-400"
                                    )}>
                                        {isCompleted ? <Check size={14} /> : index + 1}
                                    </div>
                                    <div className="flex-1">
                                        <p className={clsx("text-sm font-bold", isActive ? "text-slate-900" : "text-slate-500")}>
                                            {step.label}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Right Content Area */}
                <div className="flex-1 flex flex-col bg-white">
                    {/* Progress Header */}
                    {/* Progress Header - Only show if incomplete */}
                    {completeness < 100 && (
                        <div className="bg-slate-50 border-b border-slate-100 px-8 py-2">
                            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                                <span>Profile Completeness</span>
                                <span className={completeness === 100 ? "text-green-600" : "text-primary-600"}>{completeness}%</span>
                            </div>
                            <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                <motion.div
                                    className={clsx("h-full rounded-full transition-all duration-500", completeness === 100 ? "bg-green-500" : "bg-primary-500")}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${completeness}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Header */}
                    <div className="h-16 border-b border-slate-50 flex items-center justify-between px-8 bg-white shrink-0">
                        <h2 className="text-xl font-bold text-slate-900">{activeStep.label}</h2>
                        <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full text-slate-400 transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content Scrollable */}
                    <div className="flex-1 overflow-y-auto p-8 lg:p-12">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeStep.id}
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="max-w-3xl mx-auto"
                            >
                                {/* Step 1: Welcome */}
                                {activeStep.id === 'welcome' && (
                                    <div className="text-center py-10">
                                        <div className="w-24 h-24 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                            <Building2 size={40} className="text-primary-600" />
                                        </div>
                                        <h3 className="text-2xl font-black text-slate-900 mb-4">Welcome to MediFlow</h3>
                                        <p className="text-slate-500 max-w-md mx-auto leading-relaxed mb-8">
                                            We'll guide you through setting up your practice profile, services, and availability.
                                            This information will populate your patient portal and scheduling system.
                                        </p>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                                            <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50">
                                                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 mb-3"><User size={18} /></div>
                                                <h4 className="font-bold text-slate-900 text-sm">Profile</h4>
                                                <p className="text-xs text-slate-500 mt-1">Setup DOCTOR details</p>
                                            </div>
                                            <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50">
                                                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600 mb-3"><Activity size={18} /></div>
                                                <h4 className="font-bold text-slate-900 text-sm">Services</h4>
                                                <p className="text-xs text-slate-500 mt-1">Define appointment types</p>
                                            </div>
                                            <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50">
                                                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center text-green-600 mb-3"><Clock size={18} /></div>
                                                <h4 className="font-bold text-slate-900 text-sm">Schedule</h4>
                                                <p className="text-xs text-slate-500 mt-1">Set your availability</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Step 2: Business Info */}
                                {activeStep.id === 'business' && (
                                    <div className="space-y-6">
                                        <div>
                                            <Label className="mb-2">Clinic Name {user?.role === 'CLINIC_ADMIN' && <span className="text-red-500">*</span>}</Label>
                                            <Input
                                                type="text"
                                                value={formData.businessName}
                                                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                                                placeholder="e.g. City Medical Group"
                                                disabled={user?.role !== 'CLINIC_ADMIN'}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-6">
                                            <div>
                                                <Label className="mb-2">Phone Number {user?.role === 'CLINIC_ADMIN' && <span className="text-red-500">*</span>}</Label>
                                                <Input
                                                    type="tel"
                                                    value={formData.phone}
                                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                                    placeholder="(555) 000-0000"
                                                    disabled={user?.role !== 'CLINIC_ADMIN'}
                                                />
                                            </div>
                                            {user?.role === 'DOCTOR' && (
                                                <div>
                                                    <Label className="mb-2">Timezone <span className="text-red-500">*</span></Label>
                                                    <select
                                                        value={formData.timezone}
                                                        onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all"
                                                    >
                                                        <optgroup label="North America">
                                                            <option value="America/New_York">Eastern Time - New York</option>
                                                            <option value="America/Chicago">Central Time - Chicago</option>
                                                            <option value="America/Denver">Mountain Time - Denver</option>
                                                            <option value="America/Los_Angeles">Pacific Time - Los Angeles</option>
                                                            <option value="America/Anchorage">Alaska Time - Anchorage</option>
                                                            <option value="Pacific/Honolulu">Hawaii Time - Honolulu</option>
                                                            <option value="America/Phoenix">Arizona - Phoenix</option>
                                                            <option value="America/Toronto">Toronto</option>
                                                            <option value="America/Vancouver">Vancouver</option>
                                                            <option value="America/Mexico_City">Mexico City</option>
                                                        </optgroup>
                                                        <optgroup label="Europe">
                                                            <option value="Europe/London">London (GMT/BST)</option>
                                                            <option value="Europe/Paris">Paris</option>
                                                            <option value="Europe/Berlin">Berlin</option>
                                                            <option value="Europe/Rome">Rome</option>
                                                            <option value="Europe/Madrid">Madrid</option>
                                                            <option value="Europe/Amsterdam">Amsterdam</option>
                                                            <option value="Europe/Brussels">Brussels</option>
                                                            <option value="Europe/Vienna">Vienna</option>
                                                            <option value="Europe/Stockholm">Stockholm</option>
                                                            <option value="Europe/Copenhagen">Copenhagen</option>
                                                            <option value="Europe/Warsaw">Warsaw</option>
                                                            <option value="Europe/Prague">Prague</option>
                                                            <option value="Europe/Athens">Athens</option>
                                                            <option value="Europe/Helsinki">Helsinki</option>
                                                            <option value="Europe/Moscow">Moscow</option>
                                                            <option value="Europe/Istanbul">Istanbul</option>
                                                            <option value="Europe/Dublin">Dublin</option>
                                                            <option value="Europe/Lisbon">Lisbon</option>
                                                        </optgroup>
                                                        <optgroup label="Asia">
                                                            <option value="Asia/Dubai">Dubai</option>
                                                            <option value="Asia/Kolkata">Mumbai</option>
                                                            <option value="Asia/Dhaka">Dhaka</option>
                                                            <option value="Asia/Bangkok">Bangkok</option>
                                                            <option value="Asia/Singapore">Singapore</option>
                                                            <option value="Asia/Hong_Kong">Hong Kong</option>
                                                            <option value="Asia/Shanghai">Shanghai</option>
                                                            <option value="Asia/Tokyo">Tokyo</option>
                                                            <option value="Asia/Seoul">Seoul</option>
                                                            <option value="Asia/Jakarta">Jakarta</option>
                                                            <option value="Asia/Manila">Manila</option>
                                                            <option value="Asia/Kuala_Lumpur">Kuala Lumpur</option>
                                                            <option value="Asia/Karachi">Karachi</option>
                                                            <option value="Asia/Taipei">Taipei</option>
                                                        </optgroup>
                                                        <optgroup label="Australia & Pacific">
                                                            <option value="Australia/Sydney">Sydney</option>
                                                            <option value="Australia/Melbourne">Melbourne</option>
                                                            <option value="Australia/Brisbane">Brisbane</option>
                                                            <option value="Australia/Perth">Perth</option>
                                                            <option value="Australia/Adelaide">Adelaide</option>
                                                            <option value="Pacific/Auckland">Auckland</option>
                                                        </optgroup>
                                                        <optgroup label="South America">
                                                            <option value="America/Argentina/Buenos_Aires">Buenos Aires</option>
                                                            <option value="America/Sao_Paulo">São Paulo</option>
                                                            <option value="America/Bogota">Bogotá</option>
                                                            <option value="America/Lima">Lima</option>
                                                            <option value="America/Santiago">Santiago</option>
                                                            <option value="America/Caracas">Caracas</option>
                                                        </optgroup>
                                                        <optgroup label="Africa">
                                                            <option value="Africa/Cairo">Cairo</option>
                                                            <option value="Africa/Johannesburg">Johannesburg</option>
                                                            <option value="Africa/Lagos">Lagos</option>
                                                            <option value="Africa/Nairobi">Nairobi</option>
                                                            <option value="Africa/Casablanca">Casablanca</option>
                                                        </optgroup>
                                                        <optgroup label="UTC">
                                                            <option value="UTC">UTC (Coordinated Universal Time)</option>
                                                        </optgroup>
                                                    </select>
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <Label className="mb-2">Address {user?.role === 'CLINIC_ADMIN' && <span className="text-red-500">*</span>}</Label>
                                            <Textarea
                                                value={formData.address}
                                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                                placeholder="123 Medical Plaza, Suite 100&#10;New York, NY 10001"
                                                className="min-h-[100px]"
                                                disabled={user?.role !== 'CLINIC_ADMIN'}
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-6">
                                            <div>
                                                <Label className="mb-2 flex items-center gap-2">
                                                    <Globe size={14} /> Map Link (Google Maps)
                                                </Label>
                                                <Input
                                                    type="url"
                                                    value={formData.mapLink}
                                                    onChange={(e) => setFormData({ ...formData, mapLink: e.target.value })}
                                                    placeholder="https://maps.google.com/..."
                                                    disabled={user?.role !== 'CLINIC_ADMIN'}
                                                />
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="mt-2 w-full flex items-center gap-2 rounded-xl border-dashed"
                                                    onClick={() => setIsLocationPickerOpen(true)}
                                                >
                                                    <Globe size={14} /> Select on Map
                                                </Button>
                                            </div>
                                        </div>
                                        <LocationPicker
                                            isOpen={isLocationPickerOpen}
                                            onClose={() => setIsLocationPickerOpen(false)}
                                            onSelect={handleLocationSelect}
                                            initialLat={formData.latitude || undefined}
                                            initialLng={formData.longitude || undefined}
                                        />
                                    </div>
                                )}

                                {/* Step 3: Practitioner & Availability */}
                                {activeStep.id === 'practitioner' && (
                                    <div className="space-y-8">
                                        <div className="grid grid-cols-1 gap-6">
                                            <div>
                                                <Label className="mb-2">Full Name <span className="text-red-500">*</span></Label>
                                                <Input
                                                    type="text"
                                                    value={formData.practitionerName}
                                                    onChange={(e) => setFormData({ ...formData, practitionerName: e.target.value })}
                                                    placeholder="Dr. Jane Doe"
                                                />
                                            </div>
                                            <div>
                                                <Label className="mb-2">Email Address <span className="text-red-500">*</span></Label>
                                                <Input
                                                    type="email"
                                                    value={formData.email}
                                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                    placeholder="DOCTOR@example.com"
                                                />
                                            </div>

                                            <div>
                                                <Label className="mb-2">Timezone <span className="text-red-500">*</span></Label>
                                                <select
                                                    value={formData.timezone}
                                                    onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all"
                                                >
                                                    <optgroup label="North America">
                                                        <option value="America/New_York">Eastern Time - New York</option>
                                                        <option value="America/Chicago">Central Time - Chicago</option>
                                                        <option value="America/Denver">Mountain Time - Denver</option>
                                                        <option value="America/Los_Angeles">Pacific Time - Los Angeles</option>
                                                        <option value="America/Anchorage">Alaska Time - Anchorage</option>
                                                        <option value="Pacific/Honolulu">Hawaii Time - Honolulu</option>
                                                        <option value="America/Phoenix">Arizona - Phoenix</option>
                                                        <option value="America/Toronto">Toronto</option>
                                                        <option value="America/Vancouver">Vancouver</option>
                                                        <option value="America/Mexico_City">Mexico City</option>
                                                    </optgroup>
                                                    <optgroup label="Europe">
                                                        <option value="Europe/London">London (GMT/BST)</option>
                                                        <option value="Europe/Paris">Paris</option>
                                                        <option value="Europe/Berlin">Berlin</option>
                                                        <option value="Europe/Rome">Rome</option>
                                                        <option value="Europe/Madrid">Madrid</option>
                                                        <option value="Europe/Amsterdam">Amsterdam</option>
                                                        <option value="Europe/Brussels">Brussels</option>
                                                        <option value="Europe/Vienna">Vienna</option>
                                                        <option value="Europe/Stockholm">Stockholm</option>
                                                        <option value="Europe/Copenhagen">Copenhagen</option>
                                                        <option value="Europe/Warsaw">Warsaw</option>
                                                        <option value="Europe/Prague">Prague</option>
                                                        <option value="Europe/Athens">Athens</option>
                                                        <option value="Europe/Helsinki">Helsinki</option>
                                                        <option value="Europe/Moscow">Moscow</option>
                                                        <option value="Europe/Istanbul">Istanbul</option>
                                                        <option value="Europe/Dublin">Dublin</option>
                                                        <option value="Europe/Lisbon">Lisbon</option>
                                                    </optgroup>
                                                    <optgroup label="Asia">
                                                        <option value="Asia/Dubai">Dubai</option>
                                                        <option value="Asia/Kolkata">Mumbai</option>
                                                        <option value="Asia/Dhaka">Dhaka</option>
                                                        <option value="Asia/Bangkok">Bangkok</option>
                                                        <option value="Asia/Singapore">Singapore</option>
                                                        <option value="Asia/Hong_Kong">Hong Kong</option>
                                                        <option value="Asia/Shanghai">Shanghai</option>
                                                        <option value="Asia/Tokyo">Tokyo</option>
                                                        <option value="Asia/Seoul">Seoul</option>
                                                        <option value="Asia/Jakarta">Jakarta</option>
                                                        <option value="Asia/Manila">Manila</option>
                                                        <option value="Asia/Kuala_Lumpur">Kuala Lumpur</option>
                                                        <option value="Asia/Karachi">Karachi</option>
                                                        <option value="Asia/Taipei">Taipei</option>
                                                    </optgroup>
                                                    <optgroup label="Australia & Pacific">
                                                        <option value="Australia/Sydney">Sydney</option>
                                                        <option value="Australia/Melbourne">Melbourne</option>
                                                        <option value="Australia/Brisbane">Brisbane</option>
                                                        <option value="Australia/Perth">Perth</option>
                                                        <option value="Australia/Adelaide">Adelaide</option>
                                                        <option value="Pacific/Auckland">Auckland</option>
                                                    </optgroup>
                                                    <optgroup label="South America">
                                                        <option value="America/Argentina/Buenos_Aires">Buenos Aires</option>
                                                        <option value="America/Sao_Paulo">São Paulo</option>
                                                        <option value="America/Bogota">Bogotá</option>
                                                        <option value="America/Lima">Lima</option>
                                                        <option value="America/Santiago">Santiago</option>
                                                        <option value="America/Caracas">Caracas</option>
                                                    </optgroup>
                                                    <optgroup label="Africa">
                                                        <option value="Africa/Cairo">Cairo</option>
                                                        <option value="Africa/Johannesburg">Johannesburg</option>
                                                        <option value="Africa/Lagos">Lagos</option>
                                                        <option value="Africa/Nairobi">Nairobi</option>
                                                        <option value="Africa/Casablanca">Casablanca</option>
                                                    </optgroup>
                                                    <optgroup label="UTC">
                                                        <option value="UTC">UTC (Coordinated Universal Time)</option>
                                                    </optgroup>
                                                </select>
                                            </div>

                                            <div>
                                                <div className="flex justify-between items-center mb-2">
                                                    <label className="block text-sm font-bold text-slate-700">Specialties <span className="text-red-500">*</span></label>
                                                    <button
                                                        onClick={() => setFormData({ ...formData, specialties: [...formData.specialties, ''] })}
                                                        className="text-primary-600 text-sm font-bold hover:text-primary-700 flex items-center gap-1"
                                                    >
                                                        <Plus size={16} /> Add
                                                    </button>
                                                </div>
                                                <div className="space-y-3">
                                                    {formData.specialties.map((specialty, index) => (
                                                        <div key={index} className="flex gap-2">
                                                            <Input
                                                                type="text"
                                                                value={specialty}
                                                                onChange={(e) => {
                                                                    const newSpecialties = [...formData.specialties];
                                                                    newSpecialties[index] = e.target.value;
                                                                    setFormData({ ...formData, specialties: newSpecialties });
                                                                }}
                                                                placeholder="e.g. Cardiology"
                                                                className="flex-1"
                                                            />
                                                            {formData.specialties.length > 1 && (
                                                                <button
                                                                    onClick={() => {
                                                                        const newSpecialties = formData.specialties.filter((_, i) => i !== index);
                                                                        setFormData({ ...formData, specialties: newSpecialties });
                                                                    }}
                                                                    className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                                >
                                                                    <Trash2 size={20} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    ))}
                                                    {formData.specialties.length === 0 && (
                                                        <div
                                                            onClick={() => setFormData({ ...formData, specialties: [''] })}
                                                            className="p-4 border-2 border-dashed border-slate-200 rounded-xl text-center cursor-pointer hover:border-primary-200 hover:bg-primary-50/50 transition-all group"
                                                        >
                                                            <span className="text-slate-400 font-medium group-hover:text-primary-600">Click to add a specialty</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-500 mt-2">These will be available in the form builder logic.</p>
                                            </div>

                                            <div>
                                                <Label className="mb-2">Consultation Type <span className="text-red-500">*</span></Label>
                                                <div className="grid grid-cols-3 gap-3">
                                                    {['In-person', 'Online', 'Mixed'].map((type) => (
                                                        <div
                                                            key={type}
                                                            onClick={() => setFormData({ ...formData, consultationType: type })}
                                                            className={clsx(
                                                                "p-3 rounded-xl border text-center cursor-pointer transition-all font-medium text-sm",
                                                                formData.consultationType === type
                                                                    ? "border-primary-500 bg-primary-50 text-primary-700 ring-1 ring-primary-500"
                                                                    : "border-slate-200 hover:bg-slate-50 text-slate-600"
                                                            )}
                                                        >
                                                            {type}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div>
                                                <Label className="mb-2">Slot Duration <span className="text-red-500">*</span></Label>
                                                <div className="grid grid-cols-4 gap-3">
                                                    {[15, 30, 45, 60].map((duration) => (
                                                        <div
                                                            key={duration}
                                                            onClick={() => setFormData({ ...formData, slotDuration: duration })}
                                                            className={clsx(
                                                                "p-3 rounded-xl border text-center cursor-pointer transition-all font-medium text-sm",
                                                                formData.slotDuration === duration
                                                                    ? "border-primary-500 bg-primary-50 text-primary-700 ring-1 ring-primary-500"
                                                                    : "border-slate-200 hover:bg-slate-50 text-slate-600"
                                                            )}
                                                        >
                                                            {duration} Min
                                                        </div>
                                                    ))}
                                                </div>
                                                <p className="text-xs text-slate-500 mt-2">Time allocated for each appointment slot.</p>
                                            </div>

                                            <div>
                                                <Label className="mb-2">Break Time (Buffer) <span className="text-slate-400 font-normal">(Optional)</span></Label>
                                                <div className="grid grid-cols-4 gap-3">
                                                    {[0, 5, 10, 15, 30].map((time) => (
                                                        <div
                                                            key={time}
                                                            onClick={() => setFormData({ ...formData, breakTime: time })}
                                                            className={clsx(
                                                                "p-3 rounded-xl border text-center cursor-pointer transition-all font-medium text-sm",
                                                                (formData.breakTime ?? 0) === time
                                                                    ? "border-primary-500 bg-primary-50 text-primary-700 ring-1 ring-primary-500"
                                                                    : "border-slate-200 hover:bg-slate-50 text-slate-600"
                                                            )}
                                                        >
                                                            {time === 0 ? 'None' : `${time} Min`}
                                                        </div>
                                                    ))}
                                                </div>
                                                <p className="text-xs text-slate-500 mt-2">Gap between appointments.</p>
                                            </div>
                                        </div>

                                        <div>
                                            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                                                <Clock size={18} className="text-slate-400" />
                                                Weekly Schedule
                                            </h3>
                                            <div className="space-y-3">
                                                {formData.schedule.map((day, idx) => (
                                                    <div key={day.day} className={clsx(
                                                        "flex items-start gap-4 p-4 rounded-xl border transition-all",
                                                        day.active ? "bg-white border-slate-200 shadow-sm" : "bg-slate-50 border-slate-100 opacity-60"
                                                    )}>
                                                        <div className="w-20 pt-2">
                                                            <label className="flex items-center gap-3 cursor-pointer">
                                                                <input type="checkbox" checked={day.active} onChange={() => toggleDay(idx)} className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500" />
                                                                <span className="font-bold text-sm text-slate-700">{day.day}</span>
                                                            </label>
                                                        </div>
                                                        <div className="flex-1 space-y-2">
                                                            {day.active ? (
                                                                <>
                                                                    {day.slots.map((slot, sIdx) => (
                                                                        <div key={sIdx} className="flex items-center gap-3">
                                                                            <SmartTimePicker
                                                                                value={slot.start}
                                                                                onChange={(time) => {
                                                                                    const newSchedule = [...formData.schedule];
                                                                                    newSchedule[idx].slots[sIdx].start = time;
                                                                                    setFormData({ ...formData, schedule: newSchedule });
                                                                                }}
                                                                                className="w-32"
                                                                            />
                                                                            <span className="text-slate-400">-</span>
                                                                            <SmartTimePicker
                                                                                value={slot.end}
                                                                                onChange={(time) => {
                                                                                    const newSchedule = [...formData.schedule];
                                                                                    newSchedule[idx].slots[sIdx].end = time;
                                                                                    setFormData({ ...formData, schedule: newSchedule });
                                                                                }}
                                                                                className="w-32"
                                                                            />
                                                                            {formData.consultationType === 'Mixed' && (
                                                                                <select
                                                                                    value={slot.type || 'in-person'}
                                                                                    onChange={(e) => {
                                                                                        const newSchedule = [...formData.schedule];
                                                                                        newSchedule[idx].slots[sIdx].type = e.target.value;
                                                                                        setFormData({ ...formData, schedule: newSchedule });
                                                                                    }}
                                                                                    className="text-xs p-2 border border-slate-200 rounded-lg bg-slate-50 outline-none focus:ring-2 focus:ring-primary-100"
                                                                                >
                                                                                    <option value="in-person">In-Person</option>
                                                                                    <option value="online">Online</option>
                                                                                    <option value="both">Both</option>
                                                                                </select>
                                                                            )}
                                                                            {day.slots.length > 1 && (
                                                                                <button
                                                                                    onClick={() => {
                                                                                        const newSchedule = [...formData.schedule];
                                                                                        newSchedule[idx].slots = newSchedule[idx].slots.filter((_, i) => i !== sIdx);
                                                                                        setFormData({ ...formData, schedule: newSchedule });
                                                                                    }}
                                                                                    className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                                                                                >
                                                                                    <Trash2 size={16} />
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                    <button
                                                                        onClick={() => {
                                                                            const newSchedule = [...formData.schedule];
                                                                            newSchedule[idx].slots.push({ start: '13:00', end: '17:00', type: formData.consultationType === 'Online' ? 'online' : 'in-person' });
                                                                            setFormData({ ...formData, schedule: newSchedule });
                                                                        }}
                                                                        className="text-primary-600 text-xs font-bold hover:text-primary-700 flex items-center gap-1 mt-1"
                                                                    >
                                                                        <Plus size={14} /> Add Break / Split Shift
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <div className="py-2 text-sm text-slate-400 italic">Unavailable</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Step 4: AI Scribe (New) */}
                                {activeStep.id === 'ai_scribe' && (
                                    <div className="space-y-6">
                                        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white overflow-hidden relative">
                                            <div className="relative z-10">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                                                        <Sparkles size={20} className="text-white" />
                                                    </div>
                                                    <h3 className="text-lg font-bold">AI Companion</h3>
                                                </div>
                                                <p className="text-indigo-100 text-sm max-w-md">
                                                    Reduce documentation time by 50%. Our AI listens to patient visits and automatically drafts clinical notes for you.
                                                </p>
                                            </div>
                                            <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="p-4 border border-slate-200 rounded-xl flex items-center justify-between hover:border-indigo-200 transition-colors">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                                                        <Mic size={20} />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-slate-900">Ambient Mode</h4>
                                                        <p className="text-sm text-slate-500">Automatically listen and transcribe during consults.</p>
                                                    </div>
                                                </div>
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        className="sr-only peer"
                                                        checked={formData.aiSettings.ambientMode}
                                                        onChange={(e) => setFormData(prev => ({
                                                            ...prev,
                                                            aiSettings: { ...prev.aiSettings, ambientMode: e.target.checked }
                                                        }))}
                                                    />
                                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                                </label>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-bold text-slate-700 mb-2">Note Generation Style</label>
                                                <div className="grid grid-cols-3 gap-3">
                                                    {['SOAP', 'DAP', 'Narrative'].map(style => (
                                                        <div
                                                            key={style}
                                                            onClick={() => setFormData(prev => ({ ...prev, aiSettings: { ...prev.aiSettings, noteStyle: style } }))}
                                                            className={clsx(
                                                                "p-3 rounded-xl border text-center cursor-pointer transition-all",
                                                                formData.aiSettings.noteStyle === style
                                                                    ? "border-indigo-500 bg-indigo-50 text-indigo-700 font-bold ring-1 ring-indigo-500"
                                                                    : "border-slate-200 hover:bg-slate-50 text-slate-600"
                                                            )}
                                                        >
                                                            {style}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                                <div className="flex items-start gap-3">
                                                    <Wand2 size={18} className="text-indigo-500 mt-0.5" />
                                                    <div>
                                                        <h4 className="text-sm font-bold text-slate-900">Auto-Summary</h4>
                                                        <p className="text-xs text-slate-500 mt-1">
                                                            The AI will also generate a patient-friendly summary at the end of each draft, ready to be emailed to the patient.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Step 4: Services */}
                                {activeStep.id === 'services' && (
                                    <div>
                                        <div className="flex justify-between items-center mb-6">
                                            <h3 className="font-bold text-slate-900">Patient Services</h3>
                                            <Button size="sm" onClick={addService}><Plus size={16} className="mr-2" />Add Service</Button>
                                        </div>

                                        <div className="space-y-4">
                                            {formData.services.map((service, index) => (
                                                <div key={service.id} className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow group">
                                                    <div className="grid grid-cols-12 gap-4 items-end">
                                                        <div className="col-span-9">
                                                            <Label className="mb-1 text-xs text-slate-500">Service Name <span className="text-red-500">*</span></Label>
                                                            <Input
                                                                type="text"
                                                                value={service.name}
                                                                onChange={(e) => updateService(service.id, 'name', e.target.value)}
                                                                placeholder="e.g. Standard Checkup"
                                                            />
                                                        </div>
                                                        <div className="col-span-2">
                                                            <Label className="mb-1 text-xs text-slate-500">Price ($)</Label>
                                                            <Input
                                                                type="number"
                                                                value={service.price}
                                                                onChange={(e) => updateService(service.id, 'price', parseInt(e.target.value))}
                                                            />
                                                        </div>
                                                        <div className="col-span-1 flex justify-end pb-2">
                                                            <button
                                                                onClick={() => removeService(service.id)}
                                                                className="text-slate-400 hover:text-red-500 transition-colors"
                                                            >
                                                                <Trash2 size={18} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            {formData.services.length === 0 && (
                                                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                                    <p className="text-slate-400 text-sm">No services added yet.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}



                                {/* Step 6: Payments & Deposits (New) */}
                                {activeStep.id === 'payments' && (
                                    <div className="space-y-6">
                                        <div className="text-center mb-6">
                                            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
                                                <Shield size={32} />
                                            </div>
                                            <h3 className="text-xl font-bold text-slate-900">Protect Your Revenue</h3>
                                            <p className="text-slate-500 max-w-sm mx-auto">
                                                Reduce no-shows by collecting deposits or securing a card on file before the appointment.
                                            </p>
                                        </div>

                                        <div className="space-y-4">
                                            <div
                                                onClick={() => setFormData(prev => ({ ...prev, paymentSettings: { ...prev.paymentSettings, requireCard: !prev.paymentSettings.requireCard } }))}
                                                className={clsx(
                                                    "p-5 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between",
                                                    formData.paymentSettings.requireCard
                                                        ? "border-green-500 bg-green-50/50"
                                                        : "border-slate-200 hover:border-green-200"
                                                )}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={clsx(
                                                        "w-10 h-10 rounded-full flex items-center justify-center",
                                                        formData.paymentSettings.requireCard ? "bg-green-100 text-green-600" : "bg-slate-100 text-slate-400"
                                                    )}>
                                                        <CreditCard size={20} />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-slate-900">Require Card on File</h4>
                                                        <p className="text-sm text-slate-500">Secure booking without immediate charge.</p>
                                                    </div>
                                                </div>
                                                {formData.paymentSettings.requireCard && <Check size={20} className="text-green-600" />}
                                            </div>

                                            <div className="p-5 rounded-xl border border-slate-200 bg-white">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                                                            <DollarSign size={20} />
                                                        </div>
                                                        <div>
                                                            <h4 className="font-bold text-slate-900">Upfront Deposit</h4>
                                                            <p className="text-sm text-slate-500">Charge a portion of the fee instantly.</p>
                                                        </div>
                                                    </div>
                                                    <Switch
                                                        checked={formData.paymentSettings.depositAmount > 0}
                                                        onChange={(checked) => setFormData(prev => ({
                                                            ...prev,
                                                            paymentSettings: { ...prev.paymentSettings, depositAmount: checked ? 50 : 0 }
                                                        }))}
                                                    />
                                                </div>

                                                {formData.paymentSettings.depositAmount > 0 && (
                                                    <div className="pl-14 animate-in fade-in slide-in-from-top-2">
                                                        <Label className="mb-1 text-xs text-slate-500">Deposit Amount ($)</Label>
                                                        <Input
                                                            type="number"
                                                            value={formData.paymentSettings.depositAmount}
                                                            onChange={(e) => setFormData(prev => ({
                                                                ...prev,
                                                                paymentSettings: { ...prev.paymentSettings, depositAmount: parseInt(e.target.value) || 0 }
                                                            }))}
                                                            className="w-32 font-bold"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Step 5: Online Portal */}
                                {activeStep.id === 'portal' && (
                                    <div className="space-y-6">
                                        <div className="p-6 bg-slate-900 text-white rounded-2xl">
                                            <h3 className="text-lg font-bold mb-2">Portal Preview</h3>
                                            <p className="text-slate-400 text-sm">This is how your cancellation policy will appear to patients.</p>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">Cancellation Policy</label>
                                            <select
                                                value={formData.cancellationPolicy}
                                                onChange={(e) => setFormData({ ...formData, cancellationPolicy: e.target.value })}
                                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none shadow-sm"
                                            >
                                                <option value="none">No specific policy</option>
                                                <option value="24h">24 Hours Notice Required</option>
                                                <option value="48h">48 Hours Notice Required</option>
                                                <option value="loss">Deposit Forfeited</option>
                                            </select>
                                            <p className="text-xs text-slate-500 mt-2">
                                                Patients cancelling within this window may be charged a fee.
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-3 p-4 bg-yellow-50 text-yellow-800 rounded-xl border border-yellow-100">
                                            <Shield size={20} />
                                            <p className="text-sm font-medium">Automatic deposit refunds are enabled.</p>
                                        </div>
                                    </div>
                                )}
                                {/* Step 8: Additional Resources */}
                                {activeStep.id === 'resources' && (
                                    <div className="space-y-6">
                                        <div className="text-center py-8">
                                            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                                <Check size={32} className="text-green-600" />
                                            </div>
                                            <h3 className="text-2xl font-bold text-slate-900 mb-2">You're All Set!</h3>
                                            <p className="text-slate-500 max-w-md mx-auto mb-8">
                                                Your practice profile is ready. You can always update these settings later in your dashboard.
                                            </p>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left max-w-xl mx-auto">
                                                <a href="#" className="p-4 rounded-xl border border-slate-200 hover:border-primary-200 hover:bg-primary-50/50 transition-all group">
                                                    <h4 className="font-bold text-slate-900 group-hover:text-primary-700 mb-1">Help Center</h4>
                                                    <p className="text-xs text-slate-500">Guides and tutorials</p>
                                                </a>
                                                <a href="#" className="p-4 rounded-xl border border-slate-200 hover:border-primary-200 hover:bg-primary-50/50 transition-all group">
                                                    <h4 className="font-bold text-slate-900 group-hover:text-primary-700 mb-1">Contact Support</h4>
                                                    <p className="text-xs text-slate-500">Get help from our team</p>
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                )}

                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Footer */}
                    <div className="h-20 border-t border-slate-100 flex items-center justify-between px-8 bg-slate-50 shrink-0">
                        <button
                            onClick={handleBack}
                            disabled={activeStepIndex === 0 || isSubmitting}
                            className={clsx(
                                "px-6 py-2.5 rounded-xl font-bold text-sm transition-colors",
                                activeStepIndex === 0 ? "text-slate-300 cursor-not-allowed" : "text-slate-600 hover:bg-slate-200/50"
                            )}
                        >
                            Back
                        </button>

                        <Button
                            onClick={handleNext}
                            className="w-56"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Saving...' : (activeStepIndex === 0 ? 'Start' : (activeStepIndex === STEPS.length - 1 ? 'Finish' : (needsSaving() ? 'Save & Continue' : 'Continue')))}
                            {activeStepIndex < STEPS.length - 1 && !isSubmitting && <ArrowRight size={16} className="ml-2" />}
                        </Button>
                    </div>
                </div>
            </motion.div >
        </div >
    );
};

export default SetupWizard;
