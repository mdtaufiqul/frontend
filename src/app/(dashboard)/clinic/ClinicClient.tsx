"use client";

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
    Plus,
    Lock,
    Users,
    Activity,
    UserPlus,
    Search,
    MapPin,
    Phone,
    Mail,
    Globe,
    Shield,
    Trash2,
    Edit,
    Workflow,
    CreditCard,
    UserCircle,
    Building2,
    Stethoscope,
    ChevronRight,
    CircleDashed
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Badge from '@/components/ui/badge';
import clsx from 'clsx';
import { getFullUrl } from '@/utils/api';
import { useAuth } from '@/context/AuthContext';
import { usePermissionApi } from '@/hooks/usePermissionApi';
import { toast } from 'sonner';
import StaffModal from '@/components/ui/StaffModal';
import ClinicModal from '@/components/ui/ClinicModal';
import ChangePasswordModal from '@/components/ui/ChangePasswordModal';
import { motion, AnimatePresence } from 'framer-motion';
import WorkflowBuilder from '@/components/workflows/WorkflowBuilder';
import { EmailTemplateManager } from '@/components/settings/EmailTemplateManager';
import { RoleSettings } from '@/components/settings/RoleSettings';
import { ReactFlowProvider } from 'reactflow';
import CommunicationSettingsPage from '@/app/(dashboard)/settings/communication/page';

interface Clinic {
    id: string;
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    timezone: string;
    description?: string;
    logo?: string;
    mapLink?: string;
}

const ClinicClient: React.FC = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const { user, refreshUser } = useAuth();
    const { get, post, patch, delete: del, can } = usePermissionApi();

    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'info');
    const [clinic, setClinic] = useState<Clinic | null>(null);
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
    const [isClinicModalOpen, setIsClinicModalOpen] = useState(false);
    const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);
    const [roleFilter, setRoleFilter] = useState('ALL');
    const [staffView, setStaffView] = useState<'members' | 'templates'>('members');
    const [searchQuery, setSearchQuery] = useState('');
    const [workflowView, setWorkflowView] = useState<'list' | 'builder' | 'templates'>('list');
    const [workflows, setWorkflows] = useState<any[]>([]);
    const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
    const [billingStats, setBillingStats] = useState<any>(null);
    const [billingInvoices, setBillingInvoices] = useState<any[]>([]);

    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const avatarInputRef = React.useRef<HTMLInputElement>(null);

    const updateTab = useCallback((tabId: string) => {
        setActiveTab(tabId);
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', tabId);
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
    }, [pathname, router, searchParams]);

    useEffect(() => {
        const currentTab = searchParams.get('tab');
        if (currentTab && currentTab !== activeTab) setActiveTab(currentTab);
    }, [searchParams, activeTab]);

    const fetchData = async () => {
        setIsLoading(true);
        if (!user?.clinicId) { setIsLoading(false); return; }
        try {
            const [clinicRes, usersRes, workflowsRes] = await Promise.all([
                get('view_clinic_info', `/clinics/${user.clinicId}`),
                get('view_staff', `/users?clinicId=${user.clinicId}`),
                get('view_workflows', '/workflows')
            ]);
            if (clinicRes) setClinic(clinicRes.data);
            if (usersRes) setAllUsers(usersRes.data);
            if (workflowsRes) setWorkflows(workflowsRes.data);
        } catch (error) {
            console.error('Failed to fetch clinic data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [user?.clinicId, get]);

    const fetchBillingData = async () => {
        if (!can('view_billing') && user?.role !== 'SYSTEM_ADMIN') return;
        try {
            const [statsRes, invoicesRes] = await Promise.all([
                get('view_billing', '/billing/stats'),
                get('view_billing', '/billing/invoices')
            ]);
            if (statsRes) setBillingStats(statsRes.data);
            if (invoicesRes) setBillingInvoices(invoicesRes.data);
        } catch (error) {
            console.error('Failed to fetch billing data:', error);
        }
    };

    useEffect(() => {
        if (activeTab === 'billing') fetchBillingData();
    }, [activeTab]);

    const handleUpdateClinic = async (data: any) => {
        if (!clinic) return;
        try {
            await patch('manage_clinic_info', `/clinics/${clinic.id}`, data);
            toast.success('Clinic identity updated.');
            fetchData();
            await refreshUser();
            setIsClinicModalOpen(false);
        } catch (error: any) {
            console.error('Update failed:', error);
            toast.error('Failed to update clinic info.');
        }
    };

    const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !clinic) return;
        const formData = new FormData();
        formData.append('file', file);
        try {
            await post('manage_clinic_info', `/clinics/${clinic.id}/logo`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            toast.success('Clinic logo updated successfully');
            fetchData();
            await refreshUser();
        } catch (error) {
            console.error('Logo upload failed:', error);
            toast.error('Failed to upload logo');
        }
    };

    const handleAddStaff = async (data: any) => {
        try {
            const userId = editingUser?.id || data.id;
            if (userId) {
                await patch('manage_staff', `/users/${userId}`, { ...data, clinicId: user?.clinicId });
                toast.success('Member profile synchronized.');
            } else {
                await post('manage_staff', '/users', { ...data, clinicId: user?.clinicId });
                toast.success('Member added to clinic environment.');
            }
            fetchData();
            setIsStaffModalOpen(false);
            setEditingUser(null);
        } catch (error: any) {
            console.error('Operation failed:', error);
            toast.error(error.response?.data?.message || 'Transaction failed.');
        }
    };

    const handleDeleteUser = async (userToDelete: any) => {
        if (!confirm(`Are you sure you want to terminate the access for ${userToDelete.name}?`)) return;
        try {
            await del('manage_staff', `/users/${userToDelete.id}`);
            toast.success('Member removed from registry.');
            fetchData();
        } catch (error: any) {
            toast.error('Failed to remove member.');
        }
    };

    const getAllUserRoles = (person: any) => {
        const roles = [{ role: person.role, isPrimary: true, clinicName: person.clinic?.name }];
        if (person.memberships) {
            person.memberships.forEach((m: any) => {
                if (!roles.some(r => r.role === m.role && r.clinicName === m.clinic?.name)) {
                    roles.push({ role: m.role, isPrimary: false, clinicName: m.clinic?.name });
                }
            });
        }
        return roles;
    };

    const aggregatedUsers = useMemo(() => {
        const map = new Map<string, any>();
        allUsers.forEach(u => {
            const email = u.email?.toLowerCase();
            if (!email) return;
            if (map.has(email)) {
                const existing = map.get(email);
                if (!existing.memberships) existing.memberships = [];
                if (existing.role !== u.role && !existing.memberships.some((m: any) => m.role === u.role)) {
                    existing.memberships.push({ role: u.role, clinic: u.clinic, clinicId: u.clinicId });
                }
            } else map.set(email, { ...u });
        });
        return Array.from(map.values()).filter(u => {
            const matchesSearch = (u.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) || (u.email?.toLowerCase() || '').includes(searchQuery.toLowerCase());
            let matchesRole = true;
            if (roleFilter !== 'ALL') {
                const roles = getAllUserRoles(u).map(r => r.role);
                matchesRole = roleFilter === 'DOCTOR' ? roles.includes('DOCTOR') : roles.some(r => r !== 'DOCTOR');
            }
            return matchesSearch && matchesRole;
        });
    }, [allUsers, searchQuery, roleFilter]);

    if (isLoading) return (
        <div className="h-[60vh] flex flex-col items-center justify-center text-slate-400 gap-4">
            <CircleDashed className="w-10 h-10 animate-spin text-[var(--brand-primary)]" />
            <p className="font-serif text-lg">Synchronizing clinical data...</p>
        </div>
    );

    if (!user?.clinicId || !clinic) {
        return (
            <div className="p-12 text-center space-y-6 max-w-2xl mx-auto">
                <div className="w-20 h-20 bg-slate-100 rounded-3xl mx-auto flex items-center justify-center text-slate-300"><Building2 size={40} /></div>
                <div className="space-y-2">
                    <h2 className="text-3xl font-serif text-slate-900">Environment Not Initialized</h2>
                    <p className="text-slate-500 text-lg">Your account is not currently tethered to a clinic environment.</p>
                </div>
            </div>
        );
    }

    const tabs = [
        { id: 'info', label: 'Clinic Info', icon: Building2 },
        { id: 'account', label: 'Account', icon: UserCircle },
        { id: 'staff', label: 'Staff & Roles', icon: Users },
        { id: 'workflows', label: 'Workflows', icon: Workflow },
        { id: 'billing', label: 'Billing', icon: CreditCard, protected: true },
        { id: 'communication', label: 'Communication', icon: Mail, protected: true },
    ];

    return (
        <div className="max-w-[1400px] mx-auto space-y-10 py-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6 border-b border-slate-200/60 pb-6">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100 overflow-hidden relative">
                        {clinic.logo ? <img src={getFullUrl(clinic.logo)} alt="Logo" className="w-full h-full object-cover" /> : <Activity className="text-[var(--brand-primary)]" size={24} />}
                    </div>
                    <div>
                        <span className="font-mono text-[10px] font-bold tracking-[0.3em] text-slate-400 uppercase block">Clinic Overview</span>
                        <p className="text-lg font-bold text-slate-900 leading-none mt-0.5">{clinic.name}</p>
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-8">
                <div className="flex items-center gap-1 bg-white/40 p-1 rounded-[2rem] border border-slate-200/50 backdrop-blur-md w-fit mx-auto md:mx-0">
                    {tabs.map((tab) => {
                        if (tab.protected && !can('view_billing') && user.role !== 'SYSTEM_ADMIN') return null;
                        const IsActive = activeTab === tab.id;
                        return (
                            <button key={tab.id} onClick={() => updateTab(tab.id)} className={clsx("flex items-center gap-2 px-6 py-2.5 rounded-[1.5rem] text-[13px] font-bold transition-all duration-300 relative overflow-hidden", IsActive ? "text-[var(--brand-primary)]" : "text-slate-400 hover:text-slate-600")}>
                                {IsActive && <motion.div layoutId="activeTabClinic" className="absolute inset-0 bg-white shadow-sm border border-slate-100 z-0" transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />}
                                <tab.icon size={16} className="relative z-10" />
                                <span className="relative z-10">{tab.label}</span>
                            </button>
                        );
                    })}
                </div>

                <div className="min-h-[500px]">
                    <AnimatePresence mode="wait">
                        <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
                            {activeTab === 'info' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <div className="lg:col-span-2 space-y-6">
                                        <Card className="p-8 bg-white/60 backdrop-blur-xl border-slate-200/60 rounded-[2rem] shadow-sm">
                                            <div className="space-y-8">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h3 className="text-xl font-semibold text-slate-800">Clinic Details</h3>
                                                        <p className="text-sm text-slate-400">Basic information about your clinic.</p>
                                                    </div>
                                                    <Button variant="ghost" className="text-[var(--brand-primary)] font-bold text-xs uppercase" onClick={() => setIsClinicModalOpen(true)}>Update Info</Button>
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                                    <div className="space-y-4">
                                                        <div className="flex items-center gap-4"><div className="w-10 h-10 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-400"><MapPin size={18} /></div><div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Location</p><p className="text-sm font-medium text-slate-700">{clinic.address || 'N/A'}</p></div></div>
                                                        <div className="flex items-center gap-4"><div className="w-10 h-10 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-400"><Phone size={18} /></div><div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contact</p><p className="text-sm font-medium text-slate-700">{clinic.phone || 'N/A'}</p></div></div>
                                                    </div>
                                                    <div className="space-y-4">
                                                        <div className="flex items-center gap-4"><div className="w-10 h-10 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-400"><Mail size={18} /></div><div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email</p><p className="text-sm font-medium text-slate-700">{clinic.email || 'N/A'}</p></div></div>
                                                        <div className="flex items-center gap-4"><div className="w-10 h-10 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-400"><Globe size={18} /></div><div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Website</p><p className="text-sm font-medium text-slate-700">{clinic.website || 'N/A'}</p></div></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </Card>
                                    </div>
                                    <Card className="p-8 bg-primary-50/50 border-slate-200/40 rounded-[2rem] flex flex-col items-center justify-center text-center space-y-4 border-dashed border-2">
                                        <div className="w-24 h-24 bg-white rounded-[2rem] shadow-sm border border-slate-100 flex items-center justify-center overflow-hidden">{clinic.logo ? <img src={getFullUrl(clinic.logo)} className="w-full h-full object-contain" /> : <Building2 size={40} className="text-slate-200" />}</div>
                                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                                        <Button variant="outline" className="rounded-full" onClick={() => fileInputRef.current?.click()}>Replace Logo</Button>
                                    </Card>
                                </div>
                            )}

                            {activeTab === 'staff' && (
                                <div className="space-y-6">
                                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-1 rounded-xl bg-slate-100 flex">
                                                <button onClick={() => setStaffView('members')} className={clsx("px-4 py-1.5 rounded-lg text-xs font-bold", staffView === 'members' ? "bg-white shadow-sm" : "text-slate-500")}>Members</button>
                                                <button onClick={() => setStaffView('templates')} className={clsx("px-4 py-1.5 rounded-lg text-xs font-bold", staffView === 'templates' ? "bg-white shadow-sm" : "text-slate-500")}>Config</button>
                                            </div>
                                        </div>
                                        {staffView === 'members' && (
                                            <div className="flex gap-3">
                                                <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} /><input type="text" placeholder="Search..." className="pl-9 pr-4 py-2 border rounded-xl text-sm" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div>
                                                <Button onClick={() => { setEditingUser(null); setIsStaffModalOpen(true); }}><UserPlus size={16} className="mr-2" />Add</Button>
                                            </div>
                                        )}
                                    </div>
                                    {staffView === 'members' ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {aggregatedUsers.map((person: any) => (
                                                <Card key={person.id} className="p-6 bg-white border-slate-200/60 rounded-[2rem] shadow-sm">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden">{person.image ? <img src={getFullUrl(person.image)} className="w-full h-full object-cover" /> : person.name[0]}</div>
                                                            <div><h4 className="font-bold text-slate-800">{person.name}</h4><Badge className="text-[10px]">{person.role}</Badge></div>
                                                        </div>
                                                        <div className="flex gap-1"><button onClick={() => { setEditingUser(person); setIsStaffModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-slate-600"><Edit size={16} /></button></div>
                                                    </div>
                                                    <div className="pt-4 border-t text-xs text-slate-500 flex items-center gap-2"><Mail size={12} /> {person.email}</div>
                                                </Card>
                                            ))}
                                        </div>
                                    ) : <RoleSettings />}
                                </div>
                            )}

                            {activeTab === 'workflows' && (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200">
                                        <h3 className="font-bold">Workflows</h3>
                                        <div className="flex gap-2">
                                            {workflowView !== 'list' && <Button variant="secondary" onClick={() => setWorkflowView('list')}>List</Button>}
                                            {workflowView === 'list' && <Button onClick={() => { setSelectedWorkflowId(null); setWorkflowView('builder'); }}><Plus size={16} /> Create</Button>}
                                            <Button variant="outline" onClick={() => setWorkflowView('templates')}>Templates</Button>
                                        </div>
                                    </div>
                                    <div className="bg-white rounded-3xl border min-h-[600px]">
                                        {workflowView === 'list' && (
                                            <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                {workflows.map(wf => (
                                                    <Card key={wf.id} className="p-6 cursor-pointer hover:border-primary-300" onClick={() => { setSelectedWorkflowId(wf.id); setWorkflowView('builder'); }}>
                                                        <h4 className="font-bold mb-2">{wf.name}</h4>
                                                        <Badge variant={wf.isActive ? 'success' : 'neutral'}>{wf.isActive ? 'Active' : 'Inactive'}</Badge>
                                                    </Card>
                                                ))}
                                            </div>
                                        )}
                                        {workflowView === 'builder' && <div className="h-[700px]"><ReactFlowProvider><WorkflowBuilder workflowId={selectedWorkflowId || undefined} onSaveComplete={() => { fetchData(); setWorkflowView('list'); }} /></ReactFlowProvider></div>}
                                        {workflowView === 'templates' && <div className="p-6"><EmailTemplateManager /></div>}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'account' && (
                                <div className="max-w-2xl space-y-6">
                                    <Card className="p-8 bg-white border-slate-200/60 rounded-[2rem] shadow-sm">
                                        <div className="flex items-center gap-6 mb-8">
                                            <div className="relative"><div className="w-20 h-20 rounded-full bg-slate-100 overflow-hidden">{user?.image ? <img src={getFullUrl(user.image)} className="w-full h-full object-cover" /> : <UserCircle size={40} className="m-auto" />}</div><button onClick={() => avatarInputRef.current?.click()} className="absolute bottom-0 right-0 p-1.5 bg-slate-900 text-white rounded-full"><Edit size={12} /></button></div>
                                            <input type="file" ref={avatarInputRef} className="hidden" onChange={async (e) => {
                                                const file = e.target.files?.[0]; if (!file) return;
                                                const fd = new FormData(); fd.append('file', file);
                                                await post('manage_clinic_info', `/users/${user?.id}/avatar`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                                                toast.success('Avatar updated'); await refreshUser();
                                            }} />
                                            <div><p className="font-bold text-lg">{user?.name}</p><p className="text-xs uppercase text-slate-400">{user?.role}</p></div>
                                        </div>
                                        <div className="space-y-4">
                                            <div><label className="text-[10px] font-bold uppercase text-slate-400">Email</label><div className="p-3 bg-slate-50 border rounded-xl">{user?.email}</div></div>
                                            <div><label className="text-[10px] font-bold uppercase text-slate-400">Password</label><div className="flex gap-2"><div className="flex-1 p-3 bg-slate-50 border rounded-xl">••••••••</div><Button variant="outline" onClick={() => setIsChangePasswordModalOpen(true)}>Change</Button></div></div>
                                        </div>
                                    </Card>
                                </div>
                            )}

                            {activeTab === 'billing' && (
                                <div className="space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <Card className="p-8 bg-white text-center rounded-[2rem]"><p className="text-xs text-slate-400 uppercase">Revenue</p><p className="text-3xl font-bold">${billingStats?.monthlyRevenue || '0'}</p></Card>
                                        <Card className="p-8 bg-slate-900 text-white md:col-span-2 rounded-[2rem]"><h4 className="text-xl font-bold mb-2">Premium Plan</h4><p className="text-sm opacity-60">Full clinic management features enabled.</p></Card>
                                    </div>
                                    <div className="space-y-4">
                                        <h4 className="font-bold">Invoices</h4>
                                        {billingInvoices.map(inv => <Card key={inv.id} className="p-4 flex justify-between items-center"><p>{inv.description}</p><p className="font-bold">${inv.amount}</p></Card>)}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'communication' && <div className="bg-white border rounded-[2rem] overflow-hidden"><CommunicationSettingsPage /></div>}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            <StaffModal isOpen={isStaffModalOpen} initialData={editingUser} onClose={() => { setIsStaffModalOpen(false); setEditingUser(null); }} onSave={handleAddStaff} />
            {clinic && <ClinicModal isOpen={isClinicModalOpen} onClose={() => setIsClinicModalOpen(false)} initialData={clinic} onSave={handleUpdateClinic} />}
            <ChangePasswordModal isOpen={isChangePasswordModalOpen} onClose={() => setIsChangePasswordModalOpen(false)} />
        </div>
    );
};

export default ClinicClient;
