import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, CheckCircle2, ExternalLink, HelpCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface SmtpSetupGuideProps {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    trigger?: React.ReactNode;
    provider?: string; // Current selected provider
}

export function SmtpSetupGuide({ open, onOpenChange, trigger, provider = 'gmail' }: SmtpSetupGuideProps) {
    // Map provider to tab value
    const getTabValue = () => {
        if (provider === 'gmail') return 'gmail';
        if (provider === 'outlook') return 'outlook';
        if (provider === 'yahoo') return 'yahoo';
        if (provider === 'resend') return 'resend';
        return 'gmail'; // default
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Setup Guide: Connect Your Email</DialogTitle>
                    <DialogDescription>
                        Learn how to generate an "App Password" to connect your provider safely.
                    </DialogDescription>
                </DialogHeader>

                <Alert className="bg-blue-50 text-blue-900 border-blue-200">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Important</AlertTitle>
                    <AlertDescription>
                        Do NOT use your regular login password. You must generate a special "App Password" or "App-Specific Password" from your provider's security settings.
                    </AlertDescription>
                </Alert>

                <Tabs value={getTabValue()} className="w-full mt-4">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="resend">Resend</TabsTrigger>
                        <TabsTrigger value="gmail">Gmail</TabsTrigger>
                        <TabsTrigger value="outlook">Outlook</TabsTrigger>
                        <TabsTrigger value="yahoo">Yahoo</TabsTrigger>
                    </TabsList>

                    <TabsContent value="resend" className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <h3 className="font-semibold flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5 text-green-600" /> 1. Get Resend API Key
                            </h3>
                            <p className="text-sm text-gray-500 pl-7">
                                Go to <a href="https://resend.com/api-keys" target="_blank" className="text-blue-600 underline inline-flex items-center gap-1">Resend Dashboard <ExternalLink className="h-3 w-3" /></a>.
                                Create a new API key with "Sending access" permission.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <h3 className="font-semibold flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5 text-green-600" /> 2. Configure Settings
                            </h3>
                            <div className="pl-7 bg-gray-50 p-3 rounded text-sm border space-y-1">
                                <div><strong>Host:</strong> smtp.resend.com</div>
                                <div><strong>Port:</strong> 465</div>
                                <div><strong>Username:</strong> resend</div>
                                <div><strong>Password:</strong> Your API Key (re_...)</div>
                            </div>
                        </div>
                        <Alert className="bg-green-50 border-green-200">
                            <AlertTitle className="text-xs font-bold text-green-800">System Default</AlertTitle>
                            <AlertDescription className="text-xs text-green-700">
                                Resend is recommended for production use. It provides reliable email delivery with excellent deliverability rates.
                            </AlertDescription>
                        </Alert>
                    </TabsContent>

                    <TabsContent value="gmail" className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <h3 className="font-semibold flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5 text-green-600" /> 1. Enable 2-Step Verification
                            </h3>
                            <p className="text-sm text-gray-500 pl-7">
                                Go to <a href="https://myaccount.google.com/security" target="_blank" className="text-blue-600 underline inline-flex items-center gap-1">Google Account Security <ExternalLink className="h-3 w-3" /></a>.
                                Under "How you sign in to Google", ensure "2-Step Verification" is ON.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <h3 className="font-semibold flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5 text-green-600" /> 2. Generate App Password
                            </h3>
                            <p className="text-sm text-gray-500 pl-7">
                                In the search bar at the top of the Google Account page, type <strong>"App passwords"</strong> (or scroll to find it).
                            </p>
                            <div className="pl-7 bg-gray-50 p-3 rounded text-sm border">
                                1. Create a new app name: "MediFlow"<br />
                                2. Click "Create"<br />
                                3. Copy the 16-character code (remove spaces if manually typing)
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="outlook" className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <h3 className="font-semibold flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5 text-green-600" /> 1. Security Settings
                            </h3>
                            <p className="text-sm text-gray-500 pl-7">
                                Go to <a href="https://account.live.com/proofs/manage/additional" target="_blank" className="text-blue-600 underline inline-flex items-center gap-1">Microsoft Account Security <ExternalLink className="h-3 w-3" /></a>.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <h3 className="font-semibold flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5 text-green-600" /> 2. Create App Password
                            </h3>
                            <p className="text-sm text-gray-500 pl-7">
                                Scroll down to "App passwords". Click "Create a new app password".
                                Copy the generated password.
                            </p>
                            <Alert className="mt-2 bg-yellow-50 border-yellow-200">
                                <AlertTitle className="text-xs font-bold text-yellow-800">Note for Business (Office 365)</AlertTitle>
                                <AlertDescription className="text-xs text-yellow-700">
                                    Admin must enable "Authenticated SMTP" for your user in the Microsoft 365 Admin Center.
                                </AlertDescription>
                            </Alert>
                        </div>
                    </TabsContent>

                    <TabsContent value="yahoo" className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <h3 className="font-semibold flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5 text-green-600" /> 1. Account Info
                            </h3>
                            <p className="text-sm text-gray-500 pl-7">
                                Go to <a href="https://login.yahoo.com/account/security" target="_blank" className="text-blue-600 underline inline-flex items-center gap-1">Yahoo Account Security <ExternalLink className="h-3 w-3" /></a>.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <h3 className="font-semibold flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5 text-green-600" /> 2. Generate Password
                            </h3>
                            <p className="text-sm text-gray-500 pl-7">
                                Click "Generate app password". Enter "MediFlow" as the app name.
                                Copy the password.
                            </p>
                        </div>
                    </TabsContent>
                </Tabs>

                <DialogFooter>
                    <Button onClick={() => onOpenChange?.(false)}>Got it</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
