"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/utils/api';
import { useAuth } from '@/context/AuthContext';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const VerifyInviteContent = () => {
    const searchParams = useSearchParams();
    const token = searchParams.get('token');
    const router = useRouter();
    const { login } = useAuth(); // We might use this if we want to manually set state, but backend returns token.

    const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
    const [message, setMessage] = useState('Verifying your invitation...');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('No verification token provided.');
            return;
        }

        const verify = async () => {
            try {
                const res = await api.post('/auth/verify-invite', { token });
                setStatus('success');
                setMessage('Account verified! Redirecting to dashboard...');

                // Auto-login if backend returns token
                if (res.data.token && res.data.user) {
                    localStorage.setItem('token', res.data.token);
                    localStorage.setItem('user', JSON.stringify(res.data.user));

                    // Dispatch event for other tabs/components
                    window.dispatchEvent(new Event('storage'));

                    // Small delay for UX
                    setTimeout(() => {
                        window.location.href = '/'; // Hard reload to ensure context picks up
                    }, 1500);
                } else {
                    setTimeout(() => router.push('/login'), 2000);
                }

            } catch (err: any) {
                console.error("Verification failed", err);
                setStatus('error');
                setMessage(err.response?.data?.message || 'Verification failed. The token may be invalid or expired.');
            }
        };

        verify();
    }, [token, router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center space-y-6">

                {status === 'verifying' && (
                    <>
                        <div className="flex justify-center">
                            <Loader2 className="w-12 h-12 text-[var(--brand-primary)] animate-spin" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-800">Verifying...</h2>
                        <p className="text-slate-500">{message}</p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div className="flex justify-center">
                            <CheckCircle className="w-16 h-16 text-emerald-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800">You're In!</h2>
                        <p className="text-slate-600 font-medium">{message}</p>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div className="flex justify-center">
                            <XCircle className="w-16 h-16 text-rose-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800">Verification Failed</h2>
                        <p className="text-slate-500">{message}</p>
                        <Button
                            onClick={() => router.push('/login')}
                            className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl mt-4"
                        >
                            Return to Login
                        </Button>
                    </>
                )}
            </div>
        </div>
    );
};

export default function VerifyInvitePage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <VerifyInviteContent />
        </Suspense>
    );
}
