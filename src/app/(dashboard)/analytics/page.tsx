'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Users,
    Calendar,
    Activity,
    TrendingUp,
    BarChart3,
    Download,
    Filter,
    Pill,
    AlertCircle,
    ChevronDown,
    CalendarDays
} from 'lucide-react';
import api from '@/utils/api';
import { toast } from 'sonner';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function AnalyticsPage() {
    const [stats, setStats] = useState({
        totalPatients: 0,
        recentEncounters: 0,
        activeMedications: 0,
        criticalAllergies: 0
    });
    const [isLoading, setIsLoading] = useState(true);
    const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('all');

    const fetchAnalytics = React.useCallback(async () => {
        try {
            setIsLoading(true);
            let params = {};
            if (dateRange !== 'all') {
                const end = new Date();
                const start = new Date();
                if (dateRange === '7d') start.setDate(end.getDate() - 7);
                else if (dateRange === '30d') start.setDate(end.getDate() - 30);
                else if (dateRange === '90d') start.setDate(end.getDate() - 90);

                params = {
                    startDate: start.toISOString(),
                    endDate: end.toISOString()
                };
            }

            const res = await api.get('/dashboard/analytics', { params });
            const data = res.data;

            setStats({
                totalPatients: data.totalPatients || 0,
                recentEncounters: data.recentEncounters || 0,
                activeMedications: data.activeMedications || 0,
                criticalAllergies: data.criticalAllergies || 0
            });
        } catch (error) {
            console.error('Failed to fetch analytics', error);
            toast.error('Failed to update analytics data');
        } finally {
            setIsLoading(false);
        }
    }, [dateRange]);

    useEffect(() => {
        fetchAnalytics();
    }, [fetchAnalytics]);

    const handleExport = async () => {
        try {
            toast.loading('Preparing report...', { id: 'export-report' });

            let params: any = {};
            if (dateRange !== 'all') {
                const end = new Date();
                const start = new Date();
                if (dateRange === '7d') start.setDate(end.getDate() - 7);
                else if (dateRange === '30d') start.setDate(end.getDate() - 30);
                else if (dateRange === '90d') start.setDate(end.getDate() - 90);
                params = { startDate: start.toISOString(), endDate: end.toISOString() };
            }

            const response = await api.get('/dashboard/analytics/export', {
                params,
                responseType: 'blob'
            });

            // Trigger download
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `clinical_analytics_${dateRange}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();

            toast.success('Report downloaded successfully', { id: 'export-report' });
        } catch (error) {
            console.error('Export failed', error);
            toast.error('Failed to export report', { id: 'export-report' });
        }
    };

    return (
        <div className="space-y-8 p-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Clinic Intelligence</h1>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Real-time Clinical Insights & Reporting</p>
                </div>
                <div className="flex gap-3">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="rounded-xl border-slate-200 font-bold h-11">
                                <Filter size={18} className="mr-2" />
                                {dateRange === 'all' ? 'All Time' :
                                    dateRange === '7d' ? 'Last 7 Days' :
                                        dateRange === '30d' ? 'Last 30 Days' : 'Last 90 Days'}
                                <ChevronDown size={14} className="ml-2 opacity-50" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-xl p-1 shadow-2xl border-slate-100">
                            <DropdownMenuItem onClick={() => setDateRange('7d')} className="rounded-lg font-medium py-2 px-3">Last 7 Days</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setDateRange('30d')} className="rounded-lg font-medium py-2 px-3">Last 30 Days</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setDateRange('90d')} className="rounded-lg font-medium py-2 px-3">Last 90 Days</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setDateRange('all')} className="rounded-lg font-medium py-2 px-3">All Time</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <Button
                        onClick={handleExport}
                        className="bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold h-11 px-6 shadow-lg shadow-primary-200"
                    >
                        <Download size={18} className="mr-2" /> Export CSV
                    </Button>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Total Patients', value: stats.totalPatients, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Clinical Encounters', value: stats.recentEncounters, icon: Activity, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                    { label: 'Active Prescriptions', value: stats.activeMedications, icon: Pill, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Critical Risks', value: stats.criticalAllergies, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
                ].map((stat, i) => (
                    <Card key={i} className="p-6 border-none shadow-xl shadow-slate-200/50 hover:-translate-y-1 transition-all">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                                <h3 className="text-3xl font-black text-slate-900">{stat.value}</h3>
                            </div>
                            <div className={`${stat.bg} ${stat.color} p-3 rounded-2xl`}>
                                <stat.icon size={24} />
                            </div>
                        </div>
                        <div className="mt-4 flex items-center gap-2">
                            <TrendingUp size={14} className="text-emerald-500" />
                            <span className="text-[10px] font-bold text-emerald-600">+12% from last month</span>
                        </div>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Distribution Chart (Mock UI) */}
                <Card className="lg:col-span-2 p-8 border-none shadow-xl shadow-slate-200/50">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-lg font-black text-slate-900">Encounter Volume Breakdown</h3>
                            <p className="text-xs font-medium text-slate-500">Distribution across Telehealth vs In-person</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded-full bg-primary-500"></span>
                                <span className="text-[10px] font-black text-slate-400 uppercase">Telehealth</span>
                            </div>
                            <div className="flex items-center gap-1.5 ml-4">
                                <span className="w-3 h-3 rounded-full bg-slate-200"></span>
                                <span className="text-[10px] font-black text-slate-400 uppercase">In-Office</span>
                            </div>
                        </div>
                    </div>

                    <div className="h-64 flex items-end gap-3 pb-2 border-b border-slate-100">
                        {[45, 60, 55, 80, 70, 90, 85, 95, 100, 80, 75, 90].map((h, i) => (
                            <div key={i} className="flex-1 flex flex-col gap-1 items-center group">
                                <div className="w-full bg-slate-100 rounded-t-lg relative overflow-hidden h-full cursor-pointer hover:bg-slate-200 transition-colors">
                                    <div
                                        style={{ height: `${h}%` }}
                                        className="absolute bottom-0 left-0 right-0 bg-primary-500 rounded-t-lg group-hover:bg-primary-600 transition-all"
                                    ></div>
                                </div>
                                <span className="text-[8px] font-bold text-slate-400 uppercase mt-2">{['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'][i]}</span>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* Top Diagnoses */}
                <Card className="p-8 border-none shadow-xl shadow-slate-200/50">
                    <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                        <BarChart3 className="text-primary-600" /> Top Diagnoses
                    </h3>
                    <div className="space-y-6">
                        {[
                            { label: 'Hypertension', count: 48, percentage: 85, color: 'bg-blue-500' },
                            { label: 'Type 2 Diabetes', count: 32, percentage: 65, color: 'bg-emerald-500' },
                            { label: 'Anxiety Disorder', count: 28, percentage: 55, color: 'bg-amber-500' },
                            { label: 'Lower Back Pain', count: 24, percentage: 45, color: 'bg-rose-500' },
                            { label: 'Asthma', count: 18, percentage: 35, color: 'bg-cyan-500' },
                        ].map((item, i) => (
                            <div key={i} className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-bold text-slate-700">{item.label}</span>
                                    <span className="text-xs font-black text-slate-900">{item.count}</span>
                                </div>
                                <div className="h-2 bg-slate-50 rounded-full overflow-hidden">
                                    <div style={{ width: `${item.percentage}%` }} className={`h-full ${item.color} rounded-full`}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <Button variant="link" className="w-full mt-8 text-primary-600 font-bold hover:no-underline">View Full Spectrum</Button>
                </Card>
            </div>
        </div>
    );
}
