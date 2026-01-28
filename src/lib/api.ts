
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export const api = {
    intake: {
        getSession: async (token: string) => {
            const res = await fetch(`${API_URL}/intake/session?token=${token}`);
            if (!res.ok) throw new Error('Failed to fetch session');
            return res.json();
        },
        chat: async (token: string, content: string) => {
            const res = await fetch(`${API_URL}/intake/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, content })
            });
            if (!res.ok) throw new Error('Failed to send message');
            return res.json();
        },
        finish: async (token: string) => {
            const res = await fetch(`${API_URL}/intake/finish`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token })
            });
            if (!res.ok) throw new Error('Failed to finish session');
            return res.json();
        }
    }
};

export const apiGet = async (path: string) => {
    const res = await fetch(`${API_URL}${path}`);
    if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'API Error' }));
        throw new Error(error.message || 'API Error');
    }
    return res.json();
};

export const apiPost = async (path: string, data: any) => {
    const res = await fetch(`${API_URL}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'API Error' }));
        throw new Error(error.message || 'API Error');
    }
    return res.json();
};
