import type { Metadata } from 'next';
import LoginPageClient from './LoginPageClient';

export const metadata: Metadata = {
    title: 'Login',
    description: 'Sign in to your MediFlow portal securely.',
};

export default function Page() {
    return <LoginPageClient />;
}
