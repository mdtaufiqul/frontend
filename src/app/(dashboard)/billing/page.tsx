"use client";

import React, { useState, useEffect } from 'react';
import { usePermissionApi } from '@/hooks/usePermissionApi';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import InvoiceCard from '@/components/billing/InvoiceCard';
import { Button } from '@/components/ui/button';
import { Plus, DollarSign, TrendingUp, CreditCard, Download, CircleDashed } from 'lucide-react';
import { toast } from 'sonner';

interface BillingStats {
    totalRevenue: number;
    outstanding: number;
    collectionRate: number;
}

interface Invoice {
    id: string;
    patientName: string;
    date: string;
    amount: number;
    status: 'paid' | 'pending' | 'overdue';
}

const Billing: React.FC = () => {
    const { get, post, can } = usePermissionApi();
    const { user } = useAuth();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [stats, setStats] = useState<BillingStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchBillingData = async () => {
        setIsLoading(true);
        try {
            const [statsRes, invoicesRes] = await Promise.all([
                get('view_billing', '/billing/stats'),
                get('view_billing', '/billing/invoices')
            ]);

            if (statsRes) setStats(statsRes.data);
            if (invoicesRes) setInvoices(invoicesRes.data);
        } catch (error) {
            console.error('Failed to fetch billing data:', error);
            toast.error('Failed to load billing data');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchBillingData();
    }, []);

    const handleCreateInvoice = async () => {
        try {
            const newInvoice = {
                patientName: "New Patient " + Math.floor(Math.random() * 100),
                date: new Date().toISOString().split('T')[0],
                amount: Math.floor(Math.random() * 300) + 50,
                status: 'pending' as const
            };

            await post('manage_billing', '/billing/invoices', newInvoice);
            toast.success('Invoice created successfully');
            fetchBillingData();
        } catch (error) {
            console.error('Failed to create invoice:', error);
            toast.error('Failed to create invoice');
        }
    };

    const totalRevenue = stats?.totalRevenue || 0;
    const outstanding = stats?.outstanding || 0;
    const collectionRate = stats?.collectionRate || 0;

    // Check if user has manage permission
    const canManage = can('manage_billing') || user?.role === 'SYSTEM_ADMIN';

    if (isLoading) {
        return (
            <div className="h-[60vh] flex flex-col items-center justify-center text-slate-400 gap-4">
                <CircleDashed className="w-10 h-10 animate-spin text-[var(--brand-primary)]" />
                <p className="font-serif text-lg">Loading billing data...</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Billing & Invoices</h1>
                    <p className="text-slate-500 font-medium">Manage payments, insurance claims, and revenue.</p>
                </div>
                {canManage && (
                    <div className="flex gap-3">
                        <Button variant="outline" className="gap-2">
                            <Download size={18} />
                            Export Report
                        </Button>
                        <Button onClick={handleCreateInvoice} className="gap-2 shadow-lg shadow-primary-200">
                            <Plus size={18} />
                            Create Invoice
                        </Button>
                    </div>
                )}
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between h-32">
                    <div className="flex justify-between items-start">
                        <div className="p-2 bg-green-50 rounded-lg text-green-600">
                            <DollarSign size={20} />
                        </div>
                        <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">+12.5%</span>
                    </div>
                    <div>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Total Revenue (YTD)</p>
                        <h3 className="text-2xl font-black text-slate-900">${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between h-32">
                    <div className="flex justify-between items-start">
                        <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                            <CreditCard size={20} />
                        </div>
                    </div>
                    <div>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Outstanding / Pending</p>
                        <h3 className="text-2xl font-black text-slate-900">${outstanding.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-2xl shadow-xl text-white flex flex-col justify-between h-32 relative overflow-hidden">
                    <TrendingUp className="absolute right-4 top-4 text-white/10" size={64} />
                    <div className="relative z-10">
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Collection Rate</p>
                        <h3 className="text-3xl font-black text-white">{collectionRate.toFixed(1)}%</h3>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-1.5 relative z-10">
                        <div className="bg-green-400 h-1.5 rounded-full" style={{ width: `${collectionRate}%` }}></div>
                    </div>
                </div>
            </div>

            {/* Invoice List */}
            <div>
                <h3 className="text-lg font-bold text-slate-900 mb-4">Recent Invoices</h3>
                {invoices.length === 0 ? (
                    <div className="text-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                        <p className="text-slate-400 font-medium">No invoices found.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {invoices.map((inv) => (
                            <InvoiceCard key={inv.id} invoice={inv} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Billing;
