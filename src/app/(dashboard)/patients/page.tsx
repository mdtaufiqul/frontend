import type { Metadata } from 'next';
import PatientsClient from './PatientsClient';

export const metadata: Metadata = {
    title: 'Patients',
    description: 'Manage your patient directory, medical histories, and clinical records.',
};

export default function Page() {
    return <PatientsClient />;
}
