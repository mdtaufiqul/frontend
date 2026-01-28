"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Send, User, Bot, MoreHorizontal, X } from 'lucide-react';
import { useSocket } from '@/hooks/useSocket';
import api from '@/utils/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface Message {
    id: string;
    text: string;
    senderType: 'doctor' | 'patient' | 'system';
    createdAt: string;
    senderId: string;
}

interface MeetingChatProps {
    patientId: string;
    doctorId: string; // Current user ID (doctor) or the doctor ID if viewed by patient
    isPatientView?: boolean; // If true, current user is patient
    onClose?: () => void;
}

const MeetingChat: React.FC<MeetingChatProps> = ({ patientId, doctorId, isPatientView = false, onClose }) => {
    const socket = useSocket();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Current User Info (Derived)
    const currentUserId = isPatientView ? patientId : doctorId;
    const currentUserType = isPatientView ? 'patient' : 'doctor';

    // Fetch initial history
    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const res = await api.get(`/messages/${patientId}`);
                setMessages(res.data);
            } catch (error) {
                console.error("Failed to load chat history:", error);
                toast.error("Could not load chat history");
            } finally {
                setLoading(false);
            }
        };

        if (patientId) {
            fetchHistory();
        }
    }, [patientId]);

    // Socket Connection
    useEffect(() => {
        if (!socket || !patientId) return;

        // Join room
        socket.emit('joinRoom', { patientId });

        const handleNewMessage = (msg: Message) => {
            setMessages(prev => [...prev, msg]);
            // Scroll to bottom
            if (scrollRef.current) {
                setTimeout(() => {
                    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
                }, 100);
            }
        };

        socket.on('newMessage', handleNewMessage);

        return () => {
            socket.off('newMessage', handleNewMessage);
        };
    }, [socket, patientId]);

    // Auto-scroll on messages change
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
        }
    }, [messages, loading]);

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!newMessage.trim() || !socket) return;

        const payload = {
            text: newMessage,
            senderId: currentUserId,
            senderType: currentUserType,
            patientId: patientId,
            doctorId: doctorId
        };

        // Optimistic update? Better to wait for server echo or simple local append?
        // Server emits 'newMessage' to room, so we'll receive our own message back.
        // We can just emit and wait.

        try {
            socket.emit('sendMessage', payload);
            setNewMessage('');
        } catch (err) {
            console.error("Failed to send message", err);
            toast.error("Failed to send message");
        }
    };

    return (
        <div className="flex flex-col h-full bg-white border-l border-slate-200 shadow-xl">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white relative z-10">
                <div>
                    <h3 className="font-bold text-slate-900 text-sm">Meeting Chat</h3>
                    <p className="text-[10px] text-slate-500 font-medium">
                        {isPatientView ? 'Chat with Doctor' : 'Chat with Patient'}
                    </p>
                </div>
                {onClose && (
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={18} />
                    </button>
                )}
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50" ref={scrollRef}>
                {loading ? (
                    <div className="text-center text-xs text-slate-400 py-4">Loading history...</div>
                ) : messages.length === 0 ? (
                    <div className="text-center text-xs text-slate-400 py-10 flex flex-col items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                            <MoreHorizontal size={14} />
                        </div>
                        <p>No messages yet.</p>
                        <p>Start the conversation!</p>
                    </div>
                ) : (
                    messages.map((msg, idx) => {
                        const isMe = msg.senderType === currentUserType;
                        const isSystem = msg.senderType === 'system';

                        if (isSystem) {
                            return (
                                <div key={idx} className="flex justify-center my-2">
                                    <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded-full">{msg.text}</span>
                                </div>
                            );
                        }

                        return (
                            <div key={idx} className={cn("flex gap-2 max-w-[85%]", isMe ? "ml-auto flex-row-reverse" : "")}>
                                <div className={cn(
                                    "w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ring-2 ring-white",
                                    isMe ? "bg-primary-100 text-primary-700" : "bg-emerald-100 text-emerald-700"
                                )}>
                                    {isMe ? 'Me' : (msg.senderType === 'doctor' ? 'Dr' : 'Pt')}
                                </div>
                                <div>
                                    <div className={cn(
                                        "p-3 rounded-2xl text-sm shadow-sm",
                                        isMe
                                            ? "bg-primary-600 text-white rounded-tr-none"
                                            : "bg-white border border-slate-200 text-slate-800 rounded-tl-none"
                                    )}>
                                        {msg.text}
                                    </div>
                                    <p className={cn("text-[10px] text-slate-400 mt-1", isMe ? "text-right" : "text-left")}>
                                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Input Area */}
            <div className="p-3 bg-white border-t border-slate-100">
                <form onSubmit={handleSendMessage} className="relative flex items-center gap-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 bg-slate-50 border-0 focus:ring-2 focus:ring-primary-100 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 font-medium transition-all"
                    />
                    <Button
                        type="submit"
                        size="icon"
                        disabled={!newMessage.trim()}
                        className={cn(
                            "rounded-xl transition-all duration-200 shrink-0",
                            newMessage.trim() ? "bg-primary-600 hover:bg-primary-700 shadow-md shadow-primary-200 scale-100" : "bg-slate-200 text-slate-400 scale-95"
                        )}
                    >
                        <Send size={18} className={newMessage.trim() ? "translate-x-0.5" : ""} />
                    </Button>
                </form>
            </div>
        </div>
    );
};

export default MeetingChat;
