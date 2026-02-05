
import React, { useState, useEffect, useRef } from 'react';
import { Send, Mail, MessageSquare, Phone } from 'lucide-react';


interface Message {
    id: string;
    type: 'SMS' | 'WHATSAPP' | 'EMAIL' | 'IN_APP';
    direction: 'INBOUND' | 'OUTBOUND';
    content: string;
    sentAt: string;
    status: string;
}

interface UnifiedChatProps {
    patientId: string;
    doctorId: string; // Passed from parent or context
    apiBaseUrl?: string; // e.g. http://localhost:3001
}

import api from '@/utils/api';

export const UnifiedChat: React.FC<UnifiedChatProps> = ({ patientId, doctorId }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [channel, setChannel] = useState<'IN_APP' | 'SMS' | 'WHATSAPP' | 'EMAIL'>('IN_APP');
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Fetch History
    const fetchHistory = async () => {
        try {
            const res = await api.get(`/communication/history/${patientId}`);
            setMessages(res.data);
            scrollToBottom();
        } catch (e) {
            console.error('Failed to fetch chat history', e);
        }
    };

    useEffect(() => {
        fetchHistory();
        const interval = setInterval(fetchHistory, 5000); // Polling for new messages
        return () => clearInterval(interval);
    }, [patientId]);

    const scrollToBottom = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    };

    const handleSend = async () => {
        if (!inputText.trim()) return;
        setLoading(true);

        try {
            await api.post('/communication/send', {
                doctorId,
                patientId,
                type: channel,
                content: inputText
            });

            setInputText('');
            fetchHistory(); // Refresh
        } catch (e: any) {
            alert('Failed to send message: ' + (e.response?.data?.message || e.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-[600px] border rounded-lg bg-white shadow-sm">
            {/* Header */}
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                <h3 className="font-semibold text-gray-700">Communication Hub</h3>
                <span className="text-xs text-gray-500">Live Updates</span>
            </div>

            {/* Message List */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-100">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.direction === 'OUTBOUND' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] rounded-lg p-3 ${msg.direction === 'OUTBOUND'
                            ? 'bg-blue-600 text-white rounded-br-none'
                            : 'bg-white text-gray-800 border rounded-bl-none shadow-sm'
                            }`}>
                            <div className="flex items-center gap-2 mb-1">
                                {msg.type === 'IN_APP' && <MessageSquare className="w-3 h-3 opacity-70" />}
                                {msg.type === 'SMS' && <MessageSquare className="w-3 h-3 opacity-70" />}
                                {msg.type === 'WHATSAPP' && <Phone className="w-3 h-3 opacity-70" />}
                                {msg.type === 'EMAIL' && <Mail className="w-3 h-3 opacity-70" />}
                                <span className="text-[10px] uppercase opacity-70">
                                    {msg.type === 'IN_APP' ? 'Internal' : msg.type}
                                </span>
                            </div>
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            <div className="text-[10px] mt-1 opacity-60 text-right">
                                {new Date(msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                {msg.direction === 'OUTBOUND' && ` • ${msg.status}`}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t">
                <label className="text-xs font-semibold text-gray-500 mb-2 block">Send via:</label>
                <div className="flex gap-2 mb-2">
                    {/* Channel Selector */}
                    <button
                        onClick={() => setChannel('IN_APP')}
                        className={`flex items-center gap-1 px-3 py-1 text-xs rounded-full border ${channel === 'IN_APP' ? 'bg-indigo-100 border-indigo-500 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        <MessageSquare className="w-3 h-3" /> Internal (App)
                    </button>
                    <button
                        onClick={() => setChannel('SMS')}
                        className={`flex items-center gap-1 px-3 py-1 text-xs rounded-full border ${channel === 'SMS' ? 'bg-blue-100 border-blue-500 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        <MessageSquare className="w-3 h-3" /> SMS
                    </button>
                    <button
                        onClick={() => setChannel('WHATSAPP')}
                        className={`flex items-center gap-1 px-3 py-1 text-xs rounded-full border ${channel === 'WHATSAPP' ? 'bg-green-100 border-green-500 text-green-700' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        <Phone className="w-3 h-3" /> WhatsApp
                    </button>
                    <button
                        onClick={() => setChannel('EMAIL')}
                        className={`flex items-center gap-1 px-3 py-1 text-xs rounded-full border ${channel === 'EMAIL' ? 'bg-orange-100 border-orange-500 text-orange-700' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        <Mail className="w-3 h-3" /> Email
                    </button>
                </div>

                <div className="flex gap-2">
                    <textarea
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder={`Type a message via ${channel}...`}
                        className="flex-1 p-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        rows={2}
                    />
                    <button
                        onClick={handleSend}
                        disabled={loading || !inputText.trim()}
                        className="px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center transition-colors"
                    >
                        {loading ? <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : <Send className="w-5 h-5" />}
                    </button>
                </div>
            </div>
        </div>
    );
};
