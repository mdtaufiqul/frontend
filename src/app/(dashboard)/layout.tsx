"use client";

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';

import Header from '@/components/layout/Header';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const { isAuthenticated, user } = useAuth();
    const router = useRouter();

    useEffect(() => {
        // Simple protection check (can be improved with middleware)
        // Wait for mount to check local storage
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('auth_token');
            const storedUser = localStorage.getItem('auth_user');
            console.log("DashboardLayout Check - Token:", !!token);
            console.log("DashboardLayout Check - User from localStorage:", storedUser ? JSON.parse(storedUser) : null);
            console.log("DashboardLayout Check - User from context:", user);

            if (!token) {
                console.warn("No token found, redirecting to login");
                router.push('/login');
            }
        }
    }, [router, user]);

    // Optionally show loading state while checking
    // For MVP, we render. Unauthenticated users get redirected.

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            {/* Sidebar */}
            <Sidebar isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header sidebarOpen={sidebarOpen} />


                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50 p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
