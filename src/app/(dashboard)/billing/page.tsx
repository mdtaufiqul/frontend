import type { Metadata } from 'next';
import BillingClient from './BillingClient';

export const metadata: Metadata = {
    title: 'Billing & Invoices',
    description: 'Manage clinic payments, insurance claims, and revenue reports.',
};

export default function Page() {
    return <BillingClient />;
}
