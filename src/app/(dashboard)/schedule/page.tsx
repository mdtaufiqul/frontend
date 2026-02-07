import type { Metadata } from 'next';
import ScheduleClient from './ScheduleClient';

export const metadata: Metadata = {
    title: 'Schedule',
    description: 'Manage clinical appointments, sessions, and practitioner availability.',
};

export default function Page() {
    return <ScheduleClient />;
}
