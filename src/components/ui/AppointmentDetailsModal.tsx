import React from 'react';
import {
    Calendar,
    Clock,
    User,
    FileText,
    CheckCircle,
    XCircle,
    AlertCircle,
    MessageSquare,
    Video
} from 'lucide-react';
import Modal from './Modal';
import { Button } from './button';
import Badge from './badge';
import clsx from 'clsx';
import PatientFormData from '../patient/PatientFormData';

interface AppointmentDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    appointment: any;
}

const AppointmentDetailsModal: React.FC<AppointmentDetailsModalProps> = ({
    isOpen,
    onClose,
    appointment
}) => {
    if (!appointment) return null;

    const getStatusIcon = (status: string) => {
        switch (status.toLowerCase()) {
            case 'completed': return <CheckCircle size={18} className="text-green-500" />;
            case 'cancelled': return <XCircle size={18} className="text-red-500" />;
            case 'confirmed': return <CheckCircle size={18} className="text-blue-500" />;
            default: return <AlertCircle size={18} className="text-amber-500" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'completed': return 'success';
            case 'cancelled': return 'danger';
            case 'confirmed': return 'info';
            default: return 'warning';
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Appointment Details"
            maxWidth="lg"
        >
            <div className="space-y-6">
                {/* Header Status Banner */}
                <div className={clsx(
                    "flex items-center justify-between p-4 rounded-xl border",
                    appointment.status === 'completed' ? "bg-green-50 border-green-100" :
                        appointment.status === 'cancelled' ? "bg-red-50 border-red-100" :
                            "bg-blue-50 border-blue-100"
                )}>
                    <div className="flex items-center gap-3">
                        {getStatusIcon(appointment.status)}
                        <div>
                            <p className={clsx(
                                "font-bold text-sm uppercase tracking-wide",
                                appointment.status === 'completed' ? "text-green-700" :
                                    appointment.status === 'cancelled' ? "text-red-700" :
                                        "text-blue-700"
                            )}>
                                {appointment.status}
                            </p>
                            <p className="text-xs text-slate-500">
                                Warning: Verify timezone alignment with patient.
                            </p>
                        </div>
                    </div>
                    <Badge variant={getStatusColor(appointment.status)}>
                        ID: #{appointment.id.slice(-6)}
                    </Badge>
                </div>

                {/* Core Details Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Date & Time</label>
                        <div className="flex items-center gap-2 text-slate-800 font-medium bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <Calendar size={16} className="text-slate-400" />
                            {new Date(appointment.date).toLocaleDateString(undefined, { timeZone: appointment.doctor?.timezone || undefined })}
                            <span className="text-slate-300">|</span>
                            <Clock size={16} className="text-slate-400" />
                            {new Date(appointment.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', timeZone: appointment.doctor?.timezone || undefined })}
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Service Type</label>
                        <div className="flex items-center gap-2 text-slate-800 font-medium bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <FileText size={16} className="text-slate-400" />
                            {appointment.service?.name || "Consultation"}
                        </div>
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Provider</label>
                    <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
                        <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                            <User size={18} />
                        </div>
                        <div>
                            <p className="font-bold text-slate-800 text-sm">Dr. {appointment.doctor?.name || "Unassigned"}</p>
                            <p className="text-xs text-slate-500">Primary Care Physician</p>
                        </div>
                    </div>
                </div>

                {/* Meeting Link (if confirmed/virtual) */}
                {(appointment.meetingLink) && (
                    <div className="bg-violet-50 border border-violet-100 p-4 rounded-xl space-y-2">
                        <div className="flex items-center gap-2 text-violet-700 font-bold text-sm">
                            <Video size={16} />
                            Virtual Meeting Room
                        </div>
                        <a
                            href={appointment.meetingLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full py-2 bg-white text-violet-600 border border-violet-200 text-center rounded-lg text-sm font-semibold hover:bg-violet-50 hover:border-violet-300 transition-all"
                        >
                            Join Video Call
                        </a>
                    </div>
                )}

                {/* Additional Content (Notes, etc) */}
                <div className="space-y-2 pt-2">
                    <h4 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                        <MessageSquare size={14} className="text-slate-400" />
                        Clinical / Admin Notes
                    </h4>
                    <p className="text-sm text-slate-500 italic bg-slate-50 p-3 rounded-lg border border-slate-100 border-dashed">
                        {appointment.notes || "No additional notes recorded for this visit."}
                    </p>
                </div>

                {/* Patient Submitted Data Section */}
                {appointment.formSubmission && (
                    <div className="space-y-3 pt-6 border-t border-slate-100">
                        <h4 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                            <FileText size={14} className="text-slate-400" />
                            Patient Submitted Data
                        </h4>
                        <div className="bg-white rounded-xl border border-slate-100 p-1">
                            <PatientFormData
                                data={appointment.formSubmission.data}
                                formConfig={appointment.formSubmission.form.config}
                            />
                        </div>
                    </div>
                )}

                <div className="pt-4 flex justify-end">
                    <Button onClick={onClose} variant="outline" className="w-full sm:w-auto">
                        Close Details
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default AppointmentDetailsModal;
