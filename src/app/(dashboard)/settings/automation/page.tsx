"use client";

import { useState, useEffect } from "react";
import { Plus, Clock, MessageSquare, Mail, AlertTriangle, Trash2, ArrowRight } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

interface WorkflowStep {
    id: string;
    type: "EMAIL" | "SMS" | "DELAY" | "NO_SHOW_CHECK";
    config: any;
    order: number;
}

export default function AutomationStudio() {
    const { theme } = useTheme();
    const [steps, setSteps] = useState<WorkflowStep[]>([
        { id: "1", type: "EMAIL", config: { template: "confirmation" }, order: 0 },
        { id: "2", type: "DELAY", config: { duration: 24 }, order: 1 },
        { id: "3", type: "SMS", config: { template: "reminder" }, order: 2 },
    ]);

    const addStep = (type: WorkflowStep["type"]) => {
        const newStep: WorkflowStep = {
            id: Math.random().toString(36).substr(2, 9),
            type,
            config: type === 'DELAY' ? { duration: 12 } : {},
            order: steps.length,
        };
        setSteps([...steps, newStep]);
    };

    const removeStep = (id: string) => {
        setSteps(steps.filter((s) => s.id !== id));
    };

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-10">
                <div>
                    <h1 className="text-3xl font-bold mb-2 text-primary">Automation Studio</h1>
                    <p className="text-slate-500 dark:text-slate-400">
                        Design your patient communication journey.
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline">Test Flow</Button>
                    <Button className="bg-primary text-white">Save Workflow</Button>
                </div>
            </div>

            <div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-8 space-y-8 pb-20">
                {/* Start Node */}
                <div className="relative pl-8">
                    <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-emerald-500 ring-4 ring-slate-50 dark:ring-slate-900" />
                    <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-fit">
                        <span className="font-semibold flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            On Appointment Created
                        </span>
                    </div>
                </div>

                {/* Dynamic Steps */}
                {steps.map((step, index) => (
                    <div key={step.id} className="relative pl-8 group">
                        <div className="absolute -left-[9px] top-6 w-4 h-4 rounded-full bg-slate-300 dark:bg-slate-700 ring-4 ring-slate-50 dark:ring-slate-900 group-hover:bg-primary transition-colors" />

                        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-all relative">
                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => removeStep(step.id)} className="text-slate-400 hover:text-red-500">
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className={`p-3 rounded-lg ${step.type === 'EMAIL' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20' :
                                        step.type === 'SMS' ? 'bg-purple-50 text-purple-600 dark:bg-purple-900/20' :
                                            step.type === 'DELAY' ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/20' :
                                                'bg-rose-50 text-rose-600 dark:bg-rose-900/20'
                                    }`}>
                                    {step.type === 'EMAIL' && <Mail className="w-6 h-6" />}
                                    {step.type === 'SMS' && <MessageSquare className="w-6 h-6" />}
                                    {step.type === 'DELAY' && <Clock className="w-6 h-6" />}
                                    {step.type === 'NO_SHOW_CHECK' && <AlertTriangle className="w-6 h-6" />}
                                </div>

                                <div>
                                    <h3 className="font-semibold text-lg flex items-center gap-2">
                                        {step.type === 'DELAY' ? 'Wait Period' :
                                            step.type === 'SMS' ? 'Send SMS Message' :
                                                step.type === 'EMAIL' ? 'Send Email' : 'Check No-Show Status'}
                                    </h3>
                                    <p className="text-sm text-slate-500 mt-1">
                                        {step.type === 'DELAY' ? `Wait for ${step.config.duration || 24} hours` :
                                            step.type === 'SMS' ? 'Send "Reminder" template via Twilio' :
                                                step.type === 'EMAIL' ? 'Send "Confirmation" transactional email' :
                                                    'Evaluate status (15m buffer)'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Connector arrow */}
                        {index < steps.length - 1 && (
                            <div className="absolute left-[30px] bottom-[-20px] text-slate-300">
                                <ArrowRight className="w-5 h-5 rotate-90" />
                            </div>
                        )}
                    </div>
                ))}

                {/* Add Button */}
                <div className="relative pl-8 pt-8">
                    <div className="absolute -left-[3px] top-12 w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={() => addStep('EMAIL')} className="gap-2">
                            <Mail className="w-4 h-4" /> Email
                        </Button>
                        <Button variant="outline" onClick={() => addStep('SMS')} className="gap-2">
                            <MessageSquare className="w-4 h-4" /> SMS
                        </Button>
                        <Button variant="outline" onClick={() => addStep('DELAY')} className="gap-2">
                            <Clock className="w-4 h-4" /> Delay
                        </Button>
                        <Button variant="outline" onClick={() => addStep('NO_SHOW_CHECK')} className="gap-2 border-rose-200 hover:bg-rose-50 text-rose-600">
                            <AlertTriangle className="w-4 h-4" /> Check Logic
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
