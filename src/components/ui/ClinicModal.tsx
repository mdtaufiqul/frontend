"use client";

import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import dynamic from 'next/dynamic';
import { Globe, MapPin } from 'lucide-react';

const LocationPicker = dynamic(() => import('@/components/ui/LocationPicker').then(mod => mod.LocationPicker), { ssr: false });

interface ClinicModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => void;
    initialData?: any;
}

const ClinicModal: React.FC<ClinicModalProps> = ({
    isOpen,
    onClose,
    onSave,
    initialData
}) => {
    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        address: initialData?.address || '',
        phone: initialData?.phone || '',
        email: initialData?.email || '',
        website: initialData?.website || '',
        description: initialData?.description || '',
        mapLink: initialData?.mapLink || '',
        mapPin: initialData?.mapPin || '',
        latitude: initialData?.latitude || null as number | null,
        longitude: initialData?.longitude || null as number | null,
        timezone: initialData?.timezone || 'UTC',
    });

    const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false);

    const handleLocationSelect = (lat: number, lng: number) => {
        const googleMapsLink = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
        setFormData(p => ({
            ...p,
            latitude: lat,
            longitude: lng,
            mapLink: googleMapsLink
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle className="font-semibold text-2xl flex items-center gap-2">
                            Update Clinic Details
                        </DialogTitle>
                    </DialogHeader>

                    <div className="grid gap-6 py-6">
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">General Info</h4>
                            <div className="grid gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="name" className="text-xs font-bold text-slate-600">Clinic Name</Label>
                                    <Input
                                        id="name"
                                        className="rounded-xl border-slate-200"
                                        value={formData.name}
                                        onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                                        placeholder="MediFlow Hub"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="address" className="text-xs font-bold text-slate-600">Physical Address</Label>
                                        <Input
                                            id="address"
                                            className="rounded-xl border-slate-200"
                                            value={formData.address}
                                            onChange={(e) => setFormData(p => ({ ...p, address: e.target.value }))}
                                            placeholder="123 Innovation Dr, Tech City"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="timezone" className="text-xs font-bold text-slate-600">Timezone</Label>
                                        <select
                                            id="timezone"
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-slate-900/10 h-10"
                                            value={formData.timezone}
                                            onChange={(e) => setFormData(p => ({ ...p, timezone: e.target.value }))}
                                        >
                                            <option value="UTC">UTC (Universal Time)</option>
                                            <optgroup label="North America">
                                                <option value="America/New_York">Eastern Time (US & Canada)</option>
                                                <option value="America/Chicago">Central Time (US & Canada)</option>
                                                <option value="America/Denver">Mountain Time (US & Canada)</option>
                                                <option value="America/Los_Angeles">Pacific Time (US & Canada)</option>
                                            </optgroup>
                                            <optgroup label="Europe">
                                                <option value="Europe/London">London</option>
                                                <option value="Europe/Paris">Paris</option>
                                                <option value="Europe/Berlin">Berlin</option>
                                            </optgroup>
                                            <optgroup label="Asia & Pacific">
                                                <option value="Asia/Dubai">Dubai</option>
                                                <option value="Asia/Singapore">Singapore</option>
                                                <option value="Asia/Tokyo">Tokyo</option>
                                                <option value="Australia/Sydney">Sydney</option>
                                            </optgroup>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="phone" className="text-xs font-bold text-slate-600">Contact Phone</Label>
                                    <Input
                                        id="phone"
                                        className="rounded-xl border-slate-200"
                                        value={formData.phone}
                                        onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))}
                                        placeholder="+1 (555) 000-0000"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="email" className="text-xs font-bold text-slate-600">Public Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        className="rounded-xl border-slate-200"
                                        value={formData.email}
                                        onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
                                        placeholder="contact@clinic.com"
                                    />
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="website" className="text-xs font-bold text-slate-600">Website / Portal</Label>
                                <Input
                                    id="website"
                                    className="rounded-xl border-slate-200"
                                    value={formData.website}
                                    onChange={(e) => setFormData(p => ({ ...p, website: e.target.value }))}
                                    placeholder="https://mediflow.io"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="mapLink" className="text-xs font-bold text-slate-600">Map Link (Google Maps)</Label>
                                    <Input
                                        id="mapLink"
                                        className="rounded-xl border-slate-200"
                                        value={formData.mapLink}
                                        onChange={(e) => setFormData(p => ({ ...p, mapLink: e.target.value }))}
                                        placeholder="https://maps.google.com/..."
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="mt-2 w-full flex items-center gap-2 rounded-xl border-dashed"
                                        onClick={() => setIsLocationPickerOpen(true)}
                                    >
                                        <Globe size={14} /> Select on Map
                                    </Button>
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="description" className="text-xs font-bold text-slate-600">Mission / Description</Label>
                                <Textarea
                                    id="description"
                                    className="rounded-xl border-slate-200 min-h-[100px]"
                                    value={formData.description}
                                    onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                                    placeholder="Briefly describe your clinic's mission..."
                                />
                            </div>
                        </div>
                    </div>

                    <LocationPicker
                        isOpen={isLocationPickerOpen}
                        onClose={() => setIsLocationPickerOpen(false)}
                        onSelect={handleLocationSelect}
                        initialLat={formData.latitude || undefined}
                        initialLng={formData.longitude || undefined}
                    />

                    <DialogFooter className="pt-4 border-t border-slate-100">
                        <Button type="button" variant="ghost" className="rounded-full px-6 text-slate-400 hover:text-slate-600" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" className="rounded-full px-8 bg-slate-900 hover:bg-slate-800 text-white shadow-lg">
                            Save Changes
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default ClinicModal;
