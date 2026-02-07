import type { Metadata } from 'next';
import AppointmentsClient from './AppointmentsClient';

export const metadata: Metadata = {
    title: 'Appointments',
    description: 'Manage your clinical appointments, consultations, and schedule.',
};

export default function Page() {
    return <AppointmentsClient />;
}
