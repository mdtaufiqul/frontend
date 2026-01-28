"use client";

import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/context/AuthContext';
import { Shield, Info, AlertCircle, Search as SearchIcon } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import api from '@/utils/api';

interface StaffModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => void;
    title?: string;
    initialData?: any;
}

const StaffModal: React.FC<StaffModalProps> = ({
    isOpen,
    onClose,
    onSave,
    title,
    initialData
}) => {
    const { user: currentUser } = useAuth();
    const isEditing = !!initialData;
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [formData, setFormData] = useState<any>({
        id: initialData?.id,
        clinicId: currentUser?.clinicId || initialData?.clinicId, // Ensure clinicId is present
        name: initialData?.name || '',
        email: initialData?.email || '',
        password: '',
        role: initialData?.role || '',
        permissions: initialData?.permissions || {},
    });

    // Sync state with initialData changes
    React.useEffect(() => {
        if (initialData) {
            setFormData({
                id: initialData.id, // Track ID
                clinicId: currentUser?.clinicId || initialData.clinicId,
                name: initialData.name || '',
                email: initialData.email || '',
                password: '', // Always blank on edit
                role: initialData.role || 'DOCTOR',
                permissions: initialData.permissions || {},
            });
        } else {
            // Reset for create mode
            setFormData({
                id: undefined, // Reset ID
                clinicId: currentUser?.clinicId, // Capture current context
                name: '',
                email: '',
                password: '',
                role: '', // Empty by default
                permissions: {},
            });
        }
    }, [initialData, currentUser?.clinicId]);

    const isSystemAdmin = currentUser?.role === 'SYSTEM_ADMIN';
    const isDoctor = formData.role === 'DOCTOR';

    // Fetch default permissions when role changes (if not editing an existing user with custom perms)
    // For now, we'll simulate this or add a specific effect if we had the endpoint hook ready.
    // Ideally: useEffect hooks into API to fetch /users/role-permissions?role=...

    // TEMPORARY: We will trust the backend to fill valid defaults if we send empty permissions
    // But for UI preview, we might want to fetch. 
    // Let's implement a simple fetcher.
    const [loadingPermissions, setLoadingPermissions] = useState(false);

    // Fetch default permissions when role changes
    React.useEffect(() => {
        if (!formData.role || !currentUser?.clinicId) return;

        // If editing and role matches initial, use initial permissions (don't overwrite custom changes)
        if (isEditing && initialData && formData.role === initialData.role) {
            setFormData((prev: any) => ({ ...prev, permissions: initialData.permissions || {} }));
            return;
        }

        // Otherwise (Creating OR Editing+RoleChanged), fetch defaults for the new role
        setLoadingPermissions(true);
        // Use the clinic ID coming from the logged in user OR from the initial data if exists
        // Fallback to 'default' to ensure we verify against system standard if no context
        const targetClinicId = currentUser?.clinicId || (initialData?.clinicId) || 'default';

        api.get(`/users/role-permissions?role=${formData.role}&clinicId=${targetClinicId}`)
            .then(res => {
                if (res.data) {
                    setFormData((prev: any) => ({ ...prev, permissions: res.data }));
                }
            })
            .catch(err => console.error('Failed to load role permissions:', err))
            .finally(() => setLoadingPermissions(false));

    }, [formData.role, isEditing, currentUser?.clinicId, initialData]);

    const handleTogglePermission = (key: string) => {
        if (isDoctor && !isSystemAdmin) return; // Locked for doctors ONLY if not system admin

        setFormData((prev: any) => ({
            ...prev,
            permissions: {
                ...prev.permissions,
                [key]: !prev.permissions[key]
            }
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Basic validation for mandatory fields
        const missing: string[] = [];
        if (!formData.name?.trim()) missing.push('Full Name is required.');
        if (!formData.email?.trim()) missing.push('Clinical Email is required.');
        if (!formData.role) missing.push('System Role is required.');
        if (missing.length) {
            alert(missing.join('\n'));
            return;
        }

        // If existing user, do NOT send password field unless explicitly changing it?
        // For "Add Member" flow of existing user, we should NEVER send password.
        const dataToSave = { ...formData };
        if (formData.id) {
            delete dataToSave.password;
        }

        onSave(dataToSave);
        if (!isEditing) {
            setFormData({ name: '', email: '', password: '', role: '', permissions: {} });
        }
    };

    const permissionCategories = [
        {
            group: 'Clinic & Identity',
            items: [
                { key: 'view_clinic_info', label: 'View Clinic Details' },
                { key: 'manage_clinic_info', label: 'Edit Clinic Details' },
            ]
        },
        {
            group: 'Medical Operations',
            items: [
                { key: 'view_patients', label: 'Access Patient Directory' },
                { key: 'manage_patients', label: 'Create/Edit Patients' },
                { key: 'view_doctors', label: 'View Doctor List' },
                { key: 'manage_doctors', label: 'Manage Doctor Profiles' },
            ]
        },
        {
            group: 'Scheduling',
            items: [
                { key: 'view_appointments', label: 'View Appointments' },
                { key: 'manage_appointments', label: 'Manage Schedule' },
                { key: 'view_all_appointments', label: 'See All Provider Schedules' },
            ]
        },
        {
            group: 'Operational Logic',
            items: [
                { key: 'view_workflows', label: 'View Automations' },
                { key: 'manage_workflows', label: 'Edit Workflows' },
                { key: 'manage_own_config', label: 'Self-Config (SMTP/SMS)' },
            ]
        },
        {
            group: 'Billing & Financials',
            items: [
                { key: 'view_billing', label: 'View Invoices & Revenue' },
                { key: 'manage_billing', label: 'Manage Payments & Billing' },
            ]
        }
    ];

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle className="font-semibold text-2xl flex items-center gap-2">
                            {title || (isEditing ? 'Edit Personnel' : 'Initialize Personnel')}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="grid gap-6 py-6">
                        {/* Search Existing User Section - Only when creating */}
                        {!isEditing && (
                            <div className="space-y-4 p-4 bg-slate-50/80 rounded-2xl border border-slate-100">
                                <div className="space-y-2 relative">
                                    <Label className="text-xs font-bold text-slate-600 flex justify-between">
                                        <span>Import Existing Personnel</span>
                                        <span className="text-[10px] font-normal text-slate-400">Search by name or email</span>
                                    </Label>
                                    <div className="relative">
                                        <Input
                                            placeholder="Search to auto-fill..."
                                            className="rounded-xl border-slate-200 bg-white pr-10"
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                if (val.length > 2) {
                                                    api.get(`/users?search=${val}`).then(res => {
                                                        // Filter out users already in this clinic? Maybe not necessary if we want to change roles.
                                                        // Actually, if we want to change roles, we just show them.
                                                        setSearchResults(res.data);
                                                    });
                                                } else {
                                                    setSearchResults([]);
                                                }
                                            }}
                                        />
                                        <div className="absolute right-3 top-2.5 text-slate-400 pointer-events-none">
                                            <SearchIcon size={16} />
                                        </div>
                                    </div>

                                    {/* Search Results Dropdown */}
                                    {searchResults.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 z-50 max-h-[200px] overflow-y-auto p-1">
                                            {searchResults.map(u => (
                                                <button
                                                    key={u.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setFormData({
                                                            id: u.id, // Capture ID for update
                                                            clinicId: currentUser?.clinicId || initialData?.clinicId, // Ensure clinicId is preserved
                                                            name: u.name,
                                                            email: u.email,
                                                            password: '', // Should be disabled
                                                            role: u.role, // Keep existing role initially, user can change it
                                                            permissions: u.permissions || {}
                                                        });
                                                        setSearchResults([]);
                                                    }}
                                                    className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-lg flex items-center justify-between group"
                                                >
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-700">{u.name}</p>
                                                        <p className="text-xs text-slate-400">{u.email}</p>
                                                    </div>
                                                    <span className="text-[10px] uppercase font-bold text-slate-300 bg-slate-100 px-2 py-1 rounded-md group-hover:bg-white group-hover:text-[var(--brand-primary)] transition-colors">
                                                        {u.role}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Primary Information Section */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Primary Credentials</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="name" className="text-xs font-bold text-slate-600">Full Name</Label>
                                    <Input
                                        id="name"
                                        name="name"
                                        className="rounded-xl border-slate-200"
                                        value={formData.name}
                                        onChange={(e) => setFormData((p: any) => ({ ...p, name: e.target.value }))}
                                        placeholder="Dr. John Doe"
                                        required
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="email" className="text-xs font-bold text-slate-600">Clinical Email</Label>
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        className="rounded-xl border-slate-200"
                                        value={formData.email}
                                        onChange={(e) => setFormData((p: any) => ({ ...p, email: e.target.value }))}
                                        placeholder="john@example.com"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="role" className="text-xs font-bold text-slate-600">System Role <span className="text-red-500">*</span></Label>
                                    <Select
                                        onValueChange={(v) => setFormData((p: any) => ({ ...p, role: v }))}
                                        value={formData.role}
                                    >
                                        <SelectTrigger className="rounded-xl border-slate-200">
                                            <SelectValue placeholder="Select a role" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                                            <SelectItem value="DOCTOR">Doctor</SelectItem>
                                            <SelectItem value="CLINIC_ADMIN">Clinic Admin</SelectItem>
                                            <SelectItem value="STAFF">Front Desk Staff</SelectItem>
                                            <SelectItem value="MANAGER">Operations Manager</SelectItem>
                                            <SelectItem value="NURSE">Nurse / Assistant</SelectItem>
                                            <SelectItem value="RECEPTIONIST">Receptionist</SelectItem>
                                            <SelectItem value="REPRESENTATIVE">Representative</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                {/* Hide password if existing user (formData.id) */}
                                {!formData.id && (
                                    <div className="grid gap-2">
                                        <Label htmlFor="password" title={isEditing ? "(Optional) Set new password" : ""} className="text-xs font-bold text-slate-600">
                                            {isEditing ? 'New Password' : 'Initial Password'}
                                        </Label>
                                        <Input
                                            id="password"
                                            name="password"
                                            type="password"
                                            className="rounded-xl border-slate-200"
                                            value={formData.password}
                                            onChange={(e) => setFormData((p: any) => ({ ...p, password: e.target.value }))}
                                            placeholder={isEditing ? "••••••••" : "Require on first login"}
                                            required={!isEditing && !formData.id}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {!isEditing && (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-3 items-start">
                                <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={16} />
                                <div className="space-y-1">
                                    <p className="text-xs font-bold text-amber-700">Credential Storage Required</p>
                                    <p className="text-[11px] text-amber-600 leading-snug">
                                        These credentials will be active immediately.
                                        <span className="font-bold"> Please securely record the email and password above</span>, as the password cannot be retrieved once saved.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Permission Override Section - System Admins Only */}
                        {isSystemAdmin && (
                            <div className="space-y-4 pt-4 border-t border-slate-100">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-[10px] font-bold text-[var(--brand-primary)] uppercase tracking-widest px-1 flex items-center gap-1">
                                        <Shield size={10} />
                                        Granular Access Overrides
                                    </h4>
                                    <div className="flex items-center gap-1 text-[9px] text-slate-400 font-bold uppercase">
                                        <Info size={10} />
                                        {isDoctor && !isSystemAdmin ? 'Doctor Permissions Locked' : 'Bypasses Role Defaults'}
                                    </div>
                                </div>

                                <div className={`space-y-6 bg-slate-50/50 p-4 rounded-2xl border border-slate-100 ${isDoctor && !isSystemAdmin ? 'opacity-60 pointer-events-none' : ''}`}>
                                    {permissionCategories.map((cat) => (
                                        <div key={cat.group} className="space-y-3">
                                            <h5 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{cat.group}</h5>
                                            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                                                {cat.items.map((item) => (
                                                    <div key={item.key} className="flex items-center justify-between">
                                                        <span className="text-[11px] font-medium text-slate-600">{item.label}</span>
                                                        <Switch
                                                            checked={!!formData.permissions[item.key]}
                                                            onCheckedChange={() => handleTogglePermission(item.key)}
                                                            disabled={isDoctor && !isSystemAdmin}
                                                            className="scale-75 data-[state=checked]:bg-[var(--brand-primary)]"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="pt-4 border-t border-slate-100">
                        <Button type="button" variant="ghost" className="rounded-full px-6 text-slate-400 hover:text-slate-600" onClick={onClose}>
                            Abort
                        </Button>
                        <Button type="submit" className="rounded-full px-8 bg-slate-900 hover:bg-slate-800 text-white shadow-lg">
                            {isEditing ? 'Push Changes' : 'Initialize Member'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog >
    );
};

export default StaffModal;
