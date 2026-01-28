"use client";

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/utils/api';
import { useAuth } from '@/context/AuthContext';

const GoogleCallbackContent = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
    const [message, setMessage] = useState('Connecting your Google account...');

    useEffect(() => {
        const code = searchParams.get('code');
        const error = searchParams.get('error');

        if (error) {
            setStatus('error');
            setMessage('Google authorization was denied or failed.');
            toast.error('Authorization failed');
            setTimeout(() => router.push('/settings?tab=clinical'), 3000);
            return;
        }

        if (!code) {
            setStatus('error');
            setMessage('No authorization code received.');
            setTimeout(() => router.push('/settings?tab=clinical'), 3000);
            return;
        }

        if (!user) {
            // Wait for auth to load
            return;
        }

        const exchangeCode = async () => {
            try {
                // We need to retrieve the client ID and secret from the backend or local storage
                // to complete the exchange. Since we don't store them in session during redirect,
                // we'll fetch the stored partial credentials from the user (if any) or rely on what was just saved.
                // However, the backend exchange endpoint expects the client ID/Secret to be passed again
                // to verify the exchange. This is a bit tricky if we don't persist them.

                // OPTIMIZATION: In the backend controller `exchangeGoogleCode`, we expect clientId and clientSecret.
                // But typically in OAuth flow, we should have these on the backend or stored in a temp session.
                // To keep it simple and consistent with our previous implementation where we saved them
                // partially in the backend before generating the URL, we'll try to fetch the USER's saved
                // googleClientId from the backend first, or assume they are still capable of being retrieved.

                // BETTER APPROACH: The user just saved the Client ID/Secret in the modal before clicking "Generate URL".
                // So they are saved in the DB.
                // The `exchangeGoogleCode` endpoint requires them to be sent in the body.
                // Let's modify the backend logic slightly or just fetch settings first.

                const settingsRes = await api.get(`/users/${user.id}/video-settings`);
                const { googleClientId } = settingsRes.data;

                // We need the secret too, but the backend doesn't return it for security.
                // This implies a flaw in the current design: we can't send the secret back if we don't have it.
                // 
                // FIX: The backend `exchangeGoogleCode` should probably look up the stored credentials
                // from the user record if not provided, OR we need to trust the stored ones.
                // Let's rely on the fact that if we updated the credentials before generating the URL,
                // they are in the database. 
                //
                // Let's verify what the backend expects in `users.controller.ts`.
                // It expects `@Body() body: { code: string; clientId: string; clientSecret: string }`.
                // This is problematic if we can't access the secret.

                // ALTERNATIVE: We can assume the user just filled them in. But on callback, proper persistence is needed.
                // Let's check if we can update the backend to use stored credentials if body params are missing.

                // For now, let's assume valid flow is: 
                // 1. User enters creds -> Saved to DB.
                // 2. User clicks Auth -> Validates checks.
                // 3. Callback -> We call backend with JUST code.
                // 4. Backend looks up user's stored Creds + Code -> Exchanges token.

                // I will need to update the backend endpoint to be smarter.
                // Let's try to call a NEW or MODIFIED endpoint that doesn't require explicit secret passing
                // if it's already in the DB.

                // Let's proceed with calling a simpler endpoint:
                await api.post(`/users/${user.id}/google-exchange-code`, {
                    code,
                    useStoredCredentials: true // Feature flag for our updated backend logic
                });

                setStatus('success');
                setMessage('Google Meet connected successfully!');
                toast.success('Connected to Google Meet');
                setTimeout(() => router.push('/settings?tab=clinical'), 2000);

            } catch (err: any) {
                console.error(err);
                setStatus('error');
                setMessage(err.response?.data?.message || 'Failed to connect Google account.');
                toast.error('Connection failed');
                setTimeout(() => router.push('/settings?tab=clinical'), 3000);
            }
        };

        exchangeCode();

    }, [searchParams, router, user]);

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="bg-white max-w-md w-full rounded-2xl shadow-xl p-8 text-center">
                {status === 'processing' && (
                    <>
                        <Loader2 className="animate-spin text-primary-600 mx-auto mb-4" size={48} />
                        <h2 className="text-xl font-bold text-slate-900 mb-2">Connecting...</h2>
                        <p className="text-slate-500">{message}</p>
                    </>
                )}
                {status === 'success' && (
                    <>
                        <div className="bg-emerald-100 text-emerald-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle size={32} />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 mb-2">Success!</h2>
                        <p className="text-slate-500 mb-6">{message}</p>
                    </>
                )}
                {status === 'error' && (
                    <>
                        <div className="bg-red-100 text-red-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <XCircle size={32} />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 mb-2">Connection Failed</h2>
                        <p className="text-slate-500 mb-6">{message}</p>
                    </>
                )}
            </div>
        </div>
    );
};

export default function GoogleCallbackPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <GoogleCallbackContent />
        </Suspense>
    );
}
