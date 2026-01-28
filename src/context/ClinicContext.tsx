"use client";

import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

// Types
export interface WaitingPatient {
    id: string;
    name: string;
    joinedAt: Date;
    status: 'waiting' | 'admitted' | 'rejected';
}

export interface Invoice {
    id: string;
    patientName: string;
    date: string;
    amount: number;
    status: 'paid' | 'pending' | 'overdue';
}

interface ClinicContextType {
    waitingQueue: WaitingPatient[];
    invoices: Invoice[];
    addPatientToQueue: (name: string) => void;
    admitPatient: (id: string) => void;
    removePatient: (id: string) => void;
    addInvoice: (invoice: Omit<Invoice, 'id'>) => void;
}

const ClinicContext = createContext<ClinicContextType | undefined>(undefined);

export const ClinicProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // --- Waiting Room State ---
    // We initialize with localStorage to try and sync across tabs if possible, 
    // though simple state is enough for single-window demo.
    const [waitingQueue, setWaitingQueue] = useState<WaitingPatient[]>([]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('mediflow_waiting_queue');
            if (saved) {
                setWaitingQueue(JSON.parse(saved));
            }
        }
    }, []);

    // --- Billing State ---
    const [invoices, setInvoices] = useState<Invoice[]>(() => {
        // Initial Mock Data
        return [
            { id: 'INV-001', patientName: 'Sarah Connor', date: '2025-10-24', amount: 150.00, status: 'paid' },
            { id: 'INV-002', patientName: 'John Smith', date: '2025-10-25', amount: 85.50, status: 'pending' },
            { id: 'INV-003', patientName: 'Emily Doe', date: '2025-10-26', amount: 200.00, status: 'overdue' },
        ];
    });

    // Sync to localStorage for multi-tab "real-time" feel
    useEffect(() => {
        localStorage.setItem('mediflow_waiting_queue', JSON.stringify(waitingQueue));
    }, [waitingQueue]);

    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'mediflow_waiting_queue' && e.newValue) {
                setWaitingQueue(JSON.parse(e.newValue));
            }
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    const addPatientToQueue = (name: string) => {
        const newPatient: WaitingPatient = {
            id: Math.random().toString(36).substr(2, 9),
            name,
            joinedAt: new Date(),
            status: 'waiting'
        };
        setWaitingQueue(prev => [...prev, newPatient]);
    };

    const admitPatient = (id: string) => {
        setWaitingQueue(prev => prev.map(p =>
            p.id === id ? { ...p, status: 'admitted' } : p
        ));
    };

    const removePatient = (id: string) => {
        setWaitingQueue(prev => prev.filter(p => p.id !== id));
    };

    const addInvoice = (invoice: Omit<Invoice, 'id'>) => {
        const newInvoice = {
            ...invoice,
            id: `INV-${Math.floor(Math.random() * 1000)}`
        };
        setInvoices(prev => [newInvoice, ...prev]);
    };

    return (
        <ClinicContext.Provider value={{
            waitingQueue,
            invoices,
            addPatientToQueue,
            admitPatient,
            removePatient,
            addInvoice
        }}>
            {children}
        </ClinicContext.Provider>
    );
};

export const useClinic = () => {
    const context = useContext(ClinicContext);
    if (context === undefined) {
        throw new Error('useClinic must be used within a ClinicProvider');
    }
    return context;
};
