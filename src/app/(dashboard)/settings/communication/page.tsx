"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from 'sonner';
import { Loader2, CheckCircle, XCircle, Mail, MessageSquare, HelpCircle, FileText } from 'lucide-react';
import api from '@/utils/api';
import { SmtpSetupGuide } from '@/components/settings/SmtpSetupGuide';
import { WhatsAppSettings } from '@/components/settings/WhatsAppSettings';
import { EmailTemplateManager } from '@/components/settings/EmailTemplateManager';
import { Skeleton } from "@/components/ui/skeleton";

export default function CommunicationSettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);

    // Form State
    const [provider, setProvider] = useState('custom');
    const [host, setHost] = useState('');
    const [port, setPort] = useState('587');
    const [user, setUser] = useState('');
    const [password, setPassword] = useState('');
    const [senderName, setSenderName] = useState('');
    const [hasSavedPassword, setHasSavedPassword] = useState(false);
    const [savedProvider, setSavedProvider] = useState<string>(''); // Track which provider is saved
    const [systemEmail, setSystemEmail] = useState('onboarding@resend.dev');

    // SMS Form State
    const [smsAccountSid, setSmsAccountSid] = useState('');
    const [smsAuthToken, setSmsAuthToken] = useState('');
    const [smsPhoneNumber, setSmsPhoneNumber] = useState('');
    const [whatsappNumber, setWhatsappNumber] = useState('');
    const [hasSavedToken, setHasSavedToken] = useState(false);

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        try {
            const results = await Promise.allSettled([
                api.get('/settings/smtp'),
                api.get('/settings/sms')
            ]);

            // Load Email
            if (results[0].status === 'fulfilled') {
                const emailData = results[0].value.data;
                if (emailData && emailData.host) {
                    setHost(emailData.host);
                    setPort(emailData.port?.toString() || '587');
                    setUser(emailData.user);
                    setSenderName(emailData.senderName || '');
                    setHasSavedPassword(emailData.hasPassword);
                    if (emailData.systemEmail) setSystemEmail(emailData.systemEmail);

                    if (emailData.host.includes('resend')) setProvider('resend');
                    else if (emailData.host.includes('gmail')) setProvider('gmail');
                    else if (emailData.host.includes('office365') || emailData.host.includes('outlook')) setProvider('outlook');
                    else if (emailData.host.includes('yahoo')) setProvider('yahoo');
                    else setProvider('custom');

                    // Track the saved provider
                    if (emailData.host.includes('resend')) setSavedProvider('resend');
                    else if (emailData.host.includes('gmail')) setSavedProvider('gmail');
                    else if (emailData.host.includes('office365') || emailData.host.includes('outlook')) setSavedProvider('outlook');
                    else if (emailData.host.includes('yahoo')) setSavedProvider('yahoo');
                    else setSavedProvider('custom');
                }
            } else {
                console.error("SMTP Load Failed", results[0].reason);
                // toast.error("Failed to load SMTP settings"); // Optional: don't annoy if just empty
            }

            // Load SMS
            if (results[1].status === 'fulfilled') {
                const smsData = results[1].value.data;
                if (smsData && smsData.accountSid) {
                    setSmsAccountSid(smsData.accountSid);
                    setSmsPhoneNumber(smsData.phoneNumber);
                    setWhatsappNumber(smsData.whatsappNumber || '');
                    setHasSavedToken(smsData.hasAuthToken);
                }
            } else {
                console.error("SMS Load Failed", results[1].reason);
                // toast.error("Failed to load SMS settings");
            }

        } catch (err) {
            console.error(err);
            toast.error("Unexpected error loading settings");
        } finally {
            setLoading(false);
        }
    };

    const handleProviderChange = (val: string) => {
        setProvider(val);

        // Clear fields when switching providers (unless already saved)
        if (!hasSavedPassword) {
            setUser('');
            setPassword('');
        }

        if (val === 'gmail') {
            setHost('smtp.gmail.com');
            setPort('587');
        } else if (val === 'outlook') {
            setHost('smtp.office365.com');
            setPort('587');
        } else if (val === 'yahoo') {
            setHost('smtp.mail.yahoo.com');
            setPort('465');
        } else if (val === 'resend') {
            setHost('smtp.resend.com');
            setPort('465');
            setUser('resend');
        } else if (val === 'custom') {
            // Clear host/port for custom
            if (!hasSavedPassword) {
                setHost('');
                setPort('587');
            }
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const toastId = toast.loading("Saving configuration...");

        try {
            // Save Email
            if (provider === 'resend') {
                // For Resend, save a special config to indicate system SMTP
                await api.post('/settings/smtp', {
                    host: 'smtp.resend.com',
                    port: 465,
                    user: 'resend',
                    password: 'SYSTEM_MANAGED', // Special marker
                    senderName: senderName || 'MediFlow'
                });
                setHasSavedPassword(true);
            } else if (host) {
                await api.post('/settings/smtp', {
                    host, port, user, password, senderName
                });
                if (password) {
                    setHasSavedPassword(true);
                    setPassword('');
                }
            }

            // Save SMS
            if (smsAccountSid) {
                await api.post('/settings/sms', {
                    accountSid: smsAccountSid,
                    authToken: smsAuthToken,
                    phoneNumber: smsPhoneNumber,
                    whatsappNumber
                });
                if (smsAuthToken) {
                    setHasSavedToken(true);
                    setSmsAuthToken('');
                }
            }

            toast.success("Settings saved", {
                id: toastId,
                description: provider === 'resend'
                    ? "System email service activated."
                    : "Your communication preferences have been updated."
            });
        } catch (err) {
            console.error(err);
            toast.error("Failed to save", {
                id: toastId,
                description: "There was an error updating your settings."
            });
        } finally {
            setSaving(false);
        }
    };

    const handleTest = async (type: 'email' | 'sms') => {
        setTesting(true);
        try {
            let endpoint = '/settings/smtp/test';
            if (type === 'sms') endpoint = '/settings/sms/test';

            // Warning for unsaved creds
            if ((type === 'email' && password) || (type === 'sms' && smsAuthToken)) {
                toast.info("Unsaved Credentials", {
                    description: "Please save changes before testing if you updated credentials.",
                });
            }

            const toastId = toast.loading(`Testing ${type.toUpperCase()} connection...`);
            const res = await api.post(endpoint);

            if (res.data.success) {
                toast.success("Connection Successful", {
                    id: toastId,
                    description: `Your ${type === 'sms' ? 'Twilio' : 'SMTP'} settings are verified.`,
                });
            } else {
                toast.error("Connection Failed", {
                    id: toastId,
                    description: res.data.message || "Could not verify credentials.",
                });
            }
        } catch (err: any) {
            toast.error("Test Error", {
                description: err?.response?.data?.message || err.message
            });
        } finally {
            setTesting(false);
        }
    };

    if (loading) return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div className="space-y-2">
                <Skeleton className="h-8 w-[200px]" />
                <Skeleton className="h-4 w-[300px]" />
            </div>
            <div className="space-y-4">
                <div className="flex gap-2">
                    <Skeleton className="h-10 w-[150px]" />
                    <Skeleton className="h-10 w-[150px]" />
                </div>
                <div className="border rounded-xl p-6 space-y-6">
                    <div className="flex justify-between">
                        <div className="space-y-2">
                            <Skeleton className="h-6 w-[150px]" />
                            <Skeleton className="h-4 w-[250px]" />
                        </div>
                        <Skeleton className="h-9 w-[120px]" />
                    </div>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <Skeleton className="h-10 w-full col-span-2" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Communication Settings</h2>
                <p className="text-muted-foreground">Configure how MediFlow sends emails and messages.</p>
            </div>

            <Tabs defaultValue="email">
                <TabsList>
                    <TabsTrigger value="email" className="flex gap-2"><Mail className="w-4 h-4" /> Email (SMTP)</TabsTrigger>
                    <TabsTrigger value="templates" className="flex gap-2"><FileText className="w-4 h-4" /> Library</TabsTrigger>
                    <TabsTrigger value="whatsapp" className="flex gap-2"><MessageSquare className="w-4 h-4" /> WhatsApp</TabsTrigger>
                </TabsList>

                <TabsContent value="email">
                    <Card>
                        {/* ... (Existing Email Config) ... */}
                        <CardHeader>
                            <CardTitle className="flex justify-between items-center">
                                <span>SMTP Configuration</span>
                                <SmtpSetupGuide
                                    provider={provider}
                                    trigger={
                                        <Button variant="outline" size="sm" className="gap-2 text-blue-600">
                                            <HelpCircle className="w-4 h-4" /> Setup Guide
                                        </Button>
                                    }
                                />
                            </CardTitle>
                            <CardDescription>
                                Bring your own email provider. We recommend using an App Password.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSave} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Provider</Label>
                                        <Select value={provider} onValueChange={handleProviderChange}>
                                            <SelectTrigger><SelectValue placeholder="Select Provider" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="resend">🚀 Resend (System Default)</SelectItem>
                                                <SelectItem value="gmail">Gmail / G-Suite</SelectItem>
                                                <SelectItem value="outlook">Outlook / Office 365</SelectItem>
                                                <SelectItem value="yahoo">Yahoo Mail</SelectItem>
                                                <SelectItem value="custom">Custom SMTP</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Sender Name</Label>
                                        <Input
                                            placeholder="e.g. Dr. Smith"
                                            value={senderName}
                                            onChange={e => setSenderName(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {provider === 'resend' && (
                                    <>
                                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                                            <div className="flex items-start gap-3">
                                                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                                                <div>
                                                    <h4 className="font-semibold text-green-900 text-sm">System-Managed Email Service</h4>
                                                    <p className="text-xs text-green-700 mt-1">
                                                        Resend is configured and managed by the system. No additional setup required.
                                                        All emails will be sent using the system's Resend account.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-2 mb-4">
                                            <Label>System Email Address</Label>
                                            <Input
                                                value={systemEmail}
                                                readOnly
                                                className="bg-slate-100 cursor-not-allowed"
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                All emails will be sent from this address.
                                            </p>
                                        </div>
                                    </>
                                )}

                                <div className="grid grid-cols-3 gap-4">
                                    <div className="col-span-2 space-y-2">
                                        <Label>SMTP Host</Label>
                                        <Input
                                            value={host}
                                            onChange={e => setHost(e.target.value)}
                                            placeholder="smtp.example.com"
                                            disabled={provider === 'resend'}
                                            className={provider === 'resend' ? 'bg-slate-100' : ''}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Port</Label>
                                        <Input
                                            value={port}
                                            onChange={e => setPort(e.target.value)}
                                            placeholder="587"
                                            disabled={provider === 'resend'}
                                            className={provider === 'resend' ? 'bg-slate-100' : ''}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Username / Email</Label>
                                        <Input
                                            value={user}
                                            onChange={e => setUser(e.target.value)}
                                            placeholder="doctor@example.com"
                                            disabled={provider === 'resend'}
                                            className={provider === 'resend' ? 'bg-slate-100' : ''}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="flex justify-between">
                                            Password
                                            {hasSavedPassword && <span className="text-xs text-green-600 font-medium flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Saved</span>}
                                        </Label>
                                        <Input
                                            type="password"
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            placeholder={hasSavedPassword ? "••••••••" : "Enter App Password"}
                                            disabled={provider === 'resend'}
                                            className={provider === 'resend' ? 'bg-slate-100' : ''}
                                        />
                                        {provider !== 'resend' && (
                                            <p className="text-xs text-muted-foreground">
                                                Use an <SmtpSetupGuide provider={provider} trigger={<span className="underline cursor-pointer text-blue-500">App Password</span>} /> not your login password.
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex justify-between pt-4">
                                    {provider !== 'resend' && (
                                        <Button type="button" variant="secondary" onClick={() => handleTest('email')} disabled={testing || !hasSavedPassword}>
                                            {testing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Test Email Connection"}
                                        </Button>
                                    )}
                                    {provider === 'resend' && (
                                        <div className="text-sm text-green-600 flex items-center gap-2">
                                            <CheckCircle className="w-4 h-4" />
                                            System email service ready
                                        </div>
                                    )}
                                    <Button type="submit" disabled={saving}>
                                        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : (provider === 'resend' ? 'Activate System Email' : 'Save Changes')}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="templates">
                    <EmailTemplateManager />
                </TabsContent>

                <TabsContent value="whatsapp">
                    {/* WhatsApp Settings (Scan and Go Only) */}
                    <WhatsAppSettings />
                </TabsContent>
            </Tabs>
        </div >
    );
}
