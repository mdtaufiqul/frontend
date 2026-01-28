"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog";
import Badge from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { toast } from 'sonner';
import { Loader2, Plus, Pencil, Trash2, Copy, FileText, Code } from 'lucide-react';
import api from '@/utils/api';

interface EmailTemplate {
    id: string;
    name: string;
    category: string;
    subject: string;
    bodyText: string;
    bodyHtml?: string;
    variables: string[];
    updatedAt: string;
}

const VARIABLES = [
    { label: 'Patient Name', value: '{{patient.name}}' },
    { label: 'Doctor Name', value: '{{doctor.name}}' },
    { label: 'Appt Date', value: '{{appointment.date}}' },
    { label: 'Appt Time', value: '{{appointment.time}}' },
    { label: 'Location', value: '{{appointment.location}}' },
    { label: 'Confirm Link', value: '{{appointment.confirm_url}}' },
];

export function EmailTemplateManager() {
    const [templates, setTemplates] = useState<EmailTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        category: 'APPOINTMENT',
        subject: '',
        bodyText: '',
        bodyHtml: ''
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        try {
            setLoading(true);
            const res = await api.get('/email-templates');
            setTemplates(res.data);
        } catch (err) {
            console.error(err);
            toast.error("Failed to load templates");
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = (template?: EmailTemplate) => {
        if (template) {
            setEditingTemplate(template);
            setFormData({
                name: template.name,
                category: template.category,
                subject: template.subject,
                bodyText: template.bodyText,
                bodyHtml: template.bodyHtml || ''
            });
        } else {
            setEditingTemplate(null);
            setFormData({
                name: '',
                category: 'APPOINTMENT',
                subject: '',
                bodyText: '',
                bodyHtml: ''
            });
        }
        setIsDialogOpen(true);
    };

    const handleSave = async () => {
        if (!formData.name || !formData.subject || (!formData.bodyText && !formData.bodyHtml)) {
            toast.error("Please fill in basic fields");
            return;
        }

        setSaving(true);
        try {
            if (editingTemplate) {
                await api.patch(`/email-templates/${editingTemplate.id}`, formData);
                toast.success("Template updated");
            } else {
                await api.post('/email-templates', formData);
                toast.success("Template created");
            }
            setIsDialogOpen(false);
            fetchTemplates();
        } catch (err) {
            console.error(err);
            toast.error("Failed to save template");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this template?")) return;
        try {
            await api.delete(`/email-templates/${id}`);
            toast.success("Template deleted");
            fetchTemplates();
        } catch (err) {
            toast.error("Failed to delete template");
        }
    };

    const insertVariable = (variable: string, field: 'subject' | 'bodyText' | 'bodyHtml') => {
        setFormData(prev => ({
            ...prev,
            [field]: prev[field] + variable
        }));
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Email Templates</CardTitle>
                    <CardDescription>Manage your automated email content.</CardDescription>
                </div>
                <Button onClick={() => handleOpenDialog()}>
                    <Plus className="w-4 h-4 mr-2" /> New Template
                </Button>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex justify-center p-8">
                        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                    </div>
                ) : templates.length === 0 ? (
                    <div className="text-center p-8 border-2 border-dashed rounded-xl">
                        <p className="text-slate-500 mb-4">No templates found.</p>
                        <Button variant="outline" onClick={() => handleOpenDialog()}>Create your first template</Button>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Subject</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {templates.map((t) => (
                                <TableRow key={t.id}>
                                    <TableCell className="font-medium">{t.name}</TableCell>
                                    <TableCell><Badge variant="neutral">{t.category}</Badge></TableCell>
                                    <TableCell className="text-slate-500 truncate max-w-[200px]">{t.subject}</TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(t)}>
                                            <Pencil className="w-4 h-4" />
                                        </Button>
                                        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={() => handleDelete(t.id)}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>

            {/* Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingTemplate ? 'Edit Template' : 'New Template'}</DialogTitle>
                        <DialogDescription>
                            Configure the email content. Use variables for dynamic data.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Template Name</Label>
                                <Input
                                    placeholder="e.g. Appointment Reminder"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Category</Label>
                                <Select
                                    value={formData.category}
                                    onValueChange={v => setFormData({ ...formData, category: v })}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="APPOINTMENT">Appointment</SelectItem>
                                        <SelectItem value="FOLLOW_UP">Follow Up</SelectItem>
                                        <SelectItem value="MARKETING">Marketing</SelectItem>
                                        <SelectItem value="BILLING">Billing</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Subject Line</Label>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Reminder: Your appointment with Dr. {{doctor.name}}"
                                    value={formData.subject}
                                    onChange={e => setFormData({ ...formData, subject: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Variable Helper Chips */}
                        <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-lg border">
                            <span className="text-xs font-bold text-slate-500 uppercase w-full">Insert Variable:</span>
                            {VARIABLES.map(v => (
                                <Badge
                                    key={v.value}
                                    variant="neutral" className="cursor-pointer hover:bg-slate-200"
                                    onClick={() => insertVariable(v.value, 'bodyText')} // Default to bodyText
                                >
                                    {v.label}
                                </Badge>
                            ))}
                        </div>

                        <Tabs defaultValue="text">
                            <TabsList>
                                <TabsTrigger value="text" className="flex gap-2"><FileText className="w-4 h-4" /> Plain Text (Default)</TabsTrigger>
                                <TabsTrigger value="html" className="flex gap-2"><Code className="w-4 h-4" /> HTML (Advanced)</TabsTrigger>
                            </TabsList>
                            <TabsContent value="text" className="space-y-2">
                                <Label>Message Body</Label>
                                <Textarea
                                    className="h-64 font-mono text-sm"
                                    placeholder="Hi {{patient.name}}, ..."
                                    value={formData.bodyText}
                                    onChange={e => setFormData({ ...formData, bodyText: e.target.value })}
                                />
                            </TabsContent>
                            <TabsContent value="html" className="space-y-2">
                                <div className="bg-yellow-50 p-3 rounded text-xs text-yellow-800 border border-yellow-200 mb-2">
                                    HTML is optional. If left empty, Plain Text will be used.
                                </div>
                                <Textarea
                                    className="h-64 font-mono text-sm"
                                    placeholder="<html><body><h1>Hi {{patient.name}}</h1>...</body></html>"
                                    value={formData.bodyHtml}
                                    onChange={e => setFormData({ ...formData, bodyHtml: e.target.value })}
                                />
                            </TabsContent>
                        </Tabs>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={saving}>
                            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : 'Save Template'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
