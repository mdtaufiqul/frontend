import React from 'react';
import { useClinic } from '../../context/ClinicContext';
import { Users, Clock, CheckCircle } from 'lucide-react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

const WaitingRoomWidget: React.FC = () => {
    const { waitingQueue, admitPatient } = useClinic();

    // Filter only those who are strictly 'waiting'
    const pendingPatients = waitingQueue.filter(p => p.status === 'waiting');

    return (
        <div className="bg-transparent h-full flex flex-col">
            <div className="flex items-center justify-between mb-2 p-3 pb-0">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-orange-100/50 rounded-lg flex items-center justify-center border border-orange-100">
                        <Users className="text-orange-600" size={16} />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900 text-xs">Waiting Room</h3>
                        <p className="text-[10px] text-slate-500 font-medium leading-none">Live Queue</p>
                    </div>
                </div>
                <div className="px-2 py-0.5 bg-white rounded-full text-[10px] font-bold text-slate-600 shadow-sm border border-slate-100">
                    {pendingPatients.length} Waiting
                </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-1 p-3 pt-2">
                {pendingPatients.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2 min-h-[100px]">
                        <Users size={24} className="opacity-20" />
                        <p className="text-xs font-medium">Room is empty</p>
                    </div>
                ) : (
                    <AnimatePresence>
                        {pendingPatients.map((patient) => (
                            <motion.div
                                key={patient.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, height: 0 }}
                                className="flex items-center justify-between p-2 rounded-lg bg-orange-50/20 border border-slate-100 group hover:border-orange-200 hover:bg-orange-50/50 transition-all"
                            >
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600 shadow-sm">
                                        {patient.name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-bold text-xs text-slate-900">{patient.name}</p>
                                        <div className="flex items-center gap-1 text-[9px] text-slate-500 font-medium">
                                            <Clock size={8} />
                                            <span>
                                                {new Date(patient.joinedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => admitPatient(patient.id)}
                                    className="px-2 py-1 bg-white border border-slate-200 text-slate-600 text-[10px] font-bold rounded hover:bg-green-600 hover:text-white hover:border-green-600 transition-all shadow-sm flex items-center gap-1"
                                >
                                    <CheckCircle size={10} />
                                    Admit
                                </button>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                )}
            </div>
        </div>
    );
};

export default WaitingRoomWidget;
