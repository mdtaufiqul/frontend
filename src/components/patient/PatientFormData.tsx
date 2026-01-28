import React from 'react';
import { Mail, Phone, Calendar, Paperclip, Sparkles, FileText } from 'lucide-react';

interface PatientFormDataProps {
    data: any;
    formConfig?: any;
}

const PatientFormData: React.FC<PatientFormDataProps> = ({ data, formConfig }) => {
    const getFormLabel = (key: string) => {
        if (!formConfig) return key.replace(/-/g, ' ').replace(/([A-Z])/g, ' $1').trim();

        const allFields = formConfig.steps
            ? formConfig.steps.flatMap((s: any) => s.fields || [])
            : (formConfig.fields || []);

        const field = allFields.find((f: any) => f.id === key);
        return field?.label || key.replace(/-/g, ' ').replace(/([A-Z])/g, ' $1').trim();
    };

    const getFormValueLabel = (key: string, value: any) => {
        // Special Case: Date/Time Objects
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            const date = value.date || value.startDate;
            const time = value.time || value.startTime;

            if (date && time) {
                try {
                    const dateStr = new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                    return `${dateStr} at ${time}`;
                } catch (e) {
                    return `${date} at ${time}`;
                }
            }
            if (date) return new Date(date).toLocaleDateString();
            if (time) return time;

            return 'Structured Content';
        }

        if (typeof value !== 'string') return String(value);
        if (!formConfig) return value;

        const allFields = formConfig.steps
            ? formConfig.steps.flatMap((s: any) => s.fields || [])
            : (formConfig.fields || []);

        const field = allFields.find((f: any) => f.id === key);
        if (field?.options) {
            const option = field.options.find((o: any) => o.value === value || o.id === value);
            if (option) return option.label || option.name || value;
        }

        return value;
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(data).map(([key, value]: [string, any]) => {
                const label = getFormLabel(key);
                const displayValue = getFormValueLabel(key, value);
                const isEmail = key.toLowerCase().includes('email') || (typeof value === 'string' && value.includes('@'));
                const isPhone = key.toLowerCase().includes('phone') || key.toLowerCase().includes('mobile');
                const isDate = key.toLowerCase().includes('date') || key.toLowerCase().includes('time') || key.toLowerCase().includes('dob');
                const isImage = typeof value === 'string' && (
                    value.match(/\.(jpg|jpeg|png|gif|webp)$/i) ||
                    value.startsWith('uploads/')
                );

                const imageUrl = isImage ? (
                    value.startsWith('http') ? value : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333'}/${value}`
                ) : null;

                return (
                    <div key={key} className="group/item">
                        <div className="flex items-center gap-1.5 mb-1">
                            {isEmail && <Mail size={12} className="text-slate-400" />}
                            {isPhone && <Phone size={12} className="text-slate-400" />}
                            {isDate && <Calendar size={12} className="text-slate-400" />}
                            {isImage && <Paperclip size={12} className="text-slate-400" />}
                            {!isEmail && !isPhone && !isDate && !isImage && <div className="w-1 h-1 rounded-full bg-slate-300" />}
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                {label}
                            </p>
                        </div>

                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 group-hover/item:border-primary-100 group-hover/item:bg-white transition-all overflow-hidden border-dashed">
                            {isImage ? (
                                <div className="space-y-2">
                                    <div
                                        className="relative aspect-video rounded-lg overflow-hidden border border-slate-200 bg-white cursor-pointer group/img"
                                        onClick={() => window.open(imageUrl!, '_blank')}
                                    >
                                        <img
                                            src={imageUrl!}
                                            alt={label}
                                            className="w-full h-full object-cover transition-transform duration-300 group-hover/img:scale-105"
                                        />
                                        <div className="absolute inset-0 bg-slate-900/0 group-hover/img:bg-slate-900/10 transition-colors flex items-center justify-center">
                                            <Sparkles className="text-white opacity-0 group-hover/img:opacity-100 transition-opacity" size={20} />
                                        </div>
                                    </div>
                                    <p className="text-[8px] text-slate-400 truncate font-mono">{String(value)}</p>
                                </div>
                            ) : (
                                <p className="text-sm text-slate-900 font-semibold break-words leading-relaxed">
                                    {displayValue}
                                </p>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default PatientFormData;
