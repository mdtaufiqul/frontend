'use client';

import { useSearchParams } from 'next/navigation';
import { ChatWidget } from '@/components/widget/ChatWidget';
import React, { Suspense } from 'react';

function ChatWidgetContent() {
    const searchParams = useSearchParams();
    const clinicId = searchParams.get('clinicId');
    const color = searchParams.get('color') || '#2563EB';
    const title = searchParams.get('title') || 'Support';

    if (!clinicId) {
        return null; // Or show error
    }

    return (
        <div className="h-screen w-screen bg-transparent">
            {/* 
                We use a transparent full-screen div because:
                1. If embedded as an overlay iframe (e.g. fixed position), we want the toggle button to be visible.
                2. But standard practice for iframes is usually just the size of the widget OR full page overlay with click-through.
                
                For this MVP, we assume the parent site scripts an iframe that resizes or is fixed position.
                Actually, simpler approach: The iframe is small (just the button) until opened? 
                
                No, standard is: Iframe is fixed full viewport, but usually has pointer-events: none on container and pointer-events: auto on content.
             */}

            <style jsx global>{`
                body {
                    background: transparent !important;
                }
             `}</style>

            <ChatWidget
                clinicId={clinicId}
                primaryColor={color}
                title={title}
            />
        </div>
    );
}

export default function ChatWidgetPage() {
    return (
        <Suspense fallback={null}>
            <ChatWidgetContent />
        </Suspense>
    );
}
