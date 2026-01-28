import React from 'react';
import type { Invoice } from '../../context/ClinicContext';
import { FileText, MoreVertical, CreditCard, AlertCircle, CheckCircle } from 'lucide-react';
import clsx from 'clsx';
import Badge from '../ui/badge';

interface InvoiceCardProps {
    invoice: Invoice;
}

const InvoiceCard: React.FC<InvoiceCardProps> = ({ invoice }) => {
    const statusConfig = {
        paid: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100', badge: 'success' },
        pending: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', badge: 'warning' },
        overdue: { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100', badge: 'error' }
    } as const;

    // Fallback for types not in config
    const config = statusConfig[invoice.status] || statusConfig.pending;
    const StatusIcon = config.icon;

    // Importing Clock locally if needed or just use generic Icon
    function Clock(props: any) { return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg> }

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-all group">
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className={clsx("w-10 h-10 rounded-full flex items-center justify-center border", config.bg, config.border)}>
                        <FileText size={20} className={config.color} />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-900">{invoice.id}</h4>
                        <p className="text-xs text-slate-500 font-medium">{invoice.date}</p>
                    </div>
                </div>
                <button className="text-slate-400 hover:text-slate-600">
                    <MoreVertical size={18} />
                </button>
            </div>

            <div className="mb-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Patient</p>
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                        {invoice.patientName.charAt(0)}
                    </div>
                    <span className="font-semibold text-slate-700">{invoice.patientName}</span>
                </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Amount</p>
                    <p className="text-lg font-bold text-slate-900">${invoice.amount.toFixed(2)}</p>
                </div>
                <Badge variant={config.badge as any} className="flex items-center gap-1">
                    {/* @ts-ignore */}
                    <span className="capitalize">{invoice.status}</span>
                </Badge>
            </div>
        </div>
    );
};

export default InvoiceCard;
