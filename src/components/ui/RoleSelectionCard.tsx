
import React from 'react';
import { motion } from 'framer-motion';
import { User, Activity, ShieldCheck, ChevronRight, Building2 } from 'lucide-react';

interface RoleProfile {
    type: 'USER' | 'MEMBER' | 'PATIENT';
    id: string;
    name: string;
    role: string;
    clinicId?: string;
    clinicName?: string;
}

interface RoleSelectionCardProps {
    roles: RoleProfile[];
    onSelect: (profile: RoleProfile) => void;
    isLoading: boolean;
}

export default function RoleSelectionCard({ roles, onSelect, isLoading }: RoleSelectionCardProps) {

    const getIcon = (role: string) => {
        switch (role.toUpperCase()) {
            case 'PATIENT': return <User className="w-5 h-5 text-emerald-500" />;
            case 'DOCTOR': return <Activity className="w-5 h-5 text-blue-500" />;
            case 'SYSTEM_ADMIN': return <ShieldCheck className="w-5 h-5 text-purple-500" />;
            default: return <User className="w-5 h-5 text-slate-500" />;
        }
    };

    const getRoleLabel = (role: string) => {
        return role.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    };

    return (
        <div className="space-y-6">
            <div className="text-center space-y-2">
                <h2 className="text-2xl font-serif text-[var(--brand-text-main)]">Select Profile</h2>
                <p className="text-[14px] text-[var(--brand-text-muted)]">
                    Multiple profiles found for your account. Please choose one to continue.
                </p>
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {roles.map((profile, idx) => (
                    <motion.button
                        key={`${profile.type}-${profile.id}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        onClick={() => onSelect(profile)}
                        disabled={isLoading}
                        className="w-full flex items-center p-4 bg-white/60 hover:bg-white border border-slate-200/60 hover:border-blue-200 rounded-xl transition-all group text-left shadow-sm hover:shadow-md active:scale-[0.99]"
                    >
                        <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 group-hover:border-blue-100 transition-colors">
                            {getIcon(profile.role)}
                        </div>

                        <div className="ml-4 flex-1">
                            <h3 className="text-sm font-bold text-slate-800 group-hover:text-blue-700 transition-colors">
                                {getRoleLabel(profile.role)}
                            </h3>
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                                {profile.clinicName && (
                                    <>
                                        <Building2 className="w-3 h-3" />
                                        <span>{profile.clinicName}</span>
                                    </>
                                )}
                            </div>
                        </div>

                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
                    </motion.button>
                ))}
            </div>
        </div>
    );
}
