import type { Metadata } from 'next';
import AnalyticsClient from './AnalyticsClient';

export const metadata: Metadata = {
    title: 'Clinic Intelligence',
    description: 'Real-time clinical insights, reporting, and practice analytics.',
};

export default function Page() {
    return <AnalyticsClient />;
}
