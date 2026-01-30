
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, Save, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import api from '@/utils/api';
import Badge from '@/components/ui/badge';

const ROLES = [
    { value: 'DOCTOR', label: 'Doctor / Practitioner', description: 'Medical professionals with clinical access.' },
    { value: 'CLINIC_ADMIN', label: 'Clinic Admin', description: 'Full access to clinic settings and staff.' },
    { value: 'STAFF', label: 'Front Desk Staff', description: 'General reception and scheduling tasks.' },
    { value: 'MANAGER', label: 'Operations Manager', description: 'Oversight of clinic operations.' },
    { value: 'NURSE', label: 'Nurse / Assistant', description: 'Clinical support and patient care.' },
    { value: 'RECEPTIONIST', label: 'Receptionist', description: 'Front desk and appointment management.' },
    { value: 'REPRESENTATIVE', label: 'Representative', description: 'External relations and communication.' },
];

const PERMISSION_Categories = [
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
            { key: 'view_staff', label: 'View Member List' },
            { key: 'manage_staff', label: 'Manage Member Profiles' },
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
    }
];

export const RoleSettings = () => {
    const { user } = useAuth();
    const [selectedRole, setSelectedRole] = useState('DOCTOR');
    const [permissions, setPermissions] = useState<Record<string, boolean>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchPermissions();
    }, [selectedRole, user?.clinicId]);

    const fetchPermissions = async () => {
        setIsLoading(true);
        try {
            const res = await api.get(`/users/role-permissions?role=${selectedRole}&clinicId=${user?.clinicId}`);
            if (res.data) {
                setPermissions(res.data);
            }
        } catch (error) {
            console.error('Failed to fetch permissions:', error);
            // Default to empty if failed
            setPermissions({});
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggle = (key: string) => {
        setPermissions(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // We use the same service; but we need an endpoint to UPDATE the template.
            // Currently UsersService has upsert logic buried in CREATE user.
            // We need a direct endpoint in RoleTemplateService or exposed via AuthController.
            // Wait, I only added a GET endpoint. I need a POST/PATCH endpoint for templates!
            // I will assume for now I will add it or reuse an existing one if available.
            // Checking: I implemented `processTemplate` but not an exposed API for it.
            // I need to add that API. For now, I'll write the UI code assuming the API `/auth/role-templates` exists.

            await api.post('/auth/role-templates', {
                role: selectedRole,
                clinicId: user?.clinicId,
                permissions
            });

            toast.success(`Default permissions for ${selectedRole} updated.`);
        } catch (error) {
            console.error('Failed to save template:', error);
            toast.error('Failed to update permission template.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="grid grid-cols-12 gap-8">
            <div className="col-span-4 space-y-4">
                <Card className="p-4 border-slate-200 shadow-sm bg-white overflow-hidden">
                    <h3 className="text-sm font-bold text-slate-700 mb-4 px-2 uppercase tracking-wider">Available Roles</h3>
                    <div className="space-y-1">
                        {ROLES.map((role) => (
                            <button
                                key={role.value}
                                onClick={() => setSelectedRole(role.value)}
                                className={`w-full text-left p-3 rounded-xl text-sm transition-all flex flex-col gap-1 ${selectedRole === role.value
                                    ? 'bg-slate-900 text-white shadow-md'
                                    : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                <div className="font-bold flex items-center justify-between">
                                    {role.label}
                                    {selectedRole === role.value && <CheckCircle2 size={14} className="text-emerald-400" />}
                                </div>
                                <div className={`text-[11px] font-medium leading-tight ${selectedRole === role.value ? 'text-slate-400' : 'text-slate-400'}`}>
                                    {role.description}
                                </div>
                            </button>
                        ))}
                    </div>
                </Card>
            </div>

            <div className="col-span-8 space-y-6">
                <div className="flex items-center justify-between bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <Shield className="text-[var(--brand-primary)]" />
                            {ROLES.find(r => r.value === selectedRole)?.label}
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">
                            Configure default permissions for new users with this role.
                        </p>
                    </div>
                    <Button
                        onClick={handleSave}
                        disabled={isSaving || isLoading}
                        className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-white shadow-lg shadow-blue-500/20 rounded-full px-6"
                    >
                        {isSaving ? 'Saving...' : 'Save Template'}
                        {!isSaving && <Save size={16} className="ml-2" />}
                    </Button>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center p-12 text-slate-400">
                        Loading permissions...
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {PERMISSION_Categories.map((cat) => (
                            <Card key={cat.group} className="p-5 border-slate-200/60 shadow-none bg-slate-50/50">
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">{cat.group}</h4>
                                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                                    {cat.items.map((item) => (
                                        <div key={item.key} className="flex items-center justify-between group">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">
                                                    {item.label}
                                                </span>
                                                <span className="text-[10px] text-slate-400 font-mono">{item.key}</span>
                                            </div>
                                            <Switch
                                                checked={!!permissions[item.key]}
                                                onCheckedChange={() => handleToggle(item.key)}
                                                className="data-[state=checked]:bg-[var(--brand-primary)]"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
