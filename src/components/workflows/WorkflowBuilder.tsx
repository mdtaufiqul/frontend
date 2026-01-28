import React, { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import ReactFlow, {
    addEdge,
    MiniMap,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    Connection,
    Edge,
    Node,
    Handle,
    Position
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Save, Plus, Play, Loader2, Workflow as WorkflowIcon, Clock } from 'lucide-react';
import api from '@/utils/api';
import { toast } from 'sonner';

// --- Types ---
interface EmailTemplate {
    id: string;
    name: string;
}

// --- Custom Nodes ---

// Trigger Node
const TriggerNode = ({ data, isConnectable }: any) => {
    return (
        <div className="bg-white rounded-xl border-2 border-slate-200 shadow-sm min-w-[280px] overflow-hidden">
            <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 flex items-center gap-2">
                <Play size={16} className="text-primary-600" />
                <span className="font-semibold text-sm text-slate-700">Trigger</span>
            </div>
            <div className="p-4 space-y-3">
                <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Event</Label>
                    <Select
                        value={data.triggerType}
                        onValueChange={(val) => data.onChange({ ...data, triggerType: val })}
                    >
                        <SelectTrigger className="h-8">
                            <SelectValue placeholder="Select Event" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="APPOINTMENT_CREATED">Appointment Created</SelectItem>
                            <SelectItem value="APPOINTMENT_COMPLETED">Appointment Completed</SelectItem>
                            <SelectItem value="APPOINTMENT_MISSED">No-Show (Missed)</SelectItem>
                            <SelectItem value="MEETING_CREATED">Meeting Created</SelectItem>
                            <SelectItem value="EMAIL_OPENED">Email Opened</SelectItem>
                            <SelectItem value="EMAIL_CLICKED">Email Clicked</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Time Condition</Label>
                    <Select
                        value={data.timingDirection || 'IMMEDIATE'}
                        onValueChange={(val) => data.onChange({ ...data, timingDirection: val })}
                    >
                        <SelectTrigger className="h-8">
                            <SelectValue placeholder="When to run?" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="IMMEDIATE">Immediately</SelectItem>
                            <SelectItem value="BEFORE">Before Appointment</SelectItem>
                            <SelectItem value="AFTER">After Appointment</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {data.timingDirection && data.timingDirection !== 'IMMEDIATE' && (
                    <div className="grid grid-cols-2 gap-2 animate-in fade-in slide-in-from-top-2">
                        <div className="space-y-1">
                            <Label className="text-xs text-slate-500">Value</Label>
                            <Input
                                type="number"
                                min="1"
                                className="h-8"
                                value={data.timingValue || ''}
                                onChange={(e) => data.onChange({ ...data, timingValue: parseInt(e.target.value) })}
                                placeholder="e.g. 24"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs text-slate-500">Unit</Label>
                            <Select
                                value={data.timingUnit || 'HOURS'}
                                onValueChange={(val) => data.onChange({ ...data, timingUnit: val })}
                            >
                                <SelectTrigger className="h-8">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="MINUTES">Minutes</SelectItem>
                                    <SelectItem value="HOURS">Hours</SelectItem>
                                    <SelectItem value="DAYS">Days</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                )}
            </div>
            <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} className="w-3 h-3 bg-primary-500" />
        </div>
    );
};

// Action Node
const ActionNode = ({ data, isConnectable }: any) => {
    return (
        <div className="bg-white rounded-xl border-2 border-blue-200 shadow-sm min-w-[280px] overflow-hidden">
            <Handle type="target" position={Position.Top} isConnectable={isConnectable} className="w-3 h-3 bg-blue-500" />
            <div className="bg-blue-50 px-4 py-2 border-b border-blue-100 flex items-center gap-2">
                <WorkflowIcon size={16} className="text-blue-600" />
                <span className="font-semibold text-sm text-blue-900">Action</span>
            </div>
            <div className="p-4 space-y-3">
                <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Action Type</Label>
                    <Select
                        value={data.actionType}
                        onValueChange={(val) => data.onChange({ ...data, actionType: val })}
                    >
                        <SelectTrigger className="h-8">
                            <SelectValue placeholder="Select Action" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="EMAIL">Send Email</SelectItem>
                            <SelectItem value="SMS">Send SMS</SelectItem>
                            {/* <SelectItem value="WHATSAPP">Send WhatsApp</SelectItem> */}
                        </SelectContent>
                    </Select>
                </div>

                {data.actionType === 'EMAIL' && (
                    <div className="space-y-1 animate-in fade-in slide-in-from-top-2 duration-200">
                        <Label className="text-xs text-slate-500">Email Template</Label>
                        <Select
                            value={data.templateId}
                            onValueChange={(val) => data.onChange({ ...data, templateId: val })}
                        >
                            <SelectTrigger className="h-8">
                                <SelectValue placeholder="Select Template" />
                            </SelectTrigger>
                            <SelectContent>
                                {data.templates?.map((t: EmailTemplate) => (
                                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-[10px] text-slate-400">
                            Select a template from your library.
                        </p>
                    </div>
                )}
            </div>
            <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} className="w-3 h-3 bg-blue-500" />
        </div>
    );
};

const DelayNode = ({ data, isConnectable }: any) => {
    return (
        <div className="bg-white rounded-xl border-2 border-slate-200 shadow-sm min-w-[280px] overflow-hidden">
            <Handle type="target" position={Position.Top} isConnectable={isConnectable} className="w-3 h-3 bg-slate-400" />
            <div className="bg-amber-50 px-4 py-2 border-b border-amber-100 flex items-center gap-2">
                <Clock size={16} className="text-amber-600" />
                <span className="font-semibold text-sm text-slate-700">Delay</span>
            </div>
            <div className="p-4 space-y-3">
                <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Wait Mode</Label>
                    <Select
                        value={data.delayMode || 'FIXED'}
                        onValueChange={(val) => data.onChange({ ...data, delayMode: val })}
                    >
                        <SelectTrigger className="h-8">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="FIXED">Wait For (Duration)</SelectItem>
                            <SelectItem value="UNTIL_BEFORE">Wait Until Before Appt</SelectItem>
                            <SelectItem value="UNTIL_AFTER">Wait Until After Appt</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                        <Label className="text-xs text-slate-500">Value</Label>
                        <Input
                            type="number"
                            min="1"
                            className="h-8"
                            value={data.delayValue || ''}
                            onChange={(e) => data.onChange({ ...data, delayValue: parseInt(e.target.value) })}
                            placeholder="e.g. 24"
                        />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs text-slate-500">Unit</Label>
                        <Select
                            value={data.delayUnit || 'HOURS'}
                            onValueChange={(val) => data.onChange({ ...data, delayUnit: val })}
                        >
                            <SelectTrigger className="h-8">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="MINUTES">Minutes</SelectItem>
                                <SelectItem value="HOURS">Hours</SelectItem>
                                <SelectItem value="DAYS">Days</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>
            <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} className="w-3 h-3 bg-amber-500" />
        </div>
    );
};

const nodeTypes = {
    trigger: TriggerNode,
    action: ActionNode,
    delay: DelayNode,
};

// --- Main Component ---

const initialNodes: Node[] = [
    {
        id: '1',
        type: 'trigger',
        position: { x: 250, y: 5 },
        data: { triggerType: 'APPOINTMENT_CREATED', timeCondition: 'IMMEDIATE' }
    },
];

export default function WorkflowBuilder({ workflowId: propId, onSaveComplete }: { workflowId?: string, onSaveComplete?: () => void }) {
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const workflowId = propId || searchParams?.get('id');

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [templates, setTemplates] = useState<EmailTemplate[]>([]);
    const [forms, setForms] = useState<any[]>([]);
    const [workflowName, setWorkflowName] = useState('New Workflow');
    const [patientType, setPatientType] = useState<'ALL' | 'NEW' | 'RECURRING'>('ALL');
    const [formId, setFormId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Load existing workflow if ID is present
    useEffect(() => {
        const loadWorkflow = async () => {
            if (!workflowId) {
                setLoading(false);
                return;
            }

            try {
                const res = await api.get(`/workflows/${workflowId}`);
                const workflow = res.data;

                setWorkflowName(workflow.name);
                setPatientType(workflow.patientType || 'ALL');
                setFormId(workflow.formId || null);

                // Parse nodes and edges (they might be JSON strings)
                const loadedNodes = typeof workflow.nodes === 'string'
                    ? JSON.parse(workflow.nodes)
                    : workflow.nodes;
                const loadedEdges = typeof workflow.edges === 'string'
                    ? JSON.parse(workflow.edges)
                    : workflow.edges;

                setNodes(loadedNodes || initialNodes);
                setEdges(loadedEdges || []);
            } catch (error) {
                console.error('Failed to load workflow:', error);
                toast.error('Could not load workflow');
            } finally {
                setLoading(false);
            }
        };

        fetchTemplates();
        fetchForms();
        loadWorkflow();
    }, [workflowId]);

    const fetchForms = async () => {
        try {
            console.log('Fetching forms...');
            const res = await api.get('/forms');
            console.log('Forms received:', res.data);
            setForms(res.data);
        } catch (err) {
            console.error('Failed to load forms', err);
        }
    };

    // Update node data with templates when fetched
    useEffect(() => {
        setNodes((nds) =>
            nds.map((node) => {
                if (node.type === 'action') {
                    return {
                        ...node,
                        data: {
                            ...node.data,
                            templates: templates,
                        },
                    };
                }
                return node;
            })
        );
    }, [templates, setNodes]);

    const fetchTemplates = async () => {
        try {
            const url = user?.clinicId ? `/email-templates?clinicId=${user.clinicId}` : '/email-templates';
            const res = await api.get(url);
            setTemplates(res.data);
        } catch (err) {
            console.error('Failed to load templates', err);
            toast.error('Could not load email templates');
        } finally {
            setLoading(false);
        }
    };

    const onConnect = useCallback((params: Edge | Connection) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

    // Handle Node Data Changes
    const onNodeDataChange = useCallback((id: string, newData: any) => {
        setNodes((nds) =>
            nds.map((node) => {
                if (node.id === id) {
                    return { ...node, data: { ...newData, templates } };
                }
                return node;
            })
        );
    }, [setNodes, templates]);

    // Inject onChange handler to nodes
    useEffect(() => {
        setNodes((nds) =>
            nds.map((node) => ({
                ...node,
                data: {
                    ...node.data,
                    onChange: (newData: any) => onNodeDataChange(node.id, newData),
                    templates // Ensure templates are available
                },
            }))
        );
    }, [onNodeDataChange, setNodes, templates]);

    const addActionNode = () => {
        const id = `${nodes.length + 1}`;
        const lastNode = nodes[nodes.length - 1];
        const newNode: Node = {
            id,
            type: 'action',
            position: { x: lastNode ? lastNode.position.x : 250, y: lastNode ? lastNode.position.y + 150 : 150 },
            data: { actionType: 'EMAIL', templateId: '', templates, onChange: (d: any) => onNodeDataChange(id, d) },
        };
        setNodes((nds) => [...nds, newNode]);
        if (lastNode) setEdges((eds) => addEdge({ id: `e${lastNode.id}-${id}`, source: lastNode.id, target: id }, eds));
    };

    const addDelayNode = () => {
        const id = `${nodes.length + 1}`;
        const lastNode = nodes[nodes.length - 1];
        const newNode: Node = {
            id,
            type: 'delay',
            position: { x: lastNode ? lastNode.position.x : 250, y: lastNode ? lastNode.position.y + 150 : 150 },
            data: { delayMode: 'FIXED', delayValue: 1, delayUnit: 'HOURS', onChange: (d: any) => onNodeDataChange(id, d) },
        };
        setNodes((nds) => [...nds, newNode]);
        if (lastNode) setEdges((eds) => addEdge({ id: `e${lastNode.id}-${id}`, source: lastNode.id, target: id }, eds));
    };

    const handleSave = async () => {
        if (!workflowName) return toast.error("Please name your workflow");

        setSaving(true);
        // Sanitize nodes
        const cleanNodes = nodes.map(node => ({
            ...node,
            data: { ...node.data, templates: undefined, onChange: undefined }
        }));

        // Transform nodes to backend steps
        const sortedNodes = [...nodes].sort((a, b) => a.position.y - b.position.y);
        const steps = sortedNodes
            .filter(n => n.type !== 'trigger') // Exclude trigger
            .map((node, index) => {
                if (node.type === 'action') {
                    return {
                        type: 'ACTION',
                        channel: node.data.actionType, // EMAIL, SMS
                        templateId: node.data.templateId,
                        order: index
                    };
                } else if (node.type === 'delay') {
                    // Convert to minutes based on unit
                    let minutes = node.data.delayValue || 0;
                    if (node.data.delayUnit === 'HOURS') minutes *= 60;
                    if (node.data.delayUnit === 'DAYS') minutes *= 1440;

                    return {
                        type: 'DELAY',
                        delayMinutes: minutes,
                        order: index
                    };
                }
                return null;
            })
            .filter(Boolean);

        const workflowData = {
            name: workflowName,
            patientType,
            formId,
            nodes: cleanNodes,
            edges,
            triggerType: nodes.find(n => n.type === 'trigger')?.data?.triggerType || 'MANUAL',
            isActive: true,
            steps // Include the mapped steps
        };

        try {
            if (workflowId) {
                // Update existing workflow
                await api.put(`/workflows/${workflowId}`, workflowData);
                toast.success("Workflow updated successfully");
            } else {
                // Create new workflow
                await api.post('/workflows', workflowData);
                toast.success("Workflow saved successfully");
            }
            if (onSaveComplete) onSaveComplete();
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.message || "Failed to save workflow");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-slate-400" /></div>;

    return (
        <div className="h-[calc(100vh-100px)] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b bg-white border-slate-100">
                <div className="flex items-center gap-4">
                    <Input
                        value={workflowName}
                        onChange={e => setWorkflowName(e.target.value)}
                        className="font-bold text-lg border-transparent hover:border-slate-200 focus:border-primary-500 w-[300px]"
                    />
                    <div className="flex items-center gap-2">
                        <Label className="text-sm text-slate-600">Target:</Label>
                        <Select value={patientType} onValueChange={(val: any) => setPatientType(val)}>
                            <SelectTrigger className="w-[180px] h-9">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All</SelectItem>
                                <SelectItem value="NEW">New Patients Only</SelectItem>
                                <SelectItem value="RECURRING">Recurring Only</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center gap-2">
                        <Label className="text-sm text-slate-600">Form:</Label>
                        <Select value={formId || 'all'} onValueChange={(val) => setFormId(val === 'all' ? null : val)}>
                            <SelectTrigger className="w-[200px] h-9">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                {forms.map(form => (
                                    <SelectItem key={form.id} value={form.id}>{form.title}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={addDelayNode}>
                        <Clock className="w-4 h-4 mr-2" /> Add Delay
                    </Button>
                    <Button variant="outline" onClick={addActionNode}>
                        <Plus className="w-4 h-4 mr-2" /> Add Action
                    </Button>
                    <Button onClick={handleSave} disabled={saving}>
                        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                        Save Workflow
                    </Button>
                </div>
            </div>

            <div className="flex-1 bg-slate-50">
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    nodeTypes={nodeTypes}
                    fitView
                >
                    <Background />
                    <Controls />
                    <MiniMap />
                </ReactFlow>
            </div>
        </div>
    );
}
