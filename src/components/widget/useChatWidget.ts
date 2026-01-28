import { useState, useEffect, useRef } from 'react';
import io, { Socket } from 'socket.io-client';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface Message {
    id: string;
    content: string;
    senderId?: string;
    senderType: 'DOCTOR' | 'PATIENT' | 'VISITOR' | 'SYSTEM' | 'USER';
    conversationId?: string; // NEW
    createdAt: string;
    readAt?: string | null;
    status?: string; // NEW
}

export function useChatWidget(clinicId: string) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [visitorToken, setVisitorToken] = useState<string | null>(null);
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [visitorId, setVisitorId] = useState<string | null>(null);
    const [conversationId, setConversationId] = useState<string | null>(null);

    // Load token from localStorage
    useEffect(() => {
        const storedToken = localStorage.getItem('mediflow_visitor_token');
        if (storedToken) setVisitorToken(storedToken);

        // Init Session
        initSession(storedToken);
    }, [clinicId]);

    const initSession = async (token?: string | null) => {
        try {
            const res = await axios.post<{ visitor: any, isNew: boolean }>(`${API_URL}/widget/init`, {
                clinicId,
                token
            });

            const { visitor } = res.data;
            setVisitorToken(visitor.token);
            setVisitorId(visitor.id);
            localStorage.setItem('mediflow_visitor_token', visitor.token);

            // Connect Socket
            connectSocket(visitor.token, visitor.id);
        } catch (err) {
            console.error('Failed to init widget session', err);
        }
    };

    const connectSocket = (token: string, vId: string) => {
        if (socket) return;

        const newSocket = io(API_URL, {
            query: { visitor_token: token },
            transports: ['websocket']
        });

        newSocket.on('connect', () => {
            setIsConnected(true);
            console.log('Widget connected');
        });

        newSocket.on('newMessage', (msg: Message) => {
            setMessages(prev => [...prev, msg]);
            // Emit delivered immediately
            newSocket.emit('messageDelivered', { messageId: msg.id, conversationId: msg['conversationId'] });
        });

        // Listen for history or other events if needed

        setSocket(newSocket);
    };

    // Mark messages as read when visible
    useEffect(() => {
        if (!visitorToken || !messages.length || !isOpen) return;

        const unreadIds = messages
            .filter(m => m.senderType !== 'VISITOR' && !m.readAt)
            .map(m => m.id);

        if (unreadIds.length > 0) {
            axios.patch(`${API_URL}/widget/messages/read`, {
                token: visitorToken,
                messageIds: unreadIds
            }).then(() => {
                // Update local state to avoids re-triggering
                setMessages(prev => prev.map(msg =>
                    unreadIds.includes(msg.id) ? { ...msg, readAt: new Date().toISOString() } : msg
                ));
            }).catch(err => console.error('Failed to mark read', err));
        }
    }, [messages, isOpen, visitorToken]);

    const sendMessage = (text: string) => {
        if (!socket || !text.trim()) return;

        const payload = {
            text,
            senderType: 'VISITOR',
            visitorId: visitorId,
            conversationId: conversationId // Might be null initially, backend creates new conv or finds active one
            // NOTE: Ideally backend returns the conversationId on first message response to persist it here.
        };

        socket.emit('sendMessage', payload);

        // Optimistic update?
        // setMessages(prev => [...prev, { id: 'temp', content: text, senderType: 'VISITOR', createdAt: new Date().toISOString() }]);
    };

    const toggle = () => setIsOpen(!isOpen);

    return {
        isOpen,
        toggle,
        messages,
        sendMessage,
        isConnected
    };
}
