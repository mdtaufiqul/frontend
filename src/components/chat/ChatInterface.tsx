import React, { useEffect, useState, useRef } from 'react';
import { Send, User, CheckCircle2, MessageCircle, Mail, Phone, Video, MoreVertical, Paperclip, Smile, MapPin, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import clsx from 'clsx';
import api from '@/utils/api';
import { useSocket } from '@/hooks/useSocket';
import { toast } from 'sonner';

interface Message {
    id: string;
    text: string;
    senderId: string;
    senderType: 'USER' | 'PATIENT' | 'VISITOR' | 'SYSTEM' | 'doctor' | 'patient'; // Handled both backend and local formats
    createdAt: string;
    readAt?: string | null;
    status: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' | 'QUEUED';
}

interface ChatInterfaceProps {
    conversationId?: string;
    patientId: string;
    patientName?: string;
    patientSource?: 'whatsapp' | 'email'; // For icon display
    isMeetingView?: boolean; // To adjust styling for sidebar vs full page
}

// ... imports

const ChatInterface: React.FC<ChatInterfaceProps> = ({ conversationId: initialConversationId, patientId, patientName, patientSource = 'whatsapp', isMeetingView = false }) => {
    const [conversationId, setConversationId] = useState<string | undefined>(initialConversationId);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<string>('');
    const [userRole, setUserRole] = useState<string>('');
    const [clinicDoctors, setClinicDoctors] = useState<any[]>([]);
    const [onBehalfOfId, setOnBehalfOfId] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const socket = useSocket();

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();

        // Mark unread messages as read (if from other person)
        const unreadIds = messages
            .filter(m => m.senderId !== currentUserId && !m.readAt)
            .map(m => m.id);

        if (unreadIds.length > 0 && currentUserId) {
            // Debounce or send immediately? Sending immediately for now but check if request is pending
            api.patch('/messages/read', { messageIds: unreadIds })
                .catch(err => console.error('Failed to mark read', err));
        }
    }, [messages, currentUserId]);

    // Socket Connection Logic
    useEffect(() => {
        if (!socket || !patientId) return;

        // Join Conversation Room Only (Patient room is for global notify)
        // if (patientId) socket.emit('joinRoom', { patientId });
        if (conversationId) socket.emit('joinConversation', { conversationId });

        // Listen for new messages
        const handleNewMessage = (message: any) => {
            console.log('Received new message via socket:', message);
            // Avoid duplicates if we just sent it (though we optimise optimistic UI differently usually)
            setMessages((prev) => {
                if (prev.some(m => m.id === message.id)) return prev;
                return [...prev, {
                    id: message.id,
                    text: message.content,
                    senderId: message.senderId,
                    senderType: message.senderType, // Keep original case from backend
                    createdAt: message.createdAt,
                    status: message.status || 'SENT'
                }];
            });
        };

        const handleMessagesRead = (data: { messageIds: string[], readAt: string }) => {
            console.log('Messages read:', data);
            setMessages(prev => prev.map(msg => {
                if (data.messageIds.includes(msg.id)) {
                    return { ...msg, readAt: data.readAt, status: 'READ' };
                }
                return msg;
            }));
        };

        const handleStatusUpdate = (data: { messageId: string, status: any, conversationId: string }) => {
            console.log('Message status update:', data);
            setMessages(prev => prev.map(msg => {
                if (msg.id === data.messageId) {
                    return { ...msg, status: data.status };
                }
                return msg;
            }));
        };

        socket.on('newMessage', handleNewMessage);
        socket.on('messagesRead', handleMessagesRead);
        socket.on('messageStatusUpdate', handleStatusUpdate);

        return () => {
            socket.off('newMessage', handleNewMessage);
            socket.off('messagesRead', handleMessagesRead);
            socket.off('messageStatusUpdate', handleStatusUpdate);
        };
    }, [socket, patientId]);

    // Fetch Doctor Profile for Sender ID
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await api.get('/auth/me'); // Use me for fuller profile
                setCurrentUserId(response.data.id);
                const role = response.data.role?.toLowerCase() || '';
                setUserRole(role);

                // If representative, fetch doctors to select who to reply as
                if (role === 'clinic_representative' && response.data.clinicId) {
                    const docsRes = await api.get(`/users?role=doctor&clinicId=${response.data.clinicId}`);
                    setClinicDoctors(docsRes.data);
                    if (docsRes.data.length > 0) {
                        setOnBehalfOfId(docsRes.data[0].id); // Default to first doctor
                    }
                }
            } catch (error) {
                console.error('Failed to fetch profile', error);
            }
        };
        fetchProfile();
    }, []);

    // Sync conversationId with props
    useEffect(() => {
        if (initialConversationId) {
            setConversationId(initialConversationId);
        }
    }, [initialConversationId]);

    // Fetch conversationId if missing
    useEffect(() => {
        const resolveConversation = async () => {
            if (conversationId || !patientId) return;

            try {
                // Try to find an existing conversation
                const response = await api.get(`/conversations?patientId=${patientId}`);
                if (response.data && response.data.length > 0) {
                    setConversationId(response.data[0].id);
                } else {
                    // This might be expected for new patients without chat history
                    console.log('No existing conversation found for patient:', patientId);
                }
            } catch (error) {
                console.error('Failed to resolve conversation:', error);
            }
        };
        resolveConversation();
    }, [conversationId, patientId]);

    // Load message history from conversation API
    useEffect(() => {
        const loadHistory = async () => {
            if (!conversationId) return;

            setIsLoading(true);
            try {
                const response = await api.get(`/conversations/${conversationId}/messages`);
                setMessages(response.data.map((msg: any) => ({
                    id: msg.id,
                    text: msg.content,
                    // Use actual senderId from DB, fallback only if missing
                    senderId: msg.senderId,
                    // Handle case-insensitive sender type
                    senderType: msg.senderType,
                    createdAt: msg.createdAt,
                    readAt: msg.readAt,
                    status: msg.status || (msg.readAt ? 'READ' : 'SENT')
                })));
            } catch (error) {
                console.error('Failed to load messages:', error);
                toast.error('Failed to load messages');
            } finally {
                setIsLoading(false);
            }
        };
        loadHistory();
    }, [conversationId]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputText.trim() || !conversationId) {
            if (!conversationId) console.error("No conversation ID found");
            return;
        }

        try {
            // Send via REST API
            const response = await api.post(`/conversations/${conversationId}/messages`, {
                content: inputText,
                onBehalfOfId: onBehalfOfId || undefined
            });

            // Add message to local state immediately
            const newMessage: Message = {
                id: response.data.id,
                text: response.data.content,
                senderId: response.data.senderId, // Use returned senderId
                senderType: response.data.senderType, // Use returned senderType
                createdAt: response.data.createdAt,
                status: response.data.status || 'SENT'
            };

            setMessages(prev => {
                if (prev.some(m => m.id === newMessage.id)) return prev;
                return [...prev, newMessage];
            });

            // Also emit via socket for real-time updates to other clients
            /* 
            if (socket) {
                socket.emit('messageCreated', newMessage);
            } 
            */
        } catch (error) {
            console.error('Failed to send message:', error);
            toast.error('Failed to send message');
        }

        setInputText('');
    };

    return (
        <div className="flex flex-col h-full bg-white relative">
            {/* Header */}
            {!isMeetingView && (
                <div className="h-20 border-b border-slate-100 flex items-center justify-between px-8 bg-white/50 backdrop-blur-md sticky top-0 z-10 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 relative">
                            <User size={24} />
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white border-2 border-slate-50 flex items-center justify-center">
                                {patientSource === 'whatsapp' ? (
                                    <MessageCircle size={10} className="text-green-500" />
                                ) : (
                                    <Mail size={10} className="text-blue-500" />
                                )}
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h2 className="text-base font-black text-slate-900">{patientName || 'Unknown Patient'}</h2>
                                {/* Removed Patient ID display as requested */}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Online • via {patientSource}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="rounded-xl border-slate-100 hover:bg-slate-50">
                            <Phone size={16} className="text-slate-500" />
                        </Button>
                        <Button variant="outline" size="sm" className="rounded-xl border-slate-100 hover:bg-slate-50">
                            <Video size={16} className="text-slate-500" />
                        </Button>
                        <Button variant="outline" size="sm" className="rounded-xl border-slate-100 hover:bg-slate-50">
                            <MoreVertical size={16} className="text-slate-500" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Messages Area */}
            <div className={clsx(
                "flex-1 overflow-y-auto space-y-6 bg-slate-50/30",
                isMeetingView ? "p-4 space-y-4" : "p-8"
            )}>
                {isLoading || !currentUserId ? (
                    <div className="flex justify-center py-10">
                        <span className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></span>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-sm">
                        No messages yet. Start the conversation.
                    </div>
                ) : (
                    messages.map((msg) => {
                        // isMe check: 
                        // 1. My ID matches senderId
                        // 2. I am a doctor/staff and it's a USER message (outgoing)
                        // isMe check: 
                        // 1. My ID matches senderId
                        // 2. I am a doctor/staff and it's a USER message (outgoing)
                        const isMe = msg.senderId === currentUserId ||
                            (['doctor', 'clinic_admin', 'clinic_representative', 'system_admin', 'saas_owner'].includes(userRole) &&
                                (msg.senderType?.toUpperCase() === 'USER' || (msg.senderType as any) === 'doctor'));

                        return (
                            <div
                                key={msg.id}
                                className={clsx(
                                    "flex flex-col max-w-[85%] group",
                                    isMe ? "ml-auto items-end" : "mr-auto items-start"
                                )}
                            >
                                <div className={clsx(
                                    "px-4 py-2.5 text-sm font-medium shadow-sm transition-all relative overflow-hidden",
                                    isMe
                                        ? "bg-primary-600 text-white rounded-2xl rounded-tr-none hover:bg-primary-700"
                                        : "bg-white border border-slate-100 text-slate-800 rounded-2xl rounded-tl-none hover:border-primary-200"
                                )}>
                                    {msg.text}
                                </div>
                                <div className="flex items-center gap-2 mt-1 px-1">
                                    <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">
                                        {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                                    </span>
                                    {isMe && (
                                        <div className="flex items-center ml-1">
                                            {msg.status === 'READ' && (
                                                <div className="flex -space-x-1">
                                                    <CheckCircle2 size={10} className="text-blue-200 fill-blue-500" />
                                                    <CheckCircle2 size={10} className="text-blue-200 fill-blue-500" />
                                                </div>
                                            )}
                                            {msg.status === 'DELIVERED' && (
                                                <div className="flex -space-x-1">
                                                    <CheckCircle2 size={10} className="text-slate-300" />
                                                    <CheckCircle2 size={10} className="text-slate-300" />
                                                </div>
                                            )}
                                            {(msg.status === 'SENT' || !msg.status) && (
                                                <CheckCircle2 size={10} className="text-white/50" />
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className={clsx(
                "border-t border-slate-100 bg-white",
                isMeetingView ? "p-4" : "p-6"
            )}>
                {userRole === 'clinic_representative' && clinicDoctors.length > 0 && (
                    <div className="mb-4 flex items-center gap-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Replying as:</label>
                        <select
                            value={onBehalfOfId || ''}
                            onChange={(e) => setOnBehalfOfId(e.target.value)}
                            className="text-xs font-bold text-primary-600 bg-primary-50 px-2 py-1 rounded-lg border-none focus:ring-0 outline-none"
                        >
                            {clinicDoctors.map(doc => (
                                <option key={doc.id} value={doc.id}>Dr. {doc.name}</option>
                            ))}
                        </select>
                    </div>
                )}
                <form onSubmit={handleSendMessage} className="relative flex items-center gap-3">
                    {!isMeetingView && (
                        <div className="flex items-center gap-2">
                            <button type="button" className="p-2 text-slate-400 hover:bg-slate-50 hover:text-primary-500 rounded-xl transition-all">
                                <Paperclip size={20} />
                            </button>
                        </div>
                    )}
                    <div className="flex-1 relative group">
                        <input
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder="Type a message..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all pr-12 shadow-inner"
                        />
                        <button
                            type="submit"
                            disabled={!inputText.trim()}
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-primary-600 text-white rounded-lg shadow-md flex items-center justify-center hover:bg-primary-700 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all"
                        >
                            <Send size={14} />
                        </button>
                    </div>
                </form>
                {!isMeetingView && (
                    <div className="flex items-center justify-between mt-4 px-2">
                        <div className="flex gap-4">
                            <button className="text-[10px] font-bold text-slate-400 hover:text-primary-500 transition-colors uppercase tracking-widest flex items-center gap-1.5">
                                <MapPin size={10} /> Location
                            </button>
                            <button className="text-[10px] font-bold text-slate-400 hover:text-primary-500 transition-colors uppercase tracking-widest flex items-center gap-1.5">
                                <Info size={10} /> Info
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatInterface;
