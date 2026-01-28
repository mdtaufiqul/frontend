
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { getApiBaseUrl } from '@/utils/api';

export default function PatientLoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch(`${getApiBaseUrl()}/api/patient/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            if (!res.ok) throw new Error('Invalid credentials');

            const data = await res.json();
            localStorage.setItem('patient_token', data.access_token);
            localStorage.setItem('patient_info', JSON.stringify(data.patient));
            router.push('/patient/dashboard');
        } catch (err: any) {
            setError(err.message);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
                <h2 className="text-3xl font-bold text-center">Patient Login</h2>
                {error && <p className="text-red-500 text-center">{error}</p>}
                <form className="mt-8 space-y-6" onSubmit={handleLogin}>
                    <input
                        type="email"
                        required
                        className="w-full px-3 py-2 border rounded"
                        placeholder="Email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <input
                        type="password"
                        required
                        className="w-full px-3 py-2 border rounded"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                        type="submit"
                        className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        Sign in
                    </button>
                </form>
            </div>
        </div>
    );
}
