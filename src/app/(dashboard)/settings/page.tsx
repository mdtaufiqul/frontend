"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
    Building2,
    CreditCard,
    FileText,
    Shield,
    Receipt,
    User,
    Smartphone,
    Mail,
    Lock,
    Sparkles,
    Activity
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import SetupWizard from '@/components/setup/SetupWizard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'; // Verify path
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import api, { getFullUrl } from '@/utils/api';

import ChangePasswordDialog from '@/components/settings/ChangePasswordDialog';

const AccountTab = () => {
    const { user, updateUser } = useAuth();
    const [phone, setPhone] = useState(user?.personalSmsNumber || '');
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

    // Filter "patient" role logic if needed, currently assuming "doctor" or "clinic_admin" mostly
    const showPhone = user?.role === 'DOCTOR' || user?.role === 'patient';

    const handleSaveProfile = async () => {
        setIsSaving(true);
        try {
            await api.patch(`/users/${user?.id}`, {
                personalSmsNumber: phone
            });
            // Update context as well
            updateUser({
                personalSmsNumber: phone
            });
            toast.success('Profile updated');
        } catch (e) {
            toast.error('Failed to update profile');
        } finally {
            setIsSaving(false);
        }
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Basic validation
        if (file.size > 5 * 1024 * 1024) {
            toast.error("Image must be smaller than 5MB");
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        setIsUploading(true);
        try {
            // Ensure Content-Type header is handled by browser/axios for FormData
            const res = await api.post(`/users/${user?.id}/avatar`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            const newUrl = res.data.url;
            updateUser({ image: newUrl });
            toast.success("Profile picture updated");
        } catch (e) {
            console.error(e);
            toast.error("Failed to upload image");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="space-y-6 max-w-2xl">
            <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Profile Details</h3>
                <div className="space-y-4">
                    <div className="flex items-start gap-4 mb-6">
                        <div className="relative group">
                            <div className="w-20 h-20 rounded-full overflow-hidden bg-slate-100 border-2 border-slate-200 flex items-center justify-center">
                                {user?.image ? (
                                    <img src={getFullUrl(user.image)} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <User size={32} className="text-slate-400" />
                                )}
                            </div>
                            <label className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-full text-xs font-medium">
                                {isUploading ? '...' : 'Change'}
                                <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={isUploading} />
                            </label>
                        </div>
                        <div className="flex-1">
                            <h4 className="font-semibold text-lg">{user?.name}</h4>
                            <p className="text-slate-500 text-sm capitalize">{user?.role?.replace('_', ' ')}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-500 mb-2">Assigned Roles</label>
                            <div className="space-y-2">
                                {/* Active Role */}
                                <div className="flex items-center gap-2 p-3 bg-primary-50 rounded-lg border border-primary-100 text-primary-700">
                                    <Shield size={16} />
                                    <span className="font-medium capitalize">{user?.role?.replace('_', ' ') || 'User'}</span>
                                    <span className="text-xs bg-white/50 px-1.5 py-0.5 rounded ml-auto">Active</span>
                                </div>

                                {/* Other Roles */}
                                {user?.memberships?.filter((m: any) => m.role !== user.role || m.clinicId !== user.clinicId).map((m: any) => (
                                    <div key={m.id} className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-100 text-slate-600">
                                        <Shield size={16} className="text-slate-400" />
                                        <div className="flex flex-col leading-tight">
                                            <span className="font-medium capitalize text-sm">{m.role.replace('_', ' ')}</span>
                                            <span className="text-xs text-slate-400">{m.clinic.name}</span>
                                        </div>
                                    </div>
                                ))}

                                {/* Global/System Role if not active */}
                                {user?.globalRole && user.globalRole !== user.role && (
                                    <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-100 text-slate-600">
                                        <Shield size={16} className="text-slate-400" />
                                        <div className="flex flex-col leading-tight">
                                            <span className="font-medium capitalize text-sm">{user.globalRole.replace('_', ' ')}</span>
                                            <span className="text-xs text-slate-400">Primary Account</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="mt-4">
                            <label className="block text-sm font-medium text-slate-500 mb-1">Email</label>
                            <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-100 text-slate-700">
                                <Mail size={16} />
                                {user?.email}
                            </div>
                        </div>
                    </div>

                </div>

                {showPhone && (
                    <div className="flex justify-end pt-2">
                        <Button onClick={handleSaveProfile} disabled={isSaving}>
                            {isSaving ? 'Saving Changes...' : 'Save Profile'}
                        </Button>
                    </div>
                )}

                <div className="pt-4 border-t border-slate-100">
                    <label className="block text-sm font-medium text-slate-500 mb-2">Password</label>
                    <Button variant="outline" className="w-full sm:w-auto" onClick={() => setIsChangePasswordOpen(true)}>
                        <Lock size={16} className="mr-2" /> Change Password
                    </Button>
                </div>
            </Card>

            <ChangePasswordDialog
                isOpen={isChangePasswordOpen}
                onClose={() => setIsChangePasswordOpen(false)}
            />
        </div>
    );
};

const SettingsContent = () => {
    const searchParams = useSearchParams();
    const [wizardStep, setWizardStep] = useState<string | undefined>(undefined);
    const [isWizardOpen, setIsWizardOpen] = useState(false);

    const openWizard = (step?: string) => {
        setWizardStep(step);
        setIsWizardOpen(true);
    };

    // Auto-open Wizard if ?setup=true
    useEffect(() => {
        if (searchParams.get('setup') === 'true') {
            setIsWizardOpen(true);
        }
    }, [searchParams]);

    const { user } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (user?.role === 'SYSTEM_ADMIN') {
            router.replace('/clinic');
        } else if (user?.role === 'SAAS_OWNER') {
            router.replace('/admin/clinics');
        }
    }, [user, router]);

    // Helper to check role
    // const isClinic = user?.role === 'CLINIC_ADMIN';
    const isDoctor = user?.role === 'DOCTOR';
    const isAdmin = user?.role === 'CLINIC_ADMIN' || user?.role === 'SYSTEM_ADMIN' || user?.role === 'SAAS_OWNER';

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
                <p className="text-slate-500">Manage your account, practice, and billing preferences.</p>
            </div>

            <Tabs defaultValue="settings" className="w-full">
                <TabsList className="mb-8 p-1 bg-slate-100/50 rounded-xl h-auto">
                    <TabsTrigger value="settings" className="px-6 py-2.5 rounded-lg data-[state=active]:bg-white data-[state=active]:text-primary-600 data-[state=active]:shadow-sm transition-all text-slate-600 font-medium">Settings</TabsTrigger>
                    {user?.role !== 'DOCTOR' && (<TabsTrigger value="billing" className="px-6 py-2.5 rounded-lg data-[state=active]:bg-white data-[state=active]:text-primary-600 data-[state=active]:shadow-sm transition-all text-slate-600 font-medium">Billing</TabsTrigger>)}
                    <TabsTrigger value="account" className="px-6 py-2.5 rounded-lg data-[state=active]:bg-white data-[state=active]:text-primary-600 data-[state=active]:shadow-sm transition-all text-slate-600 font-medium">Account</TabsTrigger>
                </TabsList>

                <TabsContent value="settings" className="space-y-6 animate-in fade-in-50 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Business Info - Shared */}
                        <Card
                            className="p-6 hover:shadow-md transition-all cursor-pointer group border-slate-200 hover:border-primary-200"
                            onClick={() => openWizard('business')}
                        >
                            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <Building2 size={20} />
                            </div>
                            <h3 className="font-semibold text-slate-900 mb-1">Business Information</h3>
                            <p className="text-sm text-slate-500">Manage clinic details, address, and branding</p>
                        </Card>

                        {/* Practitioner Setup - Doctor Only - HIDDEN BY USER REQUEST
                        {isDoctor && (
                            <Card
                                className="p-6 hover:shadow-md transition-all cursor-pointer group border-slate-200 hover:border-primary-200"
                                onClick={() => openWizard('practitioner')}
                            >
                                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <User size={20} />
                                </div>
                                <h3 className="font-semibold text-slate-900 mb-1">Practitioner Profile</h3>
                                <p className="text-sm text-slate-500">Update your bio, specialty, and availability</p>
                            </Card>
                        )}
                        */}

                        {/* AI Assistant - Doctor Only - HIDDEN BY USER REQUEST
                        {isDoctor && (
                            <Card
                                className="p-6 hover:shadow-md transition-all cursor-pointer group border-slate-200 hover:border-primary-200"
                                onClick={() => openWizard('ai_scribe')}
                            >
                                <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <Sparkles size={20} />
                                </div>
                                <h3 className="font-semibold text-slate-900 mb-1">AI Scribe Assistant</h3>
                                <p className="text-sm text-slate-500">Configure ambient listening and note generation</p>
                            </Card>
                        )}
                        */}

                        {/* Services Management - Shared (though Wizard hides for non-doctors currently, let's keep logic aligned) - HIDDEN BY USER REQUEST
                        {(isDoctor || isAdmin) && (
                            <Card
                                className="p-6 hover:shadow-md transition-all cursor-pointer group border-slate-200 hover:border-primary-200"
                                onClick={() => openWizard('services')}
                            >
                                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <Activity size={20} />
                                </div>
                                <h3 className="font-semibold text-slate-900 mb-1">Service Management</h3>
                                <p className="text-sm text-slate-500">Define appointment types, durations, and pricing</p>
                            </Card>
                        )}
                        */}

                        <Card
                            className="p-6 hover:shadow-md transition-all cursor-pointer group border-slate-200 hover:border-primary-200"
                            onClick={() => window.location.href = '/manual'}
                        >
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <FileText size={20} />
                            </div>
                            <h3 className="font-semibold text-slate-900 mb-1">Practice Manual</h3>
                            <p className="text-sm text-slate-500">Internal policies, procedures, and documentation</p>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="billing" className="space-y-6 animate-in fade-in-50 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <Card
                            className="p-6 hover:shadow-md transition-all cursor-pointer group border-slate-200 hover:border-primary-200"
                            // No-action for now or link to specific billing page
                            onClick={() => toast.info('Billing settings coming soon')}
                        >
                            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <CreditCard size={20} />
                            </div>
                            <h3 className="font-semibold text-slate-900 mb-1">Billing & Invoices</h3>
                            <p className="text-sm text-slate-500">Manage subscriptions, payment methods, and invoices</p>
                        </Card>

                        {/* Clinic Admin only usually, but requested to be in Billing tab. Keeping visible for now or use isClinic check if desired. */}
                        <Card
                            className="p-6 hover:shadow-md transition-all cursor-pointer group border-slate-200 hover:border-primary-200"
                            onClick={() => setIsWizardOpen(true)} // Or specific step
                        >
                            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <Shield size={20} />
                            </div>
                            <h3 className="font-semibold text-slate-900 mb-1">No-Show Protection</h3>
                            <p className="text-sm text-slate-500">Configure deposits and cancellation policies</p>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="account" className="animate-in fade-in-50 duration-300">
                    <AccountTab />
                </TabsContent>
            </Tabs>

            <SetupWizard
                isOpen={isWizardOpen}
                onClose={() => {
                    setIsWizardOpen(false);
                    setWizardStep(undefined);
                }}
                initialStepId={wizardStep}
            />
        </div>
    );
};

export default function SettingsPage() {
    return (
        <Suspense fallback={<div className="p-8">Loading settings...</div>}>
            <SettingsContent />
        </Suspense>
    );
}
