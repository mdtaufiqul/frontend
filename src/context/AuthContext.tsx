"use client";

import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

// Types (Mirroring backend types for simplicity)
export type Role = 'SYSTEM_ADMIN' | 'CLINIC_ADMIN' | 'DOCTOR' | 'STAFF' | 'MANAGER' | 'patient' | 'SAAS_OWNER';

export interface User {
    id: string;
    name: string;
    email: string;
    role: Role;
    clinicId?: string;
    isOnWaitlist?: boolean;
    image?: string;
    personalSmsNumber?: string;
    permissions?: Record<string, boolean>;
    clinic?: {
        name: string;
        logo?: string;
        timezone?: string;
    };
    timezone?: string;
    memberships?: any[]; // [NEW] Added memberships
    globalRole?: Role; // [NEW] Added globalRole
    activeRoleId?: string; // [NEW] Track which specific profile is active
    profileType?: 'USER' | 'MEMBER' | 'PATIENT'; // [NEW] Track profile type
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (email: string, password: string, role?: string) => Promise<any>;
    logout: () => void;
    requestVerification: (data: { email: string; name: string; password?: string, role: string, timezone?: string }) => Promise<void>;
    verifyCode: (email: string, code: string) => Promise<void>;
    updateUser: (updates: Partial<User>) => void;
    refreshUser: () => Promise<void>;
    isAuthenticated: boolean;
    can: (permission: string) => boolean;
    switchRole: (membershipId: string) => Promise<void>;
    confirmRoleSelection: (tempToken: string, profileId: string, profileType: string) => Promise<void>;
}

import api, { setAuthToken } from '../utils/api';
import { toast } from 'sonner';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Load from localStorage on mount
    // Load from localStorage and refresh on mount
    useEffect(() => {
        const initAuth = async () => {
            const storedToken = localStorage.getItem('auth_token');
            const storedUser = localStorage.getItem('auth_user');

            if (storedToken) {
                setAuthToken(storedToken);
                setToken(storedToken);

                // Optimistically set from storage
                if (storedUser) {
                    try {
                        setUser(JSON.parse(storedUser));
                    } catch (error) {
                        console.error("Failed to parse stored user", error);
                    }
                }

                // Fetch fresh profile
                try {
                    const response = await api.get('/auth/me', {
                        headers: { 'X-Permission-Checked': 'true' }
                    });
                    setUser(response.data);
                    localStorage.setItem('auth_user', JSON.stringify(response.data));
                } catch (error) {
                    console.error("Failed to refresh session", error);
                    // If 401, we might want to clear token, but for now just leave it
                }
            }
            setIsLoading(false);
        };

        initAuth();
    }, []);

    const login = async (email: string, password: string, role?: string) => {
        const response = await api.post('/auth/login', { email, password, role });

        // Multi-role flow: Handle temp token response
        if (response.data.requiresRoleSelection) {
            return response.data; // { requiresRoleSelection: true, tempToken, availableRoles }
        }

        const { token: accessToken, user: newUser } = response.data;

        setToken(accessToken);
        setUser(newUser);
        localStorage.setItem('auth_token', accessToken);
        localStorage.setItem('auth_user', JSON.stringify(newUser));
        setAuthToken(accessToken);
        return response.data;
    };

    const confirmRoleSelection = async (tempToken: string, profileId: string, profileType: string) => {
        const response = await api.post('/auth/select-role', { tempToken, profileId, profileType });
        const { token: accessToken, user: newUser } = response.data;

        setToken(accessToken);
        setUser(newUser);
        localStorage.setItem('auth_token', accessToken);
        localStorage.setItem('auth_user', JSON.stringify(newUser));
        setAuthToken(accessToken);
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        setAuthToken(null);
        window.location.href = '/login';
    };

    const requestVerification = async (data: { email: string, name: string, password?: string, role: string, timezone?: string }) => {
        await api.post('/auth/request-verification', data);
    };

    const verifyCode = async (email: string, code: string) => {
        const response = await api.post('/auth/verify-and-create', { email, code });
        const { token: accessToken, user: newUser } = response.data;

        setToken(accessToken);
        setUser(newUser);
        localStorage.setItem('auth_token', accessToken);
        localStorage.setItem('auth_user', JSON.stringify(newUser));
        setAuthToken(accessToken);
    };

    const updateUser = (updates: Partial<User>) => {
        if (!user) return;
        const updatedUser = { ...user, ...updates };
        setUser(updatedUser);
        localStorage.setItem('auth_user', JSON.stringify(updatedUser));
    };

    const can = (permission: string): boolean => {
        if (!user) return false;
        if (user.role === 'SYSTEM_ADMIN' || user.role === 'SAAS_OWNER') return true;
        return !!user.permissions?.[permission];
    };

    const refreshUser = async () => {
        try {
            const { data } = await api.get('/auth/me');
            setUser(data);
            localStorage.setItem('auth_user', JSON.stringify(data));
        } catch (error) {
            console.error('Failed to refresh user profile', error);
        }
    };

    const switchRole = async (membershipId: string) => {
        console.log('[switchRole] ========== ROLE SWITCH INITIATED ==========');
        console.log('[switchRole] Membership ID:', membershipId);
        console.log('[switchRole] Current user:', user);
        console.log('[switchRole] Current token exists:', !!token);

        try {
            setIsLoading(true);
            console.log('[switchRole] Calling API: POST /auth/switch-role/' + membershipId);

            const { data } = await api.post(`/auth/switch-role/${membershipId}`);

            console.log('[switchRole] ========== API RESPONSE RECEIVED ==========');
            console.log('[switchRole] Response data:', data);
            console.log('[switchRole] New token:', data.token ? 'present (length: ' + data.token.length + ')' : 'MISSING');
            console.log('[switchRole] New user data:', data.user);
            console.log('[switchRole] Profile type:', data.profileType);

            setToken(data.token);
            setUser(data.user);
            localStorage.setItem('auth_token', data.token);
            localStorage.setItem('auth_user', JSON.stringify(data.user));
            setAuthToken(data.token);
            console.log('[switchRole] ========== STATE UPDATED ==========');

            // Dynamic redirect based on role and profile type
            let redirectPath = '/';
            console.log('[switchRole] Determining redirect path...');

            if (data.profileType === 'PATIENT') {
                redirectPath = '/appointments';
                console.log('[switchRole] → PATIENT: redirecting to /appointments');
            } else if (data.user.role === 'SYSTEM_ADMIN' || data.user.role === 'CLINIC_ADMIN') {
                redirectPath = '/clinic';
                console.log('[switchRole] → ADMIN: redirecting to /clinic');
            } else if (data.user.role === 'DOCTOR') {
                redirectPath = '/'; // Or a specific doctor dashboard
                console.log('[switchRole] → DOCTOR: redirecting to /');
            } else if (data.profileType === 'MEMBER') {
                // Member context (secondary clinic role)
                redirectPath = '/clinic';
                console.log('[switchRole] → MEMBER: redirecting to /clinic');
            }
            console.log('[switchRole] Final redirect path:', redirectPath);

            // Force full page reload to clear all state and reinitialize
            console.log('[switchRole] ========== REDIRECTING ==========');
            window.location.href = redirectPath;
        } catch (error: any) {
            console.error('[switchRole] ========== ERROR OCCURRED ==========');
            console.error('[switchRole] Error object:', error);
            console.error('[switchRole] Error message:', error.message);
            console.error('[switchRole] Error response:', error.response?.data);
            console.error('[switchRole] Error status:', error.response?.status);
            toast.error('Failed to switch profile: ' + (error.response?.data?.message || error.message));
        } finally {
            console.log('[switchRole] ========== CLEANUP ==========');
            setIsLoading(false);
        }
    };

    // Prevent hydration mismatch or flash of content by not rendering until checked
    if (isLoading) {
        return null;
    }

    return (
        <AuthContext.Provider value={{
            user,
            token,
            login,
            logout,
            requestVerification,
            verifyCode,
            updateUser,
            refreshUser,
            isAuthenticated: !!user,
            can,
            switchRole,
            confirmRoleSelection
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
