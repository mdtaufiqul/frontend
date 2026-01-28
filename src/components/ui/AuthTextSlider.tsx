"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Quote, Newspaper, ArrowRight } from 'lucide-react';

interface AuthTextSliderProps {
    items: {
        title?: string;
        text: string;
        source?: string;
        category?: string;
    }[];
    mode?: 'news' | 'persuasive';
}

const AuthTextSlider: React.FC<AuthTextSliderProps> = ({ items, mode = 'persuasive' }) => {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setIndex((current) => (current + 1) % items.length);
        }, 6000);
        return () => clearInterval(timer);
    }, [items.length]);

    return (
        <div className="relative w-full max-w-lg">
            <AnimatePresence mode="wait">
                <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    className="space-y-6"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-sm">
                            {mode === 'news' ? <Newspaper size={16} className="text-white" /> : <Quote size={16} className="text-white" />}
                        </div>
                        {items[index].category && (
                            <span className="font-mono text-[10px] font-bold tracking-[0.2em] text-white/70 uppercase">
                                {items[index].category}
                            </span>
                        )}
                    </div>

                    <div className="space-y-4">
                        {items[index].title && (
                            <h3 className="text-2xl font-serif text-white italic leading-tight">
                                {items[index].title}
                            </h3>
                        )}
                        <p className="text-lg md:text-xl font-serif text-white leading-relaxed italic">
                            "{items[index].text}"
                        </p>
                    </div>

                    {items[index].source && (
                        <div className="flex items-center gap-4 pt-4">
                            <div className="h-px bg-white/20 flex-1" />
                            <span className="text-[11px] font-bold text-white/40 uppercase tracking-widest px-2">
                                {items[index].source}
                            </span>
                            <ArrowRight size={12} className="text-white/20" />
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>

            {/* Progress Indicators */}
            <div className="flex gap-2 mt-10">
                {items.map((_, i) => (
                    <button
                        key={i}
                        onClick={() => setIndex(i)}
                        className={`h-1 rounded-full transition-all duration-500 ${i === index ? 'w-8 bg-white' : 'w-2 bg-white/20 hover:bg-white/40'
                            }`}
                    />
                ))}
            </div>
        </div>
    );
};

export default AuthTextSlider;
