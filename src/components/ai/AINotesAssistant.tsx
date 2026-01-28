import React, { useState } from 'react';
import { Sparkles, Wand2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import VoiceRecorder from './VoiceRecorder';
import api from '@/utils/api';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface AINotesAssistantProps {
    value: string;
    onChange: (value: string) => void;
    context?: string; // Additional context for AI (patient history etc)
    placeholder?: string;
    className?: string;
}

const AINotesAssistant: React.FC<AINotesAssistantProps> = ({
    value,
    onChange,
    context = '',
    placeholder = 'Type your notes here...',
    className
}) => {
    const [isPromptOpen, setIsPromptOpen] = useState(false);
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    const handleTranscription = (text: string) => {
        // Append transcribed text to current cursor position or end
        const newValue = value ? `${value} ${text}` : text;
        onChange(newValue);
    };

    const handleGenerate = async () => {
        if (!prompt.trim()) return;
        setIsGenerating(true);
        try {
            const response = await api.post('/ai/generate-notes', {
                context: `${context}\n\nCurrent Note Draft: ${value}`,
                prompt: prompt
            });

            const aiText = response.data.notes;
            // Append or replace? Let's append for safety or smart insert
            // For now, simpler is usually better: just add it to the textarea
            // But maybe we want the AI to rewrite the whole thing?
            // "Rewrite this note to be more professional" -> Replace
            // "Add a section about..." -> Append

            // Heuristic: If prompt implies replacement ("rewrite", "fix"), maybe ask user?
            // Let's just append for now and let user edit, or if empty, set it.

            if (!value.trim()) {
                onChange(aiText);
            } else {
                onChange(`${value}\n\n${aiText}`);
            }

            setIsPromptOpen(false);
            setPrompt('');
            toast.success('AI suggestions added');
        } catch (error) {
            console.error('Generation failed:', error);
            toast.error('Failed to generate notes');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className={`space-y-2 ${className}`}>
            <div className="flex items-center justify-between gap-2 p-2 bg-slate-50 border border-slate-200 rounded-t-xl border-b-0">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-2">Medical Editor</span>
                </div>
                <div className="flex items-center gap-2">
                    <VoiceRecorder onTranscriptionComplete={handleTranscription} />
                    <Button
                        size="sm"
                        variant="secondary"
                        className="gap-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border-indigo-200"
                        onClick={() => setIsPromptOpen(true)}
                    >
                        <Wand2 size={14} />
                        AI Assist
                    </Button>
                </div>
            </div>

            <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full h-48 p-4 text-sm border border-slate-200 rounded-b-xl focus:ring-2 focus:ring-primary-100 focus:outline-none resize-none -mt-2 block font-sans leading-relaxed"
            />

            {/* AI Prompt Dialog */}
            <Dialog open={isPromptOpen} onOpenChange={setIsPromptOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Sparkles className="text-indigo-500" size={20} />
                            AI Assistant
                        </DialogTitle>
                        <DialogDescription>
                            Ask the AI to generate text, rewrite your notes, or summarize findings.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="e.g., 'Summarize the symptoms', 'Convert to SOAP format', 'List potential diagnoses'"
                            className="w-full h-24 p-3 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:outline-none resize-none"
                            autoFocus
                        />
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsPromptOpen(false)}>Cancel</Button>
                        <Button onClick={handleGenerate} disabled={isGenerating || !prompt.trim()} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
                            {isGenerating ? 'Generating...' : (
                                <>
                                    Generate <ArrowRight size={16} />
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AINotesAssistant;
