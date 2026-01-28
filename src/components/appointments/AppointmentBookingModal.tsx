import React, { useState, useEffect } from 'react';
import {
    Calendar,
    Clock,
    User,
    Stethoscope,
    FileText,
    Save,
    X,
    Repeat,
    CalendarDays
} from 'lucide-react';
import Modal from '../ui/Modal';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { SmartTimePicker } from '../ui/smart-time-picker';
import { usePermissionApi } from '@/hooks/usePermissionApi';
import { PERMISSIONS } from '@/config/apiPermissions';
import { toast } from 'sonner';

interface AppointmentBookingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: (data: any) => void;
    patientId?: string;
    patientName?: string;
}

const AppointmentBookingModal: React.FC<AppointmentBookingModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    patientId,
    patientName
}) => {
    const { get: apiGet, post: apiPost } = usePermissionApi();

    const [isLoading, setIsLoading] = useState(false);
    const [doctors, setDoctors] = useState<any[]>([]);
    const [services, setServices] = useState<any[]>([]);
    const [patients, setPatients] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        patientId: patientId || '',
        doctorId: '',
        serviceId: '',
        date: new Date().toISOString().split('T')[0],
        time: '09:00 AM',
        notes: '',
        recurringFreq: 'NONE',
        recurringUntil: '',
        type: 'in-person'
    });
    const [availableSlots, setAvailableSlots] = useState<any[]>([]);
    const [isSlotsLoading, setIsSlotsLoading] = useState(false);

    const [patientSearch, setPatientSearch] = useState(patientName || '');

    useEffect(() => {
        if (isOpen) {
            fetchInitialData();
        }
    }, [isOpen]);

    const fetchInitialData = async () => {
        try {
            const [docsRes, servsRes] = await Promise.all([
                apiGet(PERMISSIONS.VIEW_STAFF, '/users?role=doctor'),
                apiGet(PERMISSIONS.VIEW_SERVICES, '/services')
            ]);

            if (docsRes?.data) setDoctors(docsRes.data);
            if (servsRes?.data) setServices(servsRes.data);

            if (!patientId) {
                const patientsRes = await apiGet(PERMISSIONS.VIEW_ALL_PATIENTS, '/patients');
                if (patientsRes?.data) setPatients(patientsRes.data);
            }
        } catch (error) {
            console.error("Failed to fetch initial data:", error);
            toast.error("Failed to load doctors or services");
        }
    };

    useEffect(() => {
        if (formData.doctorId && formData.date) {
            fetchAvailableSlots();
        }
    }, [formData.doctorId, formData.date, formData.type]);

    const fetchAvailableSlots = async () => {
        setIsSlotsLoading(true);
        try {
            const type = formData.type === 'video' ? 'online' : 'in-person';
            const res = await apiGet(
                PERMISSIONS.VIEW_APPOINTMENTS,
                `/appointments/available-slots?doctorId=${formData.doctorId}&date=${formData.date}&type=${type}`
            );
            if (res?.data?.allSlots) {
                setAvailableSlots(res.data.allSlots);
            }
        } catch (error) {
            console.error("Failed to fetch slots:", error);
        } finally {
            setIsSlotsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!formData.patientId) return toast.error("Please select a patient");
        if (!formData.doctorId) return toast.error("Please select a doctor");
        if (!formData.serviceId) return toast.error("Please select a service");
        if (!formData.date || !formData.time) return toast.error("Please select date and time");
        if (formData.recurringFreq !== 'NONE' && !formData.recurringUntil) return toast.error("Please select recurrence end date");

        setIsLoading(true);
        try {
            // Convert time (09:00 AM) to ISO DateTime
            const [time, modifier] = formData.time.split(' ');
            let [hours, minutes] = time.split(':').map(Number);
            if (modifier === 'PM' && hours < 12) hours += 12;
            if (modifier === 'AM' && hours === 12) hours = 0;

            const apptDate = new Date(`${formData.date}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`);

            const payload = {
                ...formData,
                startTime: apptDate.toISOString(),
                rescheduleFuture: false // Only relevant for updates
            };

            const response = await apiPost(PERMISSIONS.MANAGE_APPOINTMENTS, '/appointments', payload);

            if (response) {
                toast.success("Appointment booked successfully");
                if (onSuccess) onSuccess(response.data);
                onClose();
            }
        } catch (error: any) {
            console.error("Failed to book appointment:", error);
            toast.error(error.response?.data?.message || "Failed to book appointment");
        } finally {
            setIsLoading(false);
        }
    };

    const filteredPatients = patients.filter(p =>
        p.name.toLowerCase().includes(patientSearch.toLowerCase()) ||
        p.email?.toLowerCase().includes(patientSearch.toLowerCase())
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Book Appointment"
            maxWidth="xl"
        >
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Patient Selection */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Patient</label>
                        {patientId ? (
                            <div className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900">
                                {patientName}
                            </div>
                        ) : (
                            <div className="relative">
                                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    value={patientSearch}
                                    onChange={(e) => {
                                        setPatientSearch(e.target.value);
                                        setFormData({ ...formData, patientId: '' });
                                    }}
                                    placeholder="Search patients..."
                                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 transition-all font-medium"
                                />
                                {patientSearch && !formData.patientId && filteredPatients.length > 0 && (
                                    <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                                        {filteredPatients.map((p: any) => (
                                            <button
                                                key={p.id}
                                                className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0"
                                                onClick={() => {
                                                    setFormData({ ...formData, patientId: p.id });
                                                    setPatientSearch(p.name);
                                                }}
                                            >
                                                <p className="font-bold text-slate-900">{p.name}</p>
                                                <p className="text-[10px] text-slate-500">{p.email}</p>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Doctor Selection */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Doctor</label>
                        <Select
                            value={formData.doctorId}
                            onValueChange={(val) => setFormData({ ...formData, doctorId: val })}
                        >
                            <SelectTrigger className="bg-slate-50 border-slate-200 rounded-xl">
                                <SelectValue placeholder="Select Doctor" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-200">
                                {doctors.map((d: any) => (
                                    <SelectItem key={d.id} value={d.id} className="rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-[10px] font-bold">
                                                {d.name.split(' ').map((n: string) => n[0]).join('')}
                                            </div>
                                            <span>Dr. {d.name}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Service Selection */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Service</label>
                        <Select
                            value={formData.serviceId}
                            onValueChange={(val) => setFormData({ ...formData, serviceId: val })}
                        >
                            <SelectTrigger className="bg-slate-50 border-slate-200 rounded-xl">
                                <SelectValue placeholder="Select Service" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-200">
                                {services.map((s: any) => (
                                    <SelectItem key={s.id} value={s.id} className="rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <Stethoscope size={14} className="text-slate-400" />
                                            <span>{s.name} ({s.duration} min)</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Consultation Type */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Type</label>
                        <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                            <button
                                onClick={() => setFormData({ ...formData, type: 'in-person' })}
                                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${formData.type === 'in-person' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                In-person
                            </button>
                            <button
                                onClick={() => setFormData({ ...formData, type: 'video' })}
                                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${formData.type === 'video' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                Virtual
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                    {/* Date Selection */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date</label>
                        <div className="relative">
                            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="date"
                                value={formData.date}
                                min={new Date().toISOString().split('T')[0]}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 transition-all font-medium"
                            />
                        </div>
                    </div>

                    {/* Time Selection */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Time</label>
                        <SmartTimePicker
                            value={formData.time}
                            onChange={(val) => setFormData({ ...formData, time: val })}
                            availableSlots={availableSlots}
                            isLoading={isSlotsLoading}
                        />
                    </div>
                </div>

                {/* Recurrence Options */}
                <div className="pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-2 mb-3">
                        <Repeat size={14} className="text-primary-500" />
                        <h4 className="text-xs font-bold text-slate-700">Recurring Schedule</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Frequency</label>
                            <Select
                                value={formData.recurringFreq}
                                onValueChange={(val) => setFormData({ ...formData, recurringFreq: val })}
                            >
                                <SelectTrigger className="bg-slate-50 border-slate-200 rounded-xl">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    <SelectItem value="NONE" className="rounded-lg">One-time</SelectItem>
                                    <SelectItem value="DAILY" className="rounded-lg">Daily</SelectItem>
                                    <SelectItem value="WEEKLY" className="rounded-lg">Weekly</SelectItem>
                                    <SelectItem value="MONTHLY" className="rounded-lg">Monthly</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {formData.recurringFreq !== 'NONE' && (
                            <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Recurring Until</label>
                                <div className="relative">
                                    <CalendarDays size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="date"
                                        value={formData.recurringUntil}
                                        min={formData.date}
                                        onChange={(e) => setFormData({ ...formData, recurringUntil: e.target.value })}
                                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 transition-all font-medium"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Notes */}
                <div className="space-y-1.5 pt-4 border-t border-slate-100">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Notes</label>
                    <div className="relative">
                        <FileText size={14} className="absolute left-3 top-3 text-slate-400" />
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="Reason for visit, special instructions..."
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 transition-all font-medium min-h-[100px]"
                        />
                    </div>
                </div>

                <div className="pt-6 flex gap-3">
                    <Button
                        className="flex-1 py-6 rounded-2xl font-bold shadow-lg shadow-primary-200"
                        onClick={handleSave}
                        disabled={isLoading}
                    >
                        <Save size={18} className="mr-2" />
                        {isLoading ? "Booking..." : "Confirm Booking"}
                    </Button>
                    <Button
                        variant="ghost"
                        className="px-6 py-6 rounded-2xl font-bold text-slate-500"
                        onClick={onClose}
                        disabled={isLoading}
                    >
                        Cancel
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default AppointmentBookingModal;
