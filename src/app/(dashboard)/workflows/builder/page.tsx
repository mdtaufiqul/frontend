"use client";
import React from 'react';
import WorkflowBuilder from '@/components/workflows/WorkflowBuilder';
import { ReactFlowProvider } from 'reactflow';

export default function WorkflowBuilderPage() {
    return (
        <ReactFlowProvider>
            <WorkflowBuilder />
        </ReactFlowProvider>
    );
}
