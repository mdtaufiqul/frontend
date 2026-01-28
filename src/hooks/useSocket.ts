import { useEffect } from 'react';
import io from 'socket.io-client';

import { getApiBaseUrl } from '@/utils/api';

// Connect to the backend server where the WebSocket gateway is running
// Use NEXT_PUBLIC_API_URL if set, otherwise default to backend port 3001
const SOCKET_URL = getApiBaseUrl();

export const socket = io(SOCKET_URL, {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    autoConnect: true,
});

export const useSocket = () => {
    return socket;
};
