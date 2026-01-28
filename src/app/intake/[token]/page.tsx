
'use client';

import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { useParams } from 'next/navigation';

export default function IntakePage() {
    const params = useParams();
    const token = params?.token as string;

    // State
    const [loading, setLoading] = useState(true);
    const [session, setSession] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [inputText, setInputText] = useState('');
    const [sending, setSending] = useState(false);
    const [finished, setFinished] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Load Session
    useEffect(() => {
        if (!token) return;
        const load = async () => {
            try {
                const data = await api.intake.getSession(token);
                setSession(data);
                setMessages(data.messages || []);
                if (data.status === 'COMPLETED') setFinished(true);
            } catch (err) {
                console.error(err);
                alert('Invalid or expired session');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [token]);

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!inputText.trim() || sending) return;

        const content = inputText;
        setInputText('');
        setSending(true);

        // Optimistic UI
        const newMsg = { role: 'user', content, timestamp: new Date() };
        setMessages(prev => [...prev, newMsg]);

        try {
            const res = await api.intake.chat(token, content);
            setMessages(res.messages); // Sync full history
        } catch (err) {
            console.error(err);
            alert('Failed to send message');
        } finally {
            setSending(false);
        }
    };

    const handleFinish = async () => {
        if (!confirm('Are you sure you want to finish the intake session?')) return;
        setLoading(true);
        try {
            await api.intake.finish(token);
            setFinished(true);
        } catch (err) {
            console.error(err);
            alert('Failed to finish');
            setLoading(false);
        }
    };

    if (loading) return <div className="flex items-center justify-center h-screen bg-gray-50">Loading Intake...</div>;

    if (finished) return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-50 p-4 text-center">
            <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h1>
                <p className="text-gray-600">Your pre-visit intake is complete. The details have been sent to your doctor.</p>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white px-4 py-4 shadow-sm z-10 sticky top-0">
                <div className="max-w-2xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                            M
                        </div>
                        <div>
                            <h1 className="font-semibold text-gray-900">MediFlow Assistant</h1>
                            <p className="text-xs text-gray-500">Pre-Visit Intake</p>
                        </div>
                    </div>
                    <button
                        onClick={handleFinish}
                        className="text-sm text-gray-500 hover:text-gray-900 font-medium px-3 py-1 rounded hover:bg-gray-100"
                    >
                        Finish Intake
                    </button>
                </div>
            </header>

            {/* Chat Area */}
            <main className="flex-1 overflow-y-auto p-4 scroll-smooth">
                <div className="max-w-2xl mx-auto space-y-4">
                    {/* Welcome Bubble */}
                    <div className="flex justify-start">
                        <div className="bg-blue-50 text-gray-800 p-3 rounded-2xl rounded-tl-none max-w-[85%] shadow-sm">
                            <p>Hi {session?.appointment?.patient?.name?.split(' ')[0] || 'there'}, I'm your AI medical assistant. I'd like to ask you a few questions before your visit to save time. What brings you in today?</p>
                        </div>
                    </div>

                    {/* Messages */}
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`p-3 rounded-2xl max-w-[85%] shadow-sm ${msg.role === 'user'
                                    ? 'bg-blue-600 text-white rounded-tr-none'
                                    : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'
                                }`}>
                                <p className="whitespace-pre-wrap">{msg.content}</p>
                            </div>
                        </div>
                    ))}

                    {/* Typing Indicator */}
                    {sending && (
                        <div className="flex justify-start">
                            <div className="bg-gray-100 p-3 rounded-2xl rounded-tl-none w-16 flex items-center justify-center gap-1">
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </main>

            {/* Input Area */}
            <footer className="bg-white p-4 border-t sticky bottom-0">
                <div className="max-w-2xl mx-auto flex gap-2">
                    <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Type your response..."
                        disabled={sending}
                        className="flex-1 border border-gray-300 rounded-full px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!inputText.trim() || sending}
                        className="bg-blue-600 text-white rounded-full w-12 h-12 flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors"
                    >
                        <svg className="w-5 h-5 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                    </button>
                </div>
            </footer>
        </div>
    );
}
