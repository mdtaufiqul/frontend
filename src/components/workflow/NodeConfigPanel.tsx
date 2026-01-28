import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { X, Save, FileText } from 'lucide-react';
import api from '@/utils/api';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from '@/components/ui/dialog';

interface NodeConfigPanelProps {
    selectedNode: any;
    setNodes: React.Dispatch<React.SetStateAction<any[]>>;
    setSelectedNode: (node: any | null) => void;
    connectionStatus?: any;
}

export default function NodeConfigPanel({ selectedNode, setNodes, setSelectedNode, connectionStatus }: NodeConfigPanelProps) {
    const { user } = useAuth();
    const [localData, setLocalData] = useState(selectedNode?.data || {});
    const [templates, setTemplates] = useState<any[]>([]);
    const [showSaveDialog, setShowSaveDialog] = useState(false);
    const [newTemplateName, setNewTemplateName] = useState('');

    useEffect(() => {
        setLocalData(selectedNode?.data || {});
    }, [selectedNode]);

    useEffect(() => {
        // Fetch templates on mount
        const fetchTemplates = async () => {
            try {
                const url = user?.clinicId ? `/email-templates?clinicId=${user.clinicId}` : '/email-templates';
                const res = await api.get(url);
                setTemplates(res.data);
            } catch (err) {
                console.error("Failed to load templates", err);
            }
        };
        fetchTemplates();
    }, []);

    if (!selectedNode) return null;

    const handleChange = (key: string, value: any) => {
        const newData = { ...localData, [key]: value };
        setLocalData(newData);

        // Update the actual node in the flow
        setNodes((nds) =>
            nds.map((node) => {
                if (node.id === selectedNode.id) {
                    return { ...node, data: newData };
                }
                return node;
            })
        );
    };

    const handleApplyTemplate = (templateId: string) => {
        const template = templates.find(t => t.id === templateId);
        if (template) {
            // Apply template content
            handleChange('message', template.bodyHtml || template.bodyText || '');
            handleChange('subject', template.subject || ''); // If we add subject support to node data
            handleChange('templateId', template.id);
        }
    };

    const handleSaveAsTemplate = async () => {
        try {
            if (!newTemplateName) return;

            await api.post('/email-templates', {
                name: newTemplateName,
                subject: localData.subject || 'New Template',
                bodyHtml: localData.message || '',
                category: 'APPOINTMENT'
            });

            // Refresh list
            const res = await api.get('/email-templates');
            setTemplates(res.data);
            setShowSaveDialog(false);
            setNewTemplateName('');
        } catch (error) {
            console.error(error);
            alert("Failed to save template");
        }
    };

    const isSmsConnected = connectionStatus?.isTwilioConfigured;
    const isWhatsappConnected = connectionStatus?.isMetaLinked || connectionStatus?.isQrActive || connectionStatus?.isSystemQrActive;

    return (
        <Card className="w-80 border-l border-y-0 border-r-0 rounded-none h-full shadow-xl bg-background absolute right-0 top-0 bottom-0 z-20 flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between py-4 border-b">
                <CardTitle className="text-base font-semibold">
                    Configure {selectedNode.type === 'action' ? 'Action' : selectedNode.type.charAt(0).toUpperCase() + selectedNode.type.slice(1)}
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setSelectedNode(null)} className="h-8 w-8">
                    <X className="h-4 w-4" />
                </Button>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">

                {/* Common: Label */}
                <div className="space-y-2">
                    <Label htmlFor="label">Label</Label>
                    <Input
                        id="label"
                        value={localData.label || ''}
                        onChange={(e) => handleChange('label', e.target.value)}
                    />
                </div>

                {/* Action Node Config */}
                {selectedNode.type === 'action' && (
                    <>
                        <div className="space-y-2">
                            <Label>Channel</Label>
                            <Select
                                value={localData.actionType || 'email'}
                                onValueChange={(val) => handleChange('actionType', val)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="email">Email</SelectItem>
                                    <SelectItem
                                        value="sms"
                                        disabled={!isSmsConnected}
                                        title={!isSmsConnected ? "Twilio is not configured. Please check your .env settings." : "Send SMS via Twilio"}
                                    >
                                        SMS {!isSmsConnected && "(Not Connected)"}
                                    </SelectItem>
                                    <SelectItem
                                        value="whatsapp"
                                        disabled={!isWhatsappConnected}
                                        title={!isWhatsappConnected ? "WhatsApp is not linked. Go to Settings > Communication to connect." : "Send WhatsApp message"}
                                    >
                                        WhatsApp {!isWhatsappConnected && "(Not Connected)"}
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {localData.actionType === 'email' && (
                            <div className="space-y-2 pb-2 border-b border-border">
                                <Label className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Template</Label>
                                <Select onValueChange={handleApplyTemplate}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Load a template..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {templates.map(t => (
                                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>To</Label>
                            <Select
                                value={localData.to || 'patient'}
                                onValueChange={(val) => handleChange('to', val)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="patient">Patient</SelectItem>
                                    <SelectItem value="doctor">Doctor</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {localData.actionType === 'email' && (
                            <div className="space-y-2">
                                <Label>Subject</Label>
                                <Input
                                    value={localData.subject || ''}
                                    onChange={(e) => handleChange('subject', e.target.value)}
                                    placeholder="Email Subject..."
                                />
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>Message</Label>
                            <Textarea
                                rows={8}
                                value={localData.message || ''}
                                onChange={(e) => handleChange('message', e.target.value)}
                                placeholder="Hi {patientName}, don't forget your appointment..."
                                className="font-mono text-xs"
                            />
                            <div className="flex justify-between items-center">
                                <p className="text-[10px] text-muted-foreground">Variables: {'{patientName}'}, {'{appointmentTime}'}</p>
                                {localData.actionType === 'email' && localData.message && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-6 text-xs"
                                        onClick={() => setShowSaveDialog(true)}
                                    >
                                        <Save className="h-3 w-3 mr-1" /> Save as Template
                                    </Button>
                                )}
                            </div>
                        </div>
                    </>
                )}

                {/* Delay Node Config */}
                {selectedNode.type === 'delay' && (
                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-2">
                            <Label>Duration</Label>
                            <Input
                                type="number"
                                value={localData.duration || 1}
                                onChange={(e) => handleChange('duration', parseInt(e.target.value))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Unit</Label>
                            <Select
                                value={localData.unit || 'minutes'}
                                onValueChange={(val) => handleChange('unit', val)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="minutes">Minutes</SelectItem>
                                    <SelectItem value="hours">Hours</SelectItem>
                                    <SelectItem value="days">Days</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                )}

                {/* Condition Node Config */}
                {selectedNode.type === 'condition' && (
                    <>
                        <div className="space-y-2">
                            <Label>Variable</Label>
                            <Input
                                value={localData.variable || ''}
                                onChange={(e) => handleChange('variable', e.target.value)}
                                placeholder="e.g. status"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Operator</Label>
                            <Select
                                value={localData.operator || 'equals'}
                                onValueChange={(val) => handleChange('operator', val)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="equals">Equals</SelectItem>
                                    <SelectItem value="contains">Contains</SelectItem>
                                    <SelectItem value="greater">Greater Than</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Value</Label>
                            <Input
                                value={localData.value || ''}
                                onChange={(e) => handleChange('value', e.target.value)}
                                placeholder="e.g. confirm"
                            />
                        </div>
                    </>
                )}

            </CardContent>

            <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Save as Template</DialogTitle>
                        <DialogDescription>Save the current content as a reusable email template.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 py-2">
                        <Label>Template Name</Label>
                        <Input
                            value={newTemplateName}
                            onChange={(e) => setNewTemplateName(e.target.value)}
                            placeholder="e.g. Follow-up v2"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowSaveDialog(false)}>Cancel</Button>
                        <Button onClick={handleSaveAsTemplate} disabled={!newTemplateName}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </Card>
    );
}
