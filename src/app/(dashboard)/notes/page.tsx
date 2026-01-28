"use client";

import React, { useState } from 'react';
import { Mic, Split, CheckCircle, RefreshCcw, Wand2, PlayCircle, StopCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const AINotes: React.FC = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [aiState, setAiState] = useState<'idle' | 'generating' | 'review' | 'approved'>('idle');
    const [history, setHistory] = useState([
        { id: '1', patient: 'Sarah Connor', date: '2024-03-20', preview: 'Patient reports persistent anxiety...', status: 'Finalized' },
        { id: '2', patient: 'James Wilson', date: '2024-03-19', preview: 'Post-op checkup for cardiac stent...', status: 'Finalized' },
        { id: '3', patient: 'Emma Watson', date: '2024-03-18', preview: 'Initial consultation regarding...', status: 'Finalized' },
    ]);

    const handleGenerate = () => {
        setAiState('generating');
        setTimeout(() => setAiState('review'), 1500);
    };

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        Smart Documentation
                        {aiState === 'review' && <span className="text-xs font-normal text-white bg-purple-500 px-2 py-0.5 rounded-full animate-pulse">Review Needed</span>}
                    </h1>
                    <p className="text-slate-500 text-sm">Draft, review, and finalize medical notes with AI assistance.</p>
                </div>
                <div className="flex gap-3">
                    {aiState === 'review' ? (
                        <>
                            <Button variant="outline" onClick={handleGenerate} className="rounded-xl"><RefreshCcw size={16} className="mr-2" />Regenerate</Button>
                            <Button variant="default" onClick={() => setAiState('approved')} className="bg-primary-600 hover:bg-primary-700 rounded-xl"><CheckCircle size={16} className="mr-2" />Approve & Sign</Button>
                        </>
                    ) : aiState === 'approved' ? (
                        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 font-bold text-sm">
                            <CheckCircle size={16} /> Signed & Finalized
                        </div>
                    ) : (
                        <Button onClick={handleGenerate} disabled={aiState === 'generating'} className="bg-primary-600 hover:bg-primary-700 rounded-xl">
                            <Wand2 size={16} className="mr-2" />
                            Generate Note
                        </Button>
                    )}
                </div>
            </div>

            <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">
                {/* Historical Scribes Sidebar (3/12) */}
                <Card className="col-span-3 flex flex-col h-full bg-white border-slate-200 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Document Archive</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                        {history.map((item) => (
                            <div key={item.id} className="p-3 rounded-xl hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-100 transition-all group">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="text-xs font-bold text-slate-900 truncate">{item.patient}</span>
                                    <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded uppercase">Final</span>
                                </div>
                                <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed">{item.preview}</p>
                                <div className="mt-2 text-[9px] font-medium text-slate-400">{item.date}</div>
                            </div>
                        ))}
                    </div>
                </Card>
                {/* Main Workspace (9/12) */}
                <div className="col-span-9 grid grid-cols-2 gap-6 h-full min-h-0">
                    {/* LEFT: Input / Raw Audio */}
                    <Card className="flex flex-col h-full bg-slate-50/50 border-slate-200">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                                <Mic size={18} className="text-slate-400" /> Raw Input
                            </h3>
                            <button
                                onClick={() => setIsRecording(!isRecording)}
                                className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium transition-colors ${isRecording ? 'bg-red-100 text-red-600' : 'bg-white text-slate-600 border border-slate-200'}`}
                            >
                                {isRecording ? <><StopCircle size={14} /> Recording 00:42</> : <><PlayCircle size={14} /> Start Dictation</>}
                            </button>
                        </div>
                        <textarea
                            className="flex-1 w-full bg-white border border-slate-200 rounded-lg p-4 resize-none focus:outline-none focus:ring-2 focus:ring-primary-100 text-slate-600 font-mono text-sm leading-relaxed"
                            placeholder="Start recording or type shorthand notes here..."
                            defaultValue={`Patient reports persistent anxiety over the last 2 weeks. Sleep has been poor, waking up at 3am. 
Appetite is decreased.
Current meds: Sertraline 50mg.
Patient feels "jittery" in the mornings.`}
                        />
                    </Card>

                    {/* RIGHT: AI Output */}
                    <Card className={`flex flex-col h-full transition-colors duration-500 ${aiState === 'review' ? 'border-purple-200 bg-purple-50/10 shadow-lg ring-1 ring-purple-100' : ''}`}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                                <Wand2 size={18} className={aiState === 'review' ? "text-purple-500" : "text-slate-400"} />
                                AI Generated SOAP
                            </h3>
                            <span className="text-xs text-slate-400">GPT-4 Medical Model</span>
                        </div>

                        {aiState === 'idle' || aiState === 'generating' ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                                {aiState === 'generating' ? (
                                    <div className="text-center">
                                        <Wand2 size={48} className="mx-auto mb-4 animate-bounce text-purple-400" />
                                        <p>Analyzing conversation...</p>
                                    </div>
                                ) : (
                                    <div className="text-center">
                                        <Split size={48} className="mx-auto mb-4 opacity-50" />
                                        <p>Waiting for input...</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex-1 overflow-y-auto pr-2 space-y-4 text-sm text-slate-700 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="group relative hover:bg-white p-2 rounded transition-colors border border-transparent hover:border-purple-100">
                                    <h4 className="font-bold text-slate-900 mb-1 uppercase text-xs tracking-wider">Subjective</h4>
                                    <p>Patient reports persistent anxiety for 2 weeks duration. Associated symptoms include middle insomnia (waking at 03:00) and decreased appetite. Describes morning sensation of "jitteriness".</p>
                                </div>
                                <div className="group relative hover:bg-white p-2 rounded transition-colors border border-transparent hover:border-purple-100">
                                    <h4 className="font-bold text-slate-900 mb-1 uppercase text-xs tracking-wider">Objectve</h4>
                                    <p className="text-slate-500 italic">[Vitals not recorded in summary]</p>
                                </div>
                                <div className="group relative hover:bg-white p-2 rounded transition-colors border border-transparent hover:border-purple-100">
                                    <h4 className="font-bold text-slate-900 mb-1 uppercase text-xs tracking-wider">Assessment</h4>
                                    <p>1. Generalized Anxiety Disorder (F41.1) - Exacerbation.</p>
                                    <p>2. Insomnia due to anxiety.</p>
                                </div>
                                <div className="group relative hover:bg-white p-2 rounded transition-colors border border-transparent hover:border-purple-100">
                                    <h4 className="font-bold text-slate-900 mb-1 uppercase text-xs tracking-wider">Plan</h4>
                                    <p>1. Continued Sertraline 50mg PO Daily.</p>
                                    <p>2. Discussed sleep hygiene.</p>
                                    <p>3. Follow up in 4 weeks.</p>
                                </div>
                            </div>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default AINotes;
