"use client";

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, XCircle, Calendar, ArrowRight } from 'lucide-react';
import Link from 'next/link';

function SuccessContent() {
    const searchParams = useSearchParams();
    const action = searchParams.get('action'); // confirmed, cancelled

    const isConfirmed = action === 'confirmed';

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
                <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center mb-6 ${isConfirmed ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'}`}>
                    {isConfirmed ? <CheckCircle size={40} /> : <XCircle size={40} />}
                </div>

                <h1 className="text-2xl font-bold text-slate-900 mb-2">
                    {isConfirmed ? 'Appointment Confirmed!' : 'Appointment Cancelled'}
                </h1>

                <p className="text-slate-600 mb-8">
                    {isConfirmed
                        ? 'Thank you for confirming your appointment. We look forward to seeing you.'
                        : 'Your appointment has been cancelled as requested. If this was a mistake, please contact us.'}
                </p>

                <div className="flex flex-col gap-3">
                    {isConfirmed && (
                        <div className="p-4 bg-slate-50 rounded-xl flex items-center justify-center gap-2 text-slate-600 text-sm mb-4">
                            <Calendar size={16} />
                            <span>Add to Calendar</span>
                        </div>
                    )}

                    <Link
                        href="/"
                        className="inline-flex items-center justify-center w-full py-3 px-4 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 transition-colors"
                    >
                        Return to Home <ArrowRight size={16} className="ml-2" />
                    </Link>
                </div>
            </div>

            <div className="mt-8 text-center text-slate-400 text-sm">
                &copy; {new Date().getFullYear()} MediFlow. Secure System.
            </div>
        </div>
    );
}

export default function AppointmentSuccessPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <SuccessContent />
        </Suspense>
    );
}
