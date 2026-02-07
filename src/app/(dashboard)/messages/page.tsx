import type { Metadata } from 'next';
import MessagesClient from './MessagesClient';

export const metadata: Metadata = {
    title: 'Messages',
    description: 'Secure clinical messaging with patients and visitors.',
};

export default function Page() {
    return <MessagesClient />;
}
