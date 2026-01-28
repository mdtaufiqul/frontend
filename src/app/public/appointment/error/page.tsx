"use client";

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

function ErrorContent() {
    const searchParams = useSearchParams();
    const message = searchParams.get('message') || 'An invalid or expired link was used.';

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
                <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center mb-6 bg-red-100 text-red-600">
                    <AlertCircle size={40} />
                </div>

                <h1 className="text-2xl font-bold text-slate-900 mb-2">
                    Action Failed
                </h1>

                <p className="text-slate-600 mb-8">
                    {message}
                </p>

                <Link
                    href="/"
                    className="inline-flex items-center justify-center w-full py-3 px-4 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 transition-colors"
                >
                    Return to Home <ArrowRight size={16} className="ml-2" />
                </Link>
            </div>
        </div>
    );
}

export default function AppointmentErrorPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ErrorContent />
        </Suspense>
    );
}
