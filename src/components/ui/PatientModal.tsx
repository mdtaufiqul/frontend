import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, Save } from 'lucide-react';
import Modal from './Modal';
import { Button } from './button';

interface PatientModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave?: (patientData: any) => void;
}

const PatientModal: React.FC<PatientModalProps> = ({ isOpen, onClose, onSave }) => {
    const initialFormData = {
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        address: '',
        age: '',
        gender: 'Other'
    };

    const [formData, setFormData] = useState(initialFormData);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            setFormData(initialFormData);
            setErrors({});
        }
    }, [isOpen]);

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.firstName.trim()) newErrors.firstName = 'First Name is required';
        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Invalid email format';
        }
        if (!formData.gender) newErrors.gender = 'Gender is required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = () => {
        if (!validate()) return;
        if (onSave) onSave(formData);
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Create New Patient"
            maxWidth="lg"
        >
            <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">First Name <span className="text-red-500">*</span></label>
                        <div className="relative">
                            <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={formData.firstName}
                                onChange={(e) => {
                                    setFormData({ ...formData, firstName: e.target.value });
                                    if (errors.firstName) setErrors({ ...errors, firstName: '' });
                                }}
                                placeholder="e.g. Sarah"
                                className={`w-full pl-9 pr-4 py-2 bg-slate-50 border ${errors.firstName ? 'border-red-500' : 'border-slate-200'} rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 transition-all font-medium`}
                            />
                        </div>
                        {errors.firstName && <p className="text-xs text-red-500">{errors.firstName}</p>}
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Last Name</label>
                        <input
                            type="text"
                            value={formData.lastName}
                            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                            placeholder="e.g. Connor"
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 transition-all font-medium"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email Address <span className="text-red-500">*</span></label>
                        <div className="relative">
                            <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => {
                                    setFormData({ ...formData, email: e.target.value });
                                    if (errors.email) setErrors({ ...errors, email: '' });
                                }}
                                placeholder="sarah.c@sky.net"
                                className={`w-full pl-9 pr-4 py-2 bg-slate-50 border ${errors.email ? 'border-red-500' : 'border-slate-200'} rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 transition-all font-medium`}
                            />
                        </div>
                        {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phone Number</label>
                        <div className="relative">
                            <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                placeholder="(555) 000-0000"
                                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 transition-all font-medium"
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Home Address</label>
                    <div className="relative">
                        <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            placeholder="123 Street Name, City, Country"
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 transition-all font-medium"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Age</label>
                        <input
                            type="number"
                            value={formData.age}
                            onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                            placeholder="e.g. 30"
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 transition-all font-medium"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gender <span className="text-red-500">*</span></label>
                        <select
                            value={formData.gender}
                            onChange={(e) => {
                                setFormData({ ...formData, gender: e.target.value });
                                if (errors.gender) setErrors({ ...errors, gender: '' });
                            }}
                            className={`w-full px-4 py-2 bg-slate-50 border ${errors.gender ? 'border-red-500' : 'border-slate-200'} rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 transition-all font-medium`}
                        >
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                        </select>
                        {errors.gender && <p className="text-xs text-red-500">{errors.gender}</p>}
                    </div>
                </div>

                <div className="pt-4 flex items-center gap-3">
                    <Button
                        className="flex-1 py-3 rounded-xl !text-sm font-black shadow-lg uppercase tracking-wide"
                        onClick={handleSave}
                    >
                        <Save size={16} className="mr-2" />
                        Save Patient
                    </Button>
                    <Button
                        variant="outline"
                        className="px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wide"
                        onClick={onClose}
                    >
                        Cancel
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default PatientModal;
