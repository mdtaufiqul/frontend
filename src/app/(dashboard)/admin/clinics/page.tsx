"use client";

import React, { useEffect, useState } from 'react';
import {
    Building2,
    Plus,
    Search,
    Edit,
    Trash2,
    Users,
    MapPin,
    Phone,
    Mail,
    Globe,
    Clock
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Badge from '@/components/ui/badge';
import clsx from 'clsx';
import api from '@/utils/api';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

interface Clinic {
    id: string;
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    timezone: string;
    createdAt: string;
    _count?: {
        users: number;
        patients: number;
    };
}

const AdminClinicsPage = () => {
    const { user } = useAuth();
    const router = useRouter();
    const [clinics, setClinics] = useState<Clinic[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClinic, setEditingClinic] = useState<Clinic | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        phone: '',
        email: '',
        website: '',
        timezone: 'America/New_York'
    });

    // Redirect if not admin
    useEffect(() => {
        if (user && user.role !== 'SAAS_OWNER') {
            router.push('/');
            toast.error('Unauthorized access');
        }
    }, [user, router]);

    const fetchClinics = async () => {
        setIsLoading(true);
        try {
            const response = await api.get('/clinics');
            setClinics(response.data);
        } catch (error: any) {
            console.error('Failed to fetch clinics:', error);
            toast.error('Failed to load clinics');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (user?.role === 'SAAS_OWNER') {
            fetchClinics();
        }
    }, [user]);

    const handleOpenModal = (clinic?: Clinic) => {
        if (clinic) {
            setEditingClinic(clinic);
            setFormData({
                name: clinic.name,
                address: clinic.address || '',
                phone: clinic.phone || '',
                email: clinic.email || '',
                website: clinic.website || '',
                timezone: clinic.timezone
            });
        } else {
            setEditingClinic(null);
            setFormData({
                name: '',
                address: '',
                phone: '',
                email: '',
                website: '',
                timezone: 'America/New_York'
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingClinic(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingClinic) {
                await api.patch(`/clinics/${editingClinic.id}`, formData);
                toast.success('Clinic updated successfully');
            } else {
                await api.post('/clinics', formData);
                toast.success('Clinic created successfully');
            }
            handleCloseModal();
            fetchClinics();
        } catch (error: any) {
            console.error('Failed to save clinic:', error);
            toast.error(error.response?.data?.message || 'Failed to save clinic');
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
            return;
        }
        try {
            await api.delete(`/clinics/${id}`);
            toast.success('Clinic deleted successfully');
            fetchClinics();
        } catch (error: any) {
            console.error('Failed to delete clinic:', error);
            toast.error(error.response?.data?.message || 'Failed to delete clinic');
        }
    };

    const filteredClinics = clinics.filter(clinic =>
        clinic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        clinic.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        clinic.address?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (user?.role !== 'SAAS_OWNER') {
        return null;
    }

    if (isLoading) {
        return <div className="p-8 text-center text-slate-500">Loading clinics...</div>;
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
                        <Building2 className="text-primary-600" size={32} />
                        Clinic Management
                    </h1>
                    <p className="text-slate-500 mt-1">Manage all clinics in the system</p>
                </div>
                <Button onClick={() => handleOpenModal()} className="rounded-xl shadow-lg shadow-primary-500/20">
                    <Plus size={18} className="mr-2" />
                    Create Clinic
                </Button>
            </div>

            {/* Search */}
            <Card className="p-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search clinics..."
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </Card>

            {/* Clinics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredClinics.map((clinic) => (
                    <Card key={clinic.id} className="p-6 hover:shadow-lg transition-shadow">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                                    <Building2 className="text-primary-600" size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900">{clinic.name}</h3>
                                    <Badge variant="neutral" className="text-[10px] mt-1">
                                        <Clock size={10} className="mr-1" />
                                        {clinic.timezone}
                                    </Badge>
                                </div>
                            </div>
                            <div className="flex gap-1">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-slate-400 hover:text-primary-600 hover:bg-primary-50"
                                    onClick={() => handleOpenModal(clinic)}
                                >
                                    <Edit size={14} />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-slate-400 hover:text-red-500 hover:bg-red-50"
                                    onClick={() => handleDelete(clinic.id, clinic.name)}
                                >
                                    <Trash2 size={14} />
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-2 text-sm">
                            {clinic.address && (
                                <div className="flex items-center gap-2 text-slate-600">
                                    <MapPin size={14} className="text-slate-400 flex-shrink-0" />
                                    <span className="truncate">{clinic.address}</span>
                                </div>
                            )}
                            {clinic.phone && (
                                <div className="flex items-center gap-2 text-slate-600">
                                    <Phone size={14} className="text-slate-400 flex-shrink-0" />
                                    <span>{clinic.phone}</span>
                                </div>
                            )}
                            {clinic.email && (
                                <div className="flex items-center gap-2 text-slate-600">
                                    <Mail size={14} className="text-slate-400 flex-shrink-0" />
                                    <span className="truncate">{clinic.email}</span>
                                </div>
                            )}
                            {clinic.website && (
                                <div className="flex items-center gap-2 text-slate-600">
                                    <Globe size={14} className="text-slate-400 flex-shrink-0" />
                                    <a href={clinic.website} target="_blank" rel="noopener noreferrer" className="truncate hover:text-primary-600">
                                        {clinic.website}
                                    </a>
                                </div>
                            )}
                        </div>

                        {clinic._count && (
                            <div className="mt-4 pt-4 border-t border-slate-100 flex gap-4">
                                <div className="flex items-center gap-2 text-sm">
                                    <Users size={14} className="text-slate-400" />
                                    <span className="font-bold text-slate-700">{clinic._count.users}</span>
                                    <span className="text-slate-500">Staff</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <Users size={14} className="text-slate-400" />
                                    <span className="font-bold text-slate-700">{clinic._count.patients}</span>
                                    <span className="text-slate-500">Patients</span>
                                </div>
                            </div>
                        )}
                    </Card>
                ))}
            </div>

            {filteredClinics.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                    <Building2 size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No clinics found</p>
                </div>
            )}

            {/* Create/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-slate-100">
                            <h2 className="text-2xl font-bold text-slate-900">
                                {editingClinic ? 'Edit Clinic' : 'Create New Clinic'}
                            </h2>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1">
                                    Clinic Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                                    placeholder="Enter clinic name"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1">
                                    Address
                                </label>
                                <input
                                    type="text"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                                    placeholder="Enter address"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1">
                                        Phone
                                    </label>
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                                        placeholder="Phone number"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                                        placeholder="Email address"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1">
                                    Website
                                </label>
                                <input
                                    type="url"
                                    value={formData.website}
                                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                                    placeholder="https://example.com"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1">
                                    Timezone *
                                </label>
                                <select
                                    required
                                    value={formData.timezone}
                                    onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                                >
                                    <option value="America/New_York">Eastern Time (ET)</option>
                                    <option value="America/Chicago">Central Time (CT)</option>
                                    <option value="America/Denver">Mountain Time (MT)</option>
                                    <option value="America/Los_Angeles">Pacific Time (PT)</option>
                                    <option value="America/Phoenix">Arizona (MST)</option>
                                    <option value="America/Anchorage">Alaska Time (AKT)</option>
                                    <option value="Pacific/Honolulu">Hawaii Time (HST)</option>
                                    <option value="UTC">UTC</option>
                                </select>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleCloseModal}
                                    className="flex-1 rounded-xl"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    className="flex-1 rounded-xl shadow-lg shadow-primary-500/20"
                                >
                                    {editingClinic ? 'Update Clinic' : 'Create Clinic'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminClinicsPage;
