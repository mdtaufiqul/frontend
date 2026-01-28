"use client";

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, PlayCircle, PauseCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import Badge from '@/components/ui/badge';
import api from '@/utils/api';

const TRIGGER_LABELS: Record<string, string> = {
    APPOINTMENT_CREATED: 'Appointment Created',
    APPOINTMENT_COMPLETED: 'Appointment Completed',
    APPOINTMENT_MISSED: 'No-Show (Missed)',
    MEETING_CREATED: 'Meeting Created',
    EMAIL_OPENED: 'Email Opened',
    EMAIL_CLICKED: 'Email Clicked',
    MANUAL: 'Manual'
};

export default function WorkflowsPage() {
    const [workflows, setWorkflows] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);

    const fetchWorkflows = async () => {
        try {
            const res = await api.get('/workflows');
            setWorkflows(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        fetchWorkflows();
    }, []);

    const handleToggle = async (id: string, currentStatus: boolean) => {
        try {
            // Optimistic update
            setWorkflows(prev => prev.map(w => w.id === id ? { ...w, isActive: !currentStatus } : w));

            await api.put(`/workflows/${id}`, { isActive: !currentStatus });
            toast.success(`Workflow ${!currentStatus ? 'activated' : 'paused'}`);
        } catch (error) {
            console.error(error);
            toast.error("Failed to update status");
            fetchWorkflows(); // Revert on error
        }
    };

    const handleDelete = async (id: string) => {
        try {
            // Optimistic update
            setWorkflows(prev => prev.filter(w => w.id !== id));

            // Actually delete from database
            await api.delete(`/workflows/${id}`);
            toast.success("Workflow deleted successfully");
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete workflow");
            // Revert on error
            fetchWorkflows();
        }
    };

    if (loading) return <div className="p-10 text-center">Loading workflows...</div>;

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Workflows</h1>
                    <p className="text-muted-foreground mt-2">Manage your automated patient journeys.</p>
                </div>
                <Link href="/workflows/builder">
                    <Button>
                        <Plus className="mr-2 h-4 w-4" /> Create Workflow
                    </Button>
                </Link>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {workflows.map((workflow) => (
                    <Card key={workflow.id} className="hover:shadow-lg transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-xl font-semibold">{workflow.name}</CardTitle>
                            <Badge variant={workflow.isActive ? 'success' : 'neutral'}>
                                {workflow.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                        </CardHeader>
                        <CardContent>
                            <div className="text-sm text-muted-foreground mt-2">
                                <p>Trigger: <span className="text-slate-900 font-medium">{TRIGGER_LABELS[workflow.triggerType] || workflow.triggerType}</span></p>
                                <p className="mt-1">Target: <span className="font-medium text-slate-700">
                                    {workflow.patientType === 'ALL' ? 'All Patients' :
                                        workflow.patientType === 'NEW' ? 'New Patients' :
                                            'Recurring Patients'}
                                </span></p>
                                <p className="mt-1">Running Instances: {workflow._count?.instances || 0}</p>
                            </div>
                        </CardContent>
                        <CardFooter className="justify-end gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggle(workflow.id, workflow.isActive)}
                                title={workflow.isActive ? "Pause" : "Activate"}
                            >
                                {workflow.isActive ? <PauseCircle className="h-4 w-4 text-orange-500" /> : <PlayCircle className="h-4 w-4 text-green-600" />}
                            </Button>
                            <Link href={`/workflows/builder?id=${workflow.id}`}>
                                <Button variant="outline" size="sm">
                                    <Edit className="mr-2 h-4 w-4" /> Edit
                                </Button>
                            </Link>

                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="sm" className="px-2">
                                        <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Workflow</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Are you sure you want to delete "{workflow.name}"? This action cannot be undone.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDelete(workflow.id)}>
                                            Delete
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </CardFooter>
                    </Card>
                ))}
            </div>

            {workflows.length === 0 && (
                <div className="text-center py-20 bg-muted/20 rounded-xl border border-dashed">
                    <h3 className="text-lg font-medium">No workflows yet</h3>
                    <p className="text-muted-foreground mb-4">Create your first automation flow to engage with patients.</p>
                    <Link href="/workflows/builder">
                        <Button variant="outline">Create Workflow</Button>
                    </Link>
                </div>
            )}
        </div>
    );
}
