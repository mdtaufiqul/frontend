import React, { useState } from 'react';
import { Sparkles, Loader2, RefreshCw, Copy, Check, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import api from '@/utils/api';
import { motion, AnimatePresence } from 'framer-motion';

interface AIPatientSummaryProps {
    patient: any;
}

const AIPatientSummary: React.FC<AIPatientSummaryProps> = ({ patient }) => {
    const [summary, setSummary] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [hasCopied, setHasCopied] = useState(false);

    const generateSummary = async () => {
        setIsLoading(true);
        try {
            const payload = {
                demographics: {
                    name: patient.name,
                    dob: patient.dob,
                    gender: patient.gender,
                },
                appointments: patient.appointments?.slice(0, 5),
                notes: patient.notes?.slice(0, 5),
                forms: patient.formSubmissions?.slice(0, 3) || [],
                files: patient.files?.slice(0, 5) || [] // Include file metadata
            };

            const response = await api.post('/ai/patient-summary', payload);
            setSummary(response.data.summary);
            toast.success('Generated patient summary');
        } catch (error) {
            console.error('Summary generation failed:', error);
            toast.error('Failed to generate summary');
        } finally {
            setIsLoading(false);
        }
    };

    const copyToClipboard = () => {
        if (summary) {
            navigator.clipboard.writeText(summary);
            setHasCopied(true);
            toast.success('Copied to clipboard');
            setTimeout(() => setHasCopied(false), 2000);
        }
    };

    return (
        <div className="h-full flex flex-col">
            {!summary && !isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                    <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6 animate-pulse">
                        <Sparkles size={40} />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 mb-2">Generate Comprehensive Insight</h3>
                    <p className="text-slate-500 max-w-md mb-8 leading-relaxed">
                        Our AI engine will analyze this patient's demographics, recent appointments, submitted intake forms, uploaded files, and clinical notes to generate a holistic clinical summary.
                    </p>
                    <Button
                        onClick={generateSummary}
                        size="lg"
                        className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200"
                    >
                        <Sparkles size={18} />
                        Generate Clinical Summary
                    </Button>
                </div>
            ) : (
                <div className="flex-1 flex flex-col relative bg-slate-50">
                    {/* Toolbar */}
                    <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-6 py-3 flex items-center justify-between shadow-sm">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            Generated {new Date().toLocaleTimeString()}
                        </span>
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={generateSummary} disabled={isLoading} className="text-slate-500 hover:text-blue-600">
                                {isLoading ? <Loader2 size={16} className="animate-spin mr-2" /> : <RefreshCw size={16} className="mr-2" />}
                                Regenerate
                            </Button>
                            <Button variant="outline" size="sm" onClick={copyToClipboard} className={hasCopied ? "text-green-600 border-green-200 bg-green-50" : ""}>
                                {hasCopied ? <Check size={16} className="mr-2" /> : <Copy size={16} className="mr-2" />}
                                {hasCopied ? 'Copied' : 'Copy Text'}
                            </Button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 relative">
                        {isLoading && (
                            <div className="absolute inset-0 z-20 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                                <div className="flex flex-col items-center">
                                    <Loader2 className="h-10 w-10 text-blue-600 animate-spin mb-4" />
                                    <p className="font-medium text-slate-600">Analyzing clinical records...</p>
                                </div>
                            </div>
                        )}

                        {summary && (
                            <div className="prose prose-slate max-w-none prose-headings:font-bold prose-h3:text-blue-900 prose-strong:text-slate-900 prose-ul:list-disc prose-li:marker:text-blue-400">
                                <React.Fragment>
                                    {/* Simple Markdown Rendering */}
                                    {summary.split('\n').map((line, i) => {
                                        if (line.startsWith('### ')) return <h3 key={i} className="text-lg mt-6 mb-3">{line.replace('### ', '')}</h3>;
                                        if (line.startsWith('**')) return <p key={i} className="font-bold my-2">{line.replace(/\*\*/g, '')}</p>;
                                        if (line.startsWith('- ')) return <li key={i} className="ml-4 mb-1">{line.replace('- ', '')}</li>;
                                        return <p key={i} className="mb-2 leading-relaxed text-slate-700">{line}</p>;
                                    })}
                                </React.Fragment>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AIPatientSummary;
