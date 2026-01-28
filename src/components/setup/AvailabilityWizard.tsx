import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Clock, Copy, Check, Plus, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import clsx from 'clsx';

interface AvailabilityWizardProps {
    isOpen: boolean;
    onClose: () => void;
}

const AvailabilityWizard: React.FC<AvailabilityWizardProps> = ({ isOpen, onClose }) => {
    const [activeStep, setActiveStep] = useState(1);
    const [copying, setCopying] = useState(false);

    // Mock Data Structure
    const [schedule, setSchedule] = useState([
        { day: 'Monday', active: true, slots: [{ start: '09:00', end: '17:00' }] },
        { day: 'Tuesday', active: true, slots: [{ start: '09:00', end: '17:00' }] },
        { day: 'Wednesday', active: true, slots: [{ start: '09:00', end: '17:00' }] },
        { day: 'Thursday', active: true, slots: [{ start: '09:00', end: '17:00' }] },
        { day: 'Friday', active: true, slots: [{ start: '09:00', end: '13:00' }] },
        { day: 'Saturday', active: false, slots: [] },
        { day: 'Sunday', active: false, slots: [] },
    ]);

    const [overrides, setOverrides] = useState([
        { date: '2023-12-25', reason: 'Christmas Day', type: 'off' },
        { date: '2024-01-01', reason: 'New Year Day', type: 'off' }
    ]);

    const toggleDay = (index: number) => {
        const newSchedule = [...schedule];
        newSchedule[index].active = !newSchedule[index].active;
        if (newSchedule[index].active && newSchedule[index].slots.length === 0) {
            newSchedule[index].slots.push({ start: '09:00', end: '17:00' });
        }
        setSchedule(newSchedule);
    };

    const copyMondayToAll = () => {
        setCopying(true);
        const mondaySlots = JSON.parse(JSON.stringify(schedule[0].slots));

        setTimeout(() => {
            const newSchedule = schedule.map((day, i) => {
                if (i === 0) return day; // Skip Monday
                // Keep weekends off by default unless Monday was off (unlikely usage pattern but logic holds)
                if (i > 4) return day;

                return {
                    ...day,
                    active: true,
                    slots: JSON.parse(JSON.stringify(mondaySlots))
                };
            });
            setSchedule(newSchedule);
            setCopying(false);
        }, 600);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]"
            >
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Set Your Availability</h2>
                        <p className="text-slate-500 text-sm">Define when you are available for bookings.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Wizard Progress */}
                <div className="px-12 py-6 bg-white border-b border-slate-50">
                    <div className="flex items-center justify-between relative">
                        {/* Line */}
                        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 -z-10" />

                        {[1, 2, 3].map((step) => (
                            <div
                                key={step}
                                className="flex flex-col items-center gap-2 bg-white px-2 cursor-pointer"
                                onClick={() => setActiveStep(step)}
                            >
                                <div className={clsx(
                                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors",
                                    step <= activeStep ? "bg-primary-600 text-white" : "bg-slate-100 text-slate-400"
                                )}>
                                    {step < activeStep ? <Check size={16} /> : step}
                                </div>
                                <span className={clsx("text-xs font-medium", step <= activeStep ? "text-slate-900" : "text-slate-400")}>
                                    {step === 1 ? 'Weekly Hours' : step === 2 ? 'Overrides' : 'Review'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8">
                    {activeStep === 1 && (
                        <div>
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                    <Clock size={18} className="text-primary-500" />
                                    Standard Weekly Hours
                                </h3>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={copyMondayToAll}
                                >
                                    {copying ? <Check size={14} className="mr-2" /> : <Copy size={14} className="mr-2" />}
                                    {copying ? 'Copied!' : 'Copy Monday to Weekdays'}
                                </Button>
                            </div>

                            <div className="space-y-4">
                                {schedule.map((day, index) => (
                                    <div
                                        key={day.day}
                                        className={clsx(
                                            "flex items-start gap-4 p-4 rounded-xl border transition-all",
                                            day.active ? "bg-white border-slate-200 shadow-sm" : "bg-slate-50 border-slate-100 opacity-60"
                                        )}
                                    >
                                        {/* Day Toggle */}
                                        <div className="w-32 pt-2">
                                            <label className="flex items-center gap-3 cursor-pointer">
                                                <div className={clsx(
                                                    "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                                                    day.active ? "bg-primary-600 border-primary-600" : "bg-white border-slate-300"
                                                )}>
                                                    {day.active && <Check size={12} className="text-white" />}
                                                </div>
                                                <input type="checkbox" className="hidden" checked={day.active} onChange={() => toggleDay(index)} />
                                                <span className="font-medium text-slate-700">{day.day}</span>
                                            </label>
                                        </div>

                                        {/* Slots */}
                                        <div className="flex-1 space-y-3">
                                            {day.active ? (
                                                <>
                                                    {day.slots.map((slot, sIndex) => (
                                                        <div key={sIndex} className="flex items-center gap-3">
                                                            <div className="flex items-center gap-2">
                                                                <input
                                                                    type="time"
                                                                    defaultValue={slot.start}
                                                                    className="p-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-100 outline-none"
                                                                />
                                                                <span className="text-slate-400">-</span>
                                                                <input
                                                                    type="time"
                                                                    defaultValue={slot.end}
                                                                    className="p-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-100 outline-none"
                                                                />
                                                            </div>
                                                            <button className="text-slate-400 hover:text-red-500 transition-colors">
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                    <button className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1 mt-1">
                                                        <Plus size={12} /> Add Break / Split Shift
                                                    </button>
                                                </>
                                            ) : (
                                                <span className="text-slate-400 text-sm py-2 block italic">Unavailable</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeStep === 2 && (
                        <div>
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-slate-800">Date-Specific Overrides</h3>
                                <Button size="sm" onClick={() => setOverrides([...overrides, { date: '2024-07-04', reason: 'Independence Day', type: 'off' }])}>
                                    <Plus size={14} className="mr-2" />
                                    Add Override
                                </Button>
                            </div>

                            <div className="bg-slate-50 rounded-xl p-8 text-center border border-slate-100 border-dashed">
                                <p className="text-slate-500 mb-2">No overrides configured yet.</p>
                                <p className="text-sm text-slate-400">Add holidays or specific days where your schedule differs.</p>
                            </div>

                            <div className="mt-6 space-y-3">
                                {overrides.map((override, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-red-50 text-red-600 rounded-lg flex items-center justify-center font-bold text-xs flex-col leading-none">
                                                <span>DEC</span>
                                                <span className="text-lg">25</span>
                                            </div>
                                            <div>
                                                <h4 className="font-medium text-slate-900">{override.reason}</h4>
                                                <p className="text-sm text-slate-500 capitalize">{override.type}</p>
                                            </div>
                                        </div>
                                        <button className="text-slate-400 hover:text-red-500 transition-colors">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeStep === 3 && (
                        <div>
                            <h3 className="font-bold text-slate-800 mb-6">Review & Confirm</h3>

                            <div className="space-y-6">
                                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                                    <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 font-medium text-slate-700 text-sm">
                                        Standard Weekly Schedule
                                    </div>
                                    <div className="p-4 grid grid-cols-2 gap-4">
                                        {schedule.filter(d => d.active).map(d => (
                                            <div key={d.day} className="flex justify-between text-sm">
                                                <span className="text-slate-500">{d.day}</span>
                                                <span className="font-medium text-slate-900">
                                                    {d.slots.map(s => `${s.start} - ${s.end}`).join(', ')}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                                    <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 font-medium text-slate-700 text-sm">
                                        Upcoming Overrides
                                    </div>
                                    <div className="p-4">
                                        {overrides.length > 0 ? (
                                            <ul className="space-y-2">
                                                {overrides.map((o, i) => (
                                                    <li key={i} className="text-sm flex justify-between">
                                                        <span className="text-slate-500">{o.date} ({o.reason})</span>
                                                        <span className="font-medium text-slate-900 capitalize">{o.type}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="text-sm text-slate-400 italic">No overrides set.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
                    <button className="text-slate-500 hover:text-slate-800 font-medium text-sm" onClick={() => setSchedule(schedule.map(d => ({ ...d, active: true })))}>Reset Defaults</button>
                    <div className="flex gap-3">
                        {activeStep > 1 && (
                            <Button variant="ghost" onClick={() => setActiveStep(activeStep - 1)}>Back</Button>
                        )}
                        {activeStep < 3 ? (
                            <Button onClick={() => setActiveStep(activeStep + 1)}>Next Step</Button>
                        ) : (
                            <Button onClick={onClose}>Save Availability</Button>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default AvailabilityWizard;
