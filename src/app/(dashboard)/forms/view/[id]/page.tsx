"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import FormRenderer, { FormConfig } from '@/components/forms/FormRenderer';
import api from '@/utils/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const ViewFormPage = () => {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    const [config, setConfig] = useState<FormConfig | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchForm = async () => {
            try {
                const response = await api.get(`/forms/${id}`);
                const fetchedConfig = response.data.config || { title: response.data.title, steps: [] };
                fetchedConfig.title = response.data.title; // Sync title
                setConfig(fetchedConfig);
            } catch (error) {
                console.error("Failed to load form:", error);
                toast.error("Could not load form");
            } finally {
                setIsLoading(false);
            }
        };

        if (id) fetchForm();
    }, [id]);

    const handleSubmit = async (data: Record<string, any>) => {
        try {
            console.log("Form Data Submitted:", data);
            // In a real app, you would POST this to /submissions or similar
            // await api.post(`/forms/${id}/submissions`, data);

            toast.success("This is a preview. Form submission is valid!");
        } catch (error) {
            console.error(error);
            toast.error("Submission failed");
        }
    };

    if (isLoading) return <div className="p-8 flex justify-center text-slate-500">Loading form...</div>;
    if (!config) return <div className="p-8 text-center text-red-500">Form not found</div>;

    return (
        <div className="max-w-3xl mx-auto py-8 px-4">
            <div className="mb-6">
                <Button variant="ghost" className="pl-0 hover:pl-2 transition-all text-slate-500" onClick={() => router.back()}>
                    <ArrowLeft size={16} className="mr-2" /> Back
                </Button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-8 border-b border-slate-100 bg-slate-50/50">
                    <h1 className="text-2xl font-bold text-slate-900">{config.title}</h1>
                    <p className="text-slate-500 mt-1">Please fill out the information below.</p>
                </div>
                <div className="p-8">
                    <FormRenderer config={config} onSubmit={handleSubmit} />
                </div>
            </div>
        </div>
    );
};

export default ViewFormPage;
