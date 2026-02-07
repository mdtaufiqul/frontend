import type { Metadata } from 'next';
import DashboardClient from './DashboardClient';

export const metadata: Metadata = {
    title: 'Dashboard',
    description: 'View your medical practice overview and daily metrics.',
};

export default function Page() {
    return <DashboardClient />;
}
