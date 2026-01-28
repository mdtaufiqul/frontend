"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit, Trash2, Mail, Info, Save, X } from 'lucide-react';
import api from '@/utils/api';
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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from '@/components/ui/dialog';
import Badge from '@/components/ui/badge';

interface EmailTemplate {
    id: string;
    name: string;
    description?: string;
    subject: string;
    bodyHtml: string;
    bodyText?: string;
    category: string;
    variables?: string[];
    createdAt: string;
}

const AVAILABLE_VARIABLES = [
    { label: 'Patient Name', value: '{{patientName}}' },
    { label: 'Appointment Date', value: '{{appointmentDate}}' },
    { label: 'Appointment Time', value: '{{appointmentTime}}' },
    { label: 'Doctor Name', value: '{{doctorName}}' },
    { label: 'Clinic Name', value: '{{clinicName}}' },
    { label: 'Service Name', value: '{{serviceName}}' },
    { label: 'Meeting Link', value: '{{meetingLink}}' },
];

export default function EmailTemplatesPage() {
    const { user } = useAuth();
    const [templates, setTemplates] = useState<EmailTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        subject: '',
        bodyHtml: '',
        category: 'APPOINTMENT'
    });

    const fetchTemplates = async () => {
        try {
            const url = user?.clinicId ? `/email-templates?clinicId=${user.clinicId}` : '/email-templates';
            const res = await api.get(url);
            setTemplates(res.data);
        } catch (error: any) {
            console.error('Failed to fetch templates:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTemplates();
    }, []);

    const handleOpenDialog = (template?: EmailTemplate) => {
        if (template) {
            setEditingTemplate(template);
            setFormData({
                name: template.name,
                subject: template.subject,
                bodyHtml: template.bodyHtml || template.bodyText || '',
                category: template.category || 'APPOINTMENT'
            });
        } else {
            setEditingTemplate(null);
            setFormData({
                name: '',
                subject: '',
                bodyHtml: '',
                category: 'APPOINTMENT'
            });
        }
        setIsDialogOpen(true);
    };

    const handleSave = async () => {
        try {
            const payload = {
                ...formData,
                bodyText: formData.bodyHtml.replace(/<[^>]*>/g, ''), // Simple strip tags
                bodyHasHtml: true,
                variables: AVAILABLE_VARIABLES.map(v => v.value).filter(v => formData.bodyHtml.includes(v))
            };

            if (editingTemplate) {
                await api.patch(`/email-templates/${editingTemplate.id}`, payload);
            } else {
                await api.post('/email-templates', payload);
            }

            setIsDialogOpen(false);
            fetchTemplates();
        } catch (error: any) {
            console.error('Failed to save template:', error);
            alert('Failed to save template');
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await api.delete(`/email-templates/${id}`);
            setTemplates(prev => prev.filter(t => t.id !== id));
        } catch (error: any) {
            console.error('Failed to delete template:', error);
        }
    };

    const insertVariable = (variable: string) => {
        setFormData(prev => ({
            ...prev,
            bodyHtml: prev.bodyHtml + variable
        }));
    };

    if (loading) return <div className="p-10 text-center">Loading templates...</div>;

    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Email Templates</h1>
                    <p className="text-slate-500 mt-2">Manage reusable email content for your automated workflows.</p>
                </div>
                <Button onClick={() => handleOpenDialog()}>
                    <Plus className="mr-2 h-4 w-4" /> Create Template
                </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {templates.map((template) => (
                    <Card key={template.id} className="hover:shadow-md transition-shadow group">
                        <CardHeader className="pb-3">
                            <div className="flex justify-between items-start">
                                <Badge variant="neutral" className="mb-2">{template.category}</Badge>
                            </div>
                            <CardTitle className="text-xl font-bold text-slate-800">{template.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 pb-3">
                            <div className="text-sm font-medium text-slate-600 truncate">
                                <span className="text-slate-400 mr-2">Subject:</span>
                                {template.subject}
                            </div>
                            <div className="h-20 bg-slate-50 rounded-md p-3 text-xs text-slate-500 overflow-hidden relative">
                                {template.bodyHtml.replace(/<[^>]*>/g, ' ')}
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-50 to-transparent pointer-events-none"></div>
                            </div>
                        </CardContent>
                        <CardFooter className="justify-end gap-2 pt-0">
                            <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(template)}>
                                <Edit className="h-4 w-4 text-slate-500" />
                            </Button>

                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                        <Trash2 className="h-4 w-4 text-red-400" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Template?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Are you sure you want to delete "{template.name}"? This requires removing it from any active workflows first.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDelete(template.id)} className="bg-red-600 hover:bg-red-700">
                                            Delete
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </CardFooter>
                    </Card>
                ))}
            </div>

            {/* Edit/Create Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingTemplate ? 'Edit Template' : 'New Template'}</DialogTitle>
                        <DialogDescription>
                            Create standard messages to be used in workflows.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Template Name</Label>
                                <Input
                                    placeholder="e.g., Appointment Confirmation"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Category</Label>
                                <select
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                                    value={formData.category}
                                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                                >
                                    <option value="APPOINTMENT">Appointment</option>
                                    <option value="FOLLOW_UP">Follow-up</option>
                                    <option value="MARKETING">Marketing</option>
                                    <option value="Billing">Billing</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Email Subject</Label>
                            <Input
                                placeholder="Subject line..."
                                value={formData.subject}
                                onChange={e => setFormData({ ...formData, subject: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <Label>Content (HTML supported)</Label>
                                <div className="text-xs text-slate-500">
                                    Click to insert:
                                    {AVAILABLE_VARIABLES.slice(0, 3).map(v => (
                                        <button
                                            key={v.value}
                                            onClick={() => insertVariable(v.value)}
                                            className="ml-2 text-primary-600 hover:underline bg-primary-50 px-1 rounded"
                                        >
                                            {v.label}
                                        </button>
                                    ))}
                                    <span className="ml-1 text-slate-400">...</span>
                                </div>
                            </div>
                            <Textarea
                                className="min-h-[200px] font-mono text-sm"
                                placeholder="<html><body>Hello {{patientName}}...</body></html>"
                                value={formData.bodyHtml}
                                onChange={e => setFormData({ ...formData, bodyHtml: e.target.value })}
                            />
                            <div className="flex flex-wrap gap-2 mt-2">
                                {AVAILABLE_VARIABLES.map(v => (
                                    <Badge
                                        key={v.value}
                                        variant="neutral"
                                        className="cursor-pointer hover:bg-slate-100"
                                        onClick={() => insertVariable(v.value)}
                                    >
                                        {v.label}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={!formData.name || !formData.subject}>Save Template</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
