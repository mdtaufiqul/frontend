'use client';

import React, { useRef, useEffect } from 'react';
import { useChatWidget } from './useChatWidget';
import { Send, X, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils'; // Assuming utils exists, or remove

interface ChatWidgetProps {
    clinicId: string;
    title?: string;
    primaryColor?: string;
}

export function ChatWidget({ clinicId, title = 'Support Chat', primaryColor = '#2563EB' }: ChatWidgetProps) {
    const { isOpen, toggle, messages, sendMessage, isConnected } = useChatWidget(clinicId);
    const [inputValue, setInputValue] = React.useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    const handleSend = () => {
        if (!inputValue.trim()) return;
        sendMessage(inputValue);
        setInputValue('');
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end font-sans">
            {/* Chat Window */}
            {isOpen && (
                <div className="mb-4 w-[350px] overflow-hidden rounded-lg bg-white shadow-xl ring-1 ring-black/5 transition-all duration-200 ease-in-out dark:bg-zinc-900 border dark:border-zinc-800">
                    {/* Header */}
                    <div
                        className="flex items-center justify-between p-4 text-white"
                        style={{ backgroundColor: primaryColor }}
                    >
                        <div className="flex items-center gap-2">
                            <div className="relative h-2 w-2 rounded-full bg-green-400">
                                {isConnected && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>}
                            </div>
                            <h3 className="font-semibold">{title}</h3>
                        </div>
                        <button onClick={toggle} className="rounded p-1 hover:bg-white/20">
                            <X size={18} />
                        </button>
                    </div>

                    {/* Messages Area */}
                    <div className="h-[400px] overflow-y-auto bg-gray-50 p-4 dark:bg-zinc-900/50">
                        {messages.length === 0 ? (
                            <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
                                <MessageCircle size={48} className="mb-2 opacity-20" />
                                <p className="text-sm">How can we help you today?</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {messages.map((msg, i) => {
                                    const isVisitor = msg.senderType === 'VISITOR';
                                    return (
                                        <div
                                            key={i}
                                            className={cn(
                                                "flex w-full",
                                                isVisitor ? "justify-end" : "justify-start"
                                            )}
                                        >
                                            <div
                                                className={cn(
                                                    "max-w-[80%] rounded-lg px-3 py-2 text-sm shadow-sm",
                                                    isVisitor
                                                        ? "bg-blue-600 text-white"
                                                        : "bg-white text-gray-800 border border-gray-100 dark:bg-zinc-800 dark:text-gray-100 dark:border-zinc-700"
                                                )}
                                                style={isVisitor ? { backgroundColor: primaryColor } : {}}
                                            >
                                                {msg.content}
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>
                        )}
                    </div>

                    {/* Input Area */}
                    <div className="border-t bg-white p-3 dark:bg-zinc-900 dark:border-zinc-800">
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={handleKeyPress}
                                placeholder="Type a message..."
                                className="flex-1 rounded-md border border-gray-200 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700"
                            />
                            <button
                                onClick={handleSend}
                                disabled={!inputValue.trim()}
                                className="rounded-md p-2 text-blue-600 transition-colors hover:bg-blue-50 disabled:opacity-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                                style={{ color: primaryColor }}
                            >
                                <Send size={18} />
                            </button>
                        </div>
                        <div className="mt-1 text-center text-[10px] text-gray-400">
                            Powered by Mediflow
                        </div>
                    </div>
                </div>
            )}

            {/* Toggle Button */}
            <button
                onClick={toggle}
                className={cn(
                    "flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95 text-white"
                )}
                style={{ backgroundColor: primaryColor }}
            >
                {isOpen ? <X size={24} /> : <MessageCircle size={28} />}
            </button>
        </div>
    );
}
