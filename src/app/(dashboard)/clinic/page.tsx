import type { Metadata } from 'next';
import ClinicClient from './ClinicClient';

export const metadata: Metadata = {
    title: 'Clinic Administration',
    description: 'Manage clinic identity, staff roles, automated workflows, and billing settings.',
};

export default function Page() {
    return <ClinicClient />;
}
