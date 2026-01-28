"use client";
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Badge from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle, Smartphone, Globe, ShieldCheck, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import api from '@/utils/api';
import { toast } from 'sonner';
import { useSearchParams, useRouter } from 'next/navigation';
import { LogOut, Info } from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface WhatsAppStatus {
    tier: 'META_OFFICIAL' | 'QR_CODE' | 'SYSTEM_FALLBACK';
    isMetaLinked: boolean;
    isQrActive: boolean;
    phoneNumber?: string;
    isSystemQrActive?: boolean;
}

export function WhatsAppSettings() {
    const [status, setStatus] = useState<WhatsAppStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [showQrModal, setShowQrModal] = useState(false);
    const [isVerifyingQr, setIsVerifyingQr] = useState(false);
    const [disconnectApp, setDisconnectApp] = useState<{ open: boolean; type: 'meta' | 'qr' | null }>({ open: false, type: null });

    // System QR State
    const [systemQrCode, setSystemQrCode] = useState<string | null>(null);
    const [showSystemQrModal, setShowSystemQrModal] = useState(false);

    const searchParams = useSearchParams();
    const router = useRouter();

    useEffect(() => {
        const code = searchParams.get('code');
        if (code) {
            linkMetaAccount(code);
        }
    }, [searchParams]);

    useEffect(() => {
        loadStatus();
    }, []);

    const linkMetaAccount = async (code: string) => {
        const tId = toast.loading("Linking Meta Account...");
        try {
            await api.post('/whatsapp/meta/link', { code });
            toast.success("Meta Account Linked!", { id: tId });
            // Clear code from URL
            router.replace('/settings/communication');
            loadStatus();
        } catch (error) {
            toast.error("Failed to link account", { id: tId });
        }
    };

    const loadStatus = async () => {
        try {
            const res = await api.get('/whatsapp/status');
            setStatus(res.data);
        } catch (error) {
            console.error(error);
            // toast.error("Failed to load WhatsApp status");
        } finally {
            setLoading(false);
        }
    };

    const setTier = async (tier: 'META_OFFICIAL' | 'QR_CODE' | 'SYSTEM_FALLBACK') => {
        try {
            await api.put('/whatsapp/tier', { tier });
            toast.success("Active tier updated");
            loadStatus();
        } catch (error) {
            toast.error("Failed to update tier");
        }
    };

    const handleMetaLink = async () => {
        try {
            const res = await api.get('/whatsapp/meta/url');
            if (res.data.url) {
                window.location.href = res.data.url;
            }
        } catch (error) {
            toast.error("Failed to initiate Meta connection");
        }
    };

    const handleDisconnect = async (type: 'meta' | 'qr') => {
        setDisconnectApp({ open: true, type });
    };

    const confirmDisconnect = async () => {
        if (!disconnectApp.type) return;
        setDisconnectApp(prev => ({ ...prev, open: false }));

        const tId = toast.loading("Disconnecting...");
        try {
            await api.post(`/whatsapp/${disconnectApp.type}/disconnect`);
            toast.success("Disconnected", { id: tId });
            loadStatus();
        } catch (error) {
            toast.error("Failed to disconnect", { id: tId });
        }
    };

    const generateQr = async () => {
        try {
            setQrCode(null);
            setShowQrModal(true);
            const res = await api.get('/whatsapp/qr');
            if (res.data.success) {
                setQrCode(res.data.qrCode);
                startQrPolling();
            }
        } catch (error) {
            toast.error("Failed to generate QR Code");
            setShowQrModal(false);
        }
    };

    const startQrPolling = () => {
        setIsVerifyingQr(true);
        const interval = setInterval(async () => {
            try {
                const res = await api.post('/whatsapp/qr/verify');
                if (res.data.success) {
                    clearInterval(interval);
                    setIsVerifyingQr(false);
                    setShowQrModal(false);
                    toast.success("WhatsApp Connected!");
                    loadStatus();
                }
            } catch (error) {
                // Ignore errors
            }
        }, 3000);

        setTimeout(() => {
            clearInterval(interval);
            setIsVerifyingQr(false);
        }, 120000);
    };

    // System QR Logic
    const generateSystemQr = async () => {
        try {
            setSystemQrCode(null);
            const res = await api.get('/whatsapp/system/qr');
            if (res.data.success) {
                setSystemQrCode(res.data.qrCode);
                startSystemQrPolling();
            }
        } catch (error) {
            toast.error("Failed to generate System QR");
        }
    };

    const startSystemQrPolling = () => {
        setIsVerifyingQr(true);
        const interval = setInterval(async () => {
            try {
                const res = await api.post('/whatsapp/system/qr/verify');
                if (res.data.success) {
                    clearInterval(interval);
                    setIsVerifyingQr(false);
                    setShowSystemQrModal(false);
                    toast.success("System WhatsApp Connected!");
                    loadStatus();
                }
            } catch (error) {
                // Ignore
            }
        }, 3000);

        setTimeout(() => {
            clearInterval(interval);
            setIsVerifyingQr(false);
        }, 120000);
    };

    if (loading) return <div className="p-4"><Loader2 className="animate-spin" /></div>;

    const currentTier = status?.tier || 'SYSTEM_FALLBACK';

    return (
        <div className="space-y-6 mt-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">WhatsApp Configuration</h3>
                <Badge variant={currentTier === 'SYSTEM_FALLBACK' ? 'neutral' : 'primary'} className="text-sm">
                    Current Tier: {currentTier.replace('_', ' ')}
                </Badge>
            </div>

            {/* Scan and Go (QR Code) */}
            <Card className={`relative overflow-hidden ${currentTier === 'QR_CODE' ? 'border-primary bg-primary/5' : ''}`}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Smartphone className="w-4 h-4 text-purple-600" />
                        Scan and Go
                    </CardTitle>
                    <CardDescription>Connect your own WhatsApp by scanning a QR code</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-3">
                        <p className="text-sm font-medium text-slate-900">What happens when you connect:</p>
                        <ul className="text-sm space-y-2 text-slate-600 list-disc pl-4">
                            <li>
                                <strong>Your phone becomes the sender:</strong> All notifications and messages from Mediflow will be sent from your personal WhatsApp number.
                            </li>
                            <li>
                                <strong>Full History Sync:</strong> You will see all sent messages in your phone's chat history, just as if you typed them yourself.
                            </li>
                            <li>
                                <strong>Requirement:</strong> Your phone must stay <u>switched on and connected to the internet</u> for messages to be delivered.
                            </li>
                        </ul>
                    </div>
                    {status?.isQrActive ? (
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2 text-green-600 font-medium justify-between">
                                <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Active</div>
                                <div className="flex gap-1">
                                    <Button type="button" size="icon" variant="ghost" className="h-6 w-6 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDisconnect('qr')} title="Disconnect">
                                        <LogOut className="w-3 h-3" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={generateQr} title="Reconnect / Scan New">
                                        <RefreshCw className="w-3 h-3" />
                                    </Button>
                                </div>
                            </div>
                            {currentTier !== 'QR_CODE' && (
                                <Button size="sm" variant="secondary" onClick={() => setTier('QR_CODE')}>
                                    Set as Active
                                </Button>
                            )}
                        </div>
                    ) : (
                        <Button onClick={generateQr} variant="outline" className="w-full">
                            Scan QR Code
                        </Button>
                    )}
                </CardContent>
            </Card>



            {/* Test Section */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Test Delivery</CardTitle>
                    <CardDescription>Send a test message to verify your current configuration.</CardDescription>
                </CardHeader>
                <CardContent className="flex gap-4 items-end">
                    <div className="grid w-full max-w-sm items-center gap-1.5">
                        <Label htmlFor="test-phone">Phone Number</Label>
                        <Input
                            id="test-phone"
                            placeholder="+1234567890"
                            defaultValue="+8801730632601"
                        />
                    </div>
                    <Button
                        onClick={async () => {
                            const input = document.getElementById('test-phone') as HTMLInputElement;
                            if (!input.value) return toast.error("Enter a phone number");

                            const tId = toast.loading("Sending test message...");
                            try {
                                const res = await api.post('/whatsapp/test', { to: input.value });
                                if (res.data.success) {
                                    toast.success("Message Sent!", { id: tId });
                                }
                            } catch (err: any) {
                                toast.error("Failed to send", {
                                    id: tId,
                                    description: err.response?.data?.message || err.message
                                });
                            }
                        }}
                    >
                        Send Test Message
                    </Button>
                </CardContent>
            </Card>

            {/* Disconnect Confirmation Dialog */}
            <Dialog open={disconnectApp.open} onOpenChange={(open) => setDisconnectApp(prev => ({ ...prev, open }))}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Disconnect WhatsApp?</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to disconnect? This will stop all messaging services for this tier.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-2 mt-4">
                        <Button variant="outline" onClick={() => setDisconnectApp({ open: false, type: null })}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={confirmDisconnect}>
                            Yes, Disconnect
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={showQrModal} onOpenChange={setShowQrModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Scan QR Code</DialogTitle>
                        <DialogDescription>
                            Open WhatsApp on your phone, go to Linked Devices, and scan this code.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col items-center justify-center p-4 space-y-4">
                        {qrCode ? (
                            <img src={qrCode} alt="WhatsApp QR Code" className="w-64 h-64 border rounded-lg" />
                        ) : (
                            <div className="w-64 h-64 border rounded-lg flex items-center justify-center bg-muted">
                                <Loader2 className="w-8 h-8 animate-spin" />
                            </div>
                        )}
                        {isVerifyingQr && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="w-3 h-3 animate-spin" /> Waiting for scan...
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
