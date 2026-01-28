"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Filter, MoreHorizontal, FileText, Users, Clock, Trash2, Edit, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Badge from '@/components/ui/badge';
import api from '@/utils/api';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface FormSummary {
    id: string;
    title: string;
    description: string;
    status: string;
    updatedAt: string;
    submissions: number;
    systemType?: string;
    type: string;
    isActive: boolean;
}

const Forms: React.FC = () => {
    const router = useRouter();
    const [forms, setForms] = useState<FormSummary[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'system' | 'booking' | 'custom'>('system');
    const [showCreateDialog, setShowCreateDialog] = useState(false);

    const fetchForms = async () => {
        try {
            const response = await api.get('/forms');
            setForms(response.data);
        } catch (error) {
            console.error("Failed to fetch forms", error);
            toast.error("Failed to load forms");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchForms();
    }, []);

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent card click
        if (!confirm("Are you sure you want to delete this form?")) return;

        try {
            await api.delete(`/forms/${id}`);
            toast.success("Form deleted");
            fetchForms(); // Refresh list
        } catch (error) {
            console.error("Failed to delete form", error);
            toast.error("Failed to delete form");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Forms</h1>
                    <p className="text-slate-500">Create and manage patient questionnaires.</p>
                </div>
                <Button onClick={() => setShowCreateDialog(true)}><Plus size={16} className="mr-2" />Create Form</Button>
            </div>

            {/* Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
                <button
                    onClick={() => setActiveTab('system')}
                    className={clsx(
                        "px-6 py-2 text-sm font-bold rounded-lg transition-all",
                        activeTab === 'system' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    )}
                >
                    System Forms
                </button>
                <button
                    onClick={() => setActiveTab('booking')}
                    className={clsx(
                        "px-6 py-2 text-sm font-bold rounded-lg transition-all",
                        activeTab === 'booking' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    )}
                >
                    Booking Forms
                </button>
                <button
                    onClick={() => setActiveTab('custom')}
                    className={clsx(
                        "px-6 py-2 text-sm font-bold rounded-lg transition-all",
                        activeTab === 'custom' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    )}
                >
                    Custom / อื่นๆ
                </button>
            </div>

            <Card className="p-0">
                {/* Toolbar */}
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-4 flex-1">
                        <div className="relative w-64">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search forms..."
                                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-100"
                            />
                        </div>
                        <Button variant="outline" size="sm"><Filter size={14} className="mr-2" />Filter</Button>
                    </div>
                </div>

                {/* Grid of Forms */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                    {isLoading ? (
                        <p className="text-slate-400 col-span-full text-center py-10">Loading forms...</p>
                    ) : forms.filter(f => {
                        if (activeTab === 'system') return f.type === 'SYSTEM' || !!f.systemType && f.type !== 'BOOKING';
                        if (activeTab === 'booking') return f.type === 'BOOKING';
                        return f.type === 'CUSTOM' && !f.systemType;
                    }).length === 0 ? (
                        <div className="col-span-full text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                            <p className="text-slate-500 font-medium">No {activeTab} forms found.</p>
                            <Button variant="link" onClick={() => setShowCreateDialog(true)}>Create your first form</Button>
                        </div>
                    ) : forms.filter(f => {
                        if (activeTab === 'system') return f.type === 'SYSTEM' || !!f.systemType && f.type !== 'BOOKING';
                        if (activeTab === 'booking') return f.type === 'BOOKING';
                        return f.type === 'CUSTOM' && !f.systemType;
                    }).map(form => (
                        <div
                            key={form.id}
                            onClick={() => router.push(`/forms/${form.id}`)}
                            className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-lg hover:border-primary-100 transition-all cursor-pointer group relative"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className={clsx(
                                    "p-3 rounded-xl transition-colors",
                                    form.systemType
                                        ? "bg-purple-100 text-purple-700 group-hover:bg-purple-600 group-hover:text-white"
                                        : "bg-primary-50 text-primary-600 group-hover:bg-primary-600 group-hover:text-white"
                                )}>
                                    {form.systemType ? <Users size={24} /> : <FileText size={24} />}
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button
                                            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <MoreHorizontal size={16} />
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/forms/${form.id}`); }}>
                                            <Edit size={14} className="mr-2" /> Edit Configuration
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/forms/view/${form.id}`); }}>
                                            <Eye size={14} className="mr-2" /> Preview Form
                                        </DropdownMenuItem>
                                        {!form.systemType && (
                                            <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50" onClick={(e) => handleDelete(form.id, e)}>
                                                <Trash2 size={14} className="mr-2" /> Delete
                                            </DropdownMenuItem>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>

                            <div className="mb-2">
                                <h3 className="font-bold text-slate-900 truncate group-hover:text-primary-600 transition-colors flex items-center gap-2">
                                    {form.title}
                                    {form.systemType && <Badge variant="neutral" className="bg-purple-100 text-purple-700 border-purple-200 text-[10px] px-1.5 py-0.5">SYSTEM</Badge>}
                                </h3>
                                {form.systemType && <p className="text-xs text-slate-400 font-medium">Default {form.systemType.toLowerCase()} form</p>}
                            </div>

                            <div className="flex items-center gap-4 text-xs font-medium text-slate-500 mb-4">
                                <div className="flex items-center gap-1.5">
                                    <Users size={14} />
                                    {form.submissions || 0} Responses
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Clock size={14} />
                                    {form.updatedAt ? formatDistanceToNow(new Date(form.updatedAt), { addSuffix: true }) : 'Recently'}
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <Badge variant={
                                    (form.status || 'draft') === 'published' ? 'success' :
                                        (form.status || 'draft') === 'draft' ? 'warning' : 'neutral'
                                }>
                                    {(form.status || 'draft').toUpperCase()}
                                </Badge>
                                {form.type === 'BOOKING' && form.isActive && (
                                    <Badge variant="success" className="bg-green-600 text-white animate-pulse">ACTIVE BOOKING</Badge>
                                )}
                                <span className="text-xs font-bold text-primary-600 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0">
                                    Edit Form →
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>

            {/* Create Form Dialog */}
            {showCreateDialog && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <Card className="max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-slate-900">Create New Form</h2>
                            <button onClick={() => setShowCreateDialog(false)} className="text-slate-400 hover:text-slate-600 p-1"><Plus size={20} className="rotate-45" /></button>
                        </div>

                        <div className="space-y-4">
                            <p className="text-sm text-slate-500">Select the type of form you want to create:</p>

                            <button
                                onClick={() => router.push('/forms/new?type=BOOKING')}
                                className="w-full flex items-center gap-4 p-4 border border-slate-200 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition-all text-left group"
                            >
                                <div className="p-3 bg-primary-100 text-primary-600 rounded-xl group-hover:bg-primary-600 group-hover:text-white transition-colors">
                                    <Clock size={24} />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-slate-900">Booking Form</h3>
                                    <p className="text-xs text-slate-500">For patient appointments. Includes required system widgets.</p>
                                </div>
                            </button>

                            <button
                                onClick={() => router.push('/forms/new?type=CUSTOM')}
                                className="w-full flex items-center gap-4 p-4 border border-slate-200 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition-all text-left group"
                            >
                                <div className="p-3 bg-slate-100 text-slate-600 rounded-xl group-hover:bg-slate-600 group-hover:text-white transition-colors">
                                    <FileText size={24} />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-slate-900">Custom / Other Form</h3>
                                    <p className="text-xs text-slate-500">General questionnaires, intake forms, or feedback.</p>
                                </div>
                            </button>
                        </div>

                        <div className="mt-8 flex justify-end">
                            <Button variant="ghost" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default Forms;
