"use client";

import React, { useState } from 'react';
import {
    Zap,
    MessageSquare,
    Mail,
    Clock,
    Plus,
    Trash2,
    MoveRight,
    Play,
    Save,
    Sparkles,
    Phone,
    CheckCircle2,
    GitFork,
    Bot,
    AlertTriangle,
    XCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Badge from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import api from '@/utils/api';

type NodeType = 'trigger' | 'sms' | 'email' | 'whatsapp' | 'delay' | 'condition' | 'clock';

// Tree-based Node Structure
interface FlowNode {
    id: string;
    type: NodeType;
    title: string;
    description: string;
    config?: any;
    children?: FlowNode[]; // Linear children
    branches?: {           // For 'condition' type
        truePath: FlowNode[];
        falsePath: FlowNode[];
    };
}

const AutomationBuilder: React.FC = () => {
    const [isEnabled, setIsEnabled] = useState(true);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [activeEditPath, setActiveEditPath] = useState<string>('main'); // Track where we are adding nodes

    // Helper: Find node by ID in tree (Recursive)
    const findNode = (nodes: FlowNode[], id: string): FlowNode | null => {
        for (const node of nodes) {
            if (node.id === id) return node;
            if (node.children) {
                const found = findNode(node.children, id);
                if (found) return found;
            }
            if (node.branches) {
                const foundTrue = findNode(node.branches.truePath, id);
                if (foundTrue) return foundTrue;
                const foundFalse = findNode(node.branches.falsePath, id);
                if (foundFalse) return foundFalse;
            }
        }
        return null;
    };

    // Helper: Delete node from tree (Recursive)
    const deleteNode = (nodes: FlowNode[], id: string): FlowNode[] => {
        return nodes.filter(node => {
            if (node.id === id) return false;
            if (node.children) node.children = deleteNode(node.children, id);
            if (node.branches) {
                node.branches.truePath = deleteNode(node.branches.truePath, id);
                node.branches.falsePath = deleteNode(node.branches.falsePath, id);
            }
            return true;
        });
    };

    const [workflowId, setWorkflowId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [audience, setAudience] = useState<string>('ALL'); // 'ALL', 'NEW', 'RETURNING'

    // Initial State: Advanced Tree
    const [flowTree, setFlowTree] = useState<FlowNode[]>([]);

    React.useEffect(() => {
        fetchWorkflow();
    }, [audience]);

    const fetchWorkflow = async () => {
        try {
            setIsLoading(true);
            const res = await api.get('/workflows');
            // Find APPOINTMENT_CREATED workflow matching audience
            // If specific audience missing, do NOT fallback to ALL here, as we want to create a new one for that audience
            const workflow = res.data.find((w: any) =>
                w.triggerType === 'APPOINTMENT_CREATED' && w.audience === audience
            );

            if (workflow) {
                setWorkflowId(workflow.id);
                if (workflow.definition && Array.isArray(workflow.definition) && workflow.definition.length > 0) {
                    setFlowTree(workflow.definition);
                } else {
                    loadSafetyNetTemplate();
                }
            } else {
                // No workflow for this audience yet. 
                // Reset ID to null so Save creates a new one.
                setWorkflowId(null);
                loadSafetyNetTemplate();
            }
        } catch (err) {
            console.error('Failed to fetch workflows', err);
            loadSafetyNetTemplate();
        } finally {
            setIsLoading(false);
        }
    };

    const createDefaultWorkflow = async () => {
        try {
            const template = getSafetyNetTemplate();
            setFlowTree(template);
            const { steps } = flattenTreeToSteps(template);
            const res = await api.post('/workflows', {
                name: `${audience === 'ALL' ? 'Default' : audience === 'NEW' ? 'New Patient' : 'Returning Patient'} Automation`,
                triggerType: 'APPOINTMENT_CREATED',
                audience: audience,
                definition: template,
                steps
            });
            setWorkflowId(res.data.id);
        } catch (e) {
            console.error("Failed to create default workflow", e);
        }
    };

    const flattenTreeToSteps = (nodes: FlowNode[]) => {
        const steps: any[] = [];
        let order = 0;

        const traverse = (nodeList: FlowNode[]) => {
            for (const node of nodeList) {
                if (node.type !== 'trigger' && node.type !== 'condition') {
                    steps.push({
                        type: node.type.toUpperCase(),
                        config: { ...node.config, body: node.config?.message },
                        order: order++
                    });
                }
                // Recurse children
                if (node.children) traverse(node.children);

                // Note: Branches are skipped in linear execution for now 
                // unless we upgrade backend execution engine.
                // Ideally we'd linearize the TRUE path or similar.
                if (node.branches) {
                    traverse(node.branches.truePath);
                }
            }
        };

        traverse(nodes);
        return { steps };
    };

    const handleSave = async () => {
        if (!workflowId) {
            await createDefaultWorkflow();
            return;
        }

        try {
            const { steps } = flattenTreeToSteps(flowTree);
            await api.put(`/workflows/${workflowId}`, {
                name: `${audience === 'ALL' ? 'Default' : audience === 'NEW' ? 'New Patient' : 'Returning Patient'} Automation`,
                isActive: true,
                definition: flowTree,
                audience: audience,
                steps
            });
            // Show toast success (assuming toast is available or console)
            console.log('Saved workflow');
        } catch (err) {
            console.error('Failed to save', err);
        }
    };

    const loadSafetyNetTemplate = () => {
        setFlowTree(getSafetyNetTemplate());
    };

    const getSafetyNetTemplate = (): FlowNode[] => {
        return [{
            id: 't-1', type: 'trigger', title: 'Appointment Booked', description: 'When appt is created',
            children: [{
                id: 's-1', type: 'email', title: 'Instant Confirmation', description: 'Send Email',
                config: { message: 'Your appointment is confirmed!' },
                children: [{
                    id: 'w-1', type: 'whatsapp', title: 'WhatsApp Check-in', description: 'Interactive Button',
                    config: { message: 'Your appointment is confirmed! Reply CANCEL to cancel.' },
                    children: [{
                        id: 'd-1', type: 'delay', title: 'Wait 24h Before', description: 'Reminder',
                        config: { duration: '24h' },
                        children: [{
                            id: 'sms-1', type: 'sms', title: 'SMS Reminder', description: 'Send 24h Reminder',
                            config: { message: 'Reminder: Appointment tomorrow', delayHoursBefore: 24 }
                        }]
                    }]
                }]
            }]
        }];
    };

    const getNodeColor = (type: NodeType, isAi?: boolean) => {
        if (isAi) return 'bg-purple-50 text-purple-600 border-purple-200 ring-purple-100';
        switch (type) {
            case 'trigger': return 'bg-slate-900 text-white border-slate-900';
            case 'condition': return 'bg-amber-50 text-amber-700 border-amber-300';
            case 'sms': return 'bg-blue-50 text-blue-600 border-blue-200';
            case 'whatsapp': return 'bg-green-50 text-green-600 border-green-200';
            default: return 'bg-slate-50 text-slate-600 border-slate-200';
        }
    };

    const getNodeIcon = (type: NodeType, isAi?: boolean) => {
        if (isAi) return <Bot size={18} />;
        switch (type) {
            case 'condition': return <GitFork size={18} />;
            case 'whatsapp': return <Phone size={18} />;
            case 'trigger': return <Zap size={18} />;
            case 'sms': return <MessageSquare size={18} />;
            case 'clock': return <Clock size={18} />;
            default: return <Zap size={18} />;
        }
    };

    // Recursive Renderer
    const renderNode = (node: FlowNode, depth = 0) => {
        const isAi = node.config?.isAiAgent || node.config?.aiAnalysis;

        return (
            <div key={node.id} className="relative flex flex-col items-center">

                {/* Visual Connector Line coming INTO this node (except root) */}
                {depth > 0 && <div className="h-6 w-0.5 bg-slate-300"></div>}

                {/* The Node Card */}
                <motion.div
                    layoutId={node.id}
                    className={clsx(
                        "relative z-10 p-4 rounded-xl border-2 flex items-center gap-4 cursor-pointer transition-all shadow-sm hover:shadow-md w-80 bg-white",
                        selectedNodeId === node.id ? "ring-2 ring-primary-500 ring-offset-2" : "",
                        getNodeColor(node.type, isAi)
                    )}
                    onClick={() => setSelectedNodeId(node.id)}
                >
                    <div className={clsx(
                        "w-10 h-10 rounded-lg flex items-center justify-center shadow-sm bg-white shrink-0 font-bold",
                        node.type === 'trigger' ? "text-slate-900" : ""
                    )}>
                        {getNodeIcon(node.type, isAi)}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <h4 className={clsx("font-bold text-sm truncate", node.type === 'trigger' ? "text-white" : "")}>{node.title}</h4>
                            {isAi && <Badge variant="neutral" className="text-[9px] h-4 px-1 bg-purple-100 text-purple-700 border-purple-200">AI</Badge>}
                        </div>
                        <p className={clsx("text-xs opacity-80 truncate", node.type === 'trigger' ? "text-slate-300" : "")}>{node.description}</p>
                    </div>
                </motion.div>

                {/* Recursion for Linear Children */}
                {node.children && node.children.map(child => renderNode(child, depth + 1))}

                {/* Recursion for Branching (Condition Nodes) */}
                {node.type === 'condition' && node.branches && (
                    <div className="flex gap-8 mt-0 pt-6 relative">
                        {/* Connecting Horizontal Line */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-6 border-t-2 border-slate-300 rounded-t-xl" style={{ borderLeft: '2px solid #cbd5e1', borderRight: '2px solid #cbd5e1' }}></div>

                        {/* True Branch */}
                        <div className="flex flex-col items-center">
                            <div className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold mb-1 relative z-10 border border-green-200 shadow-sm">
                                Replied
                            </div>
                            {node.branches.truePath.map(child => renderNode(child, depth + 1))}
                        </div>

                        {/* False Branch */}
                        <div className="flex flex-col items-center">
                            <div className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold mb-1 relative z-10 border border-red-200 shadow-sm">
                                No Reply
                            </div>
                            {node.branches.falsePath.map(child => renderNode(child, depth + 1))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // Recursive Helper: Add node to specific parent ID
    const addNodeToTree = (nodes: FlowNode[], parentId: string, newNode: FlowNode): FlowNode[] => {
        return nodes.map(node => {
            if (node.id === parentId) {
                // Determine where to add. If condition, we assume 'truePath' for now or ask user?
                // For simplicity, we add to 'children' (linear) or specific branch if 'condition' type parent.
                // If parent is condition, we can't just "add to children".
                // We'll enforce that Condition nodes have dedicated UI to add to True/False branches.
                // For now, standard nodes:
                return { ...node, children: [...(node.children || []), newNode] };
            }
            if (node.children) {
                return { ...node, children: addNodeToTree(node.children, parentId, newNode) };
            }
            // Branch traversal
            if (node.branches) {
                return {
                    ...node,
                    branches: {
                        truePath: addNodeToTree(node.branches.truePath, parentId, newNode),
                        falsePath: addNodeToTree(node.branches.falsePath, parentId, newNode)
                    }
                };
            }
            return node;
        });
    };

    // Recursive Helper: Delete node
    const removeNodeFromTree = (nodes: FlowNode[], nodeId: string): FlowNode[] => {
        return nodes.filter(node => node.id !== nodeId).map((node) => {
            if (node.children) {
                node.children = removeNodeFromTree(node.children, nodeId);
            }
            if (node.branches) {
                node.branches.truePath = removeNodeFromTree(node.branches.truePath, nodeId);
                node.branches.falsePath = removeNodeFromTree(node.branches.falsePath, nodeId);
            }
            return node;
        });
    };

    const handleAddNode = (type: NodeType) => {
        const newNode: FlowNode = {
            id: `${type}-${Date.now()}`,
            type,
            title: type === 'condition' ? 'Check Logic' : `Send ${type.charAt(0).toUpperCase() + type.slice(1)}`,
            description: 'New step',
            config: {},
            children: [],
            ...(type === 'condition' ? { branches: { truePath: [], falsePath: [] } } : {})
        };

        if (!selectedNodeId) {
            // Add to root if empty, or prompt
            if (flowTree.length === 0) {
                setFlowTree([newNode]);
            } else {
                // If not selected, append to the very last leaf of the first tree?
                // Or just alert user.
                alert("Please select a step to add a " + type + " after.");
            }
            return;
        }

        // Add to selected node
        // Limitation: If selected node is 'Condition', where do we add? 
        // We'll handle 'Condition' selected separately or default to 'True' path?
        // Ideally UI shows "Add to True" buttons. 
        // For MVP: Check if selected is Condition.
        const selected = findNode(flowTree, selectedNodeId);
        if (selected?.type === 'condition') {
            // For simplicity, auto-add to True Path.
            // Real UI needs selection.
            alert("Cannot add directly to a Condition. Please select leading nodes inside the branches.");
            return;
        }

        setFlowTree(prev => addNodeToTree(prev, selectedNodeId, newNode));
        // Auto select new node
        setSelectedNodeId(newNode.id);
    };

    const handleDeleteNode = () => {
        if (!selectedNodeId) return;
        setFlowTree(prev => removeNodeFromTree(prev, selectedNodeId));
        setSelectedNodeId(null);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-12rem)]">

            {/* Left Toolbar */}
            <div className="lg:col-span-1 space-y-4">
                <Card className="p-4 space-y-4 shadow-sm border-slate-200">
                    <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider">Toolbox</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <Button variant="outline" className="justify-start gap-2 h-auto py-3" onClick={() => handleAddNode('sms')}>
                            <MessageSquare size={16} className="text-blue-500" /> SMS
                        </Button>
                        <Button variant="outline" className="justify-start gap-2 h-auto py-3" onClick={() => handleAddNode('email')}>
                            <Mail size={16} className="text-indigo-500" /> Email
                        </Button>
                        <Button variant="outline" className="justify-start gap-2 h-auto py-3" onClick={() => handleAddNode('whatsapp')}>
                            <Phone size={16} className="text-green-500" /> WhatsApp
                        </Button>
                        <Button variant="outline" className="justify-start gap-2 h-auto py-3" onClick={() => handleAddNode('delay')}>
                            <Clock size={16} className="text-amber-500" /> Delay
                        </Button>
                        <Button variant="outline" className="justify-start gap-2 h-auto py-3 col-span-2" onClick={() => handleAddNode('condition')}>
                            <GitFork size={16} className="text-purple-500" /> Branch Logic
                        </Button>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                        Select a step in the flow, then click a tool to append a new step after it.
                    </p>
                </Card>

                <Card className="p-4 bg-slate-50 border-slate-200">
                    <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-slate-700 text-sm">Controls</span>
                    </div>
                    <div className="flex flex-col gap-2">
                        <div className="space-y-1 mb-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Target Audience</label>
                            <select
                                value={audience}
                                onChange={(e) => setAudience(e.target.value)}
                                className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white font-bold text-slate-700 outline-none focus:ring-2 focus:ring-primary-100"
                            >
                                <option value="ALL">All Patients (Default)</option>
                                <option value="NEW">New Patients Only</option>
                                <option value="RETURNING">Returning Patients Only</option>
                            </select>
                        </div>

                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={loadSafetyNetTemplate}
                            className="justify-start"
                        >
                            <Sparkles size={14} className="text-amber-500 mr-2" />
                            Reset to Default
                        </Button>
                        <Button
                            onClick={handleSave}
                            size="sm"
                            className="justify-start bg-slate-900 text-white"
                        >
                            <Save size={14} className="mr-2" />
                            {isLoading ? 'Loading...' : 'Save Configuration'}
                        </Button>
                    </div>
                </Card>
            </div>

            {/* Middle Canvas */}
            <div className="lg:col-span-2 flex flex-col h-full bg-slate-50/50 rounded-2xl border border-slate-200 overflow-hidden relative">
                <div className="absolute inset-0 bg-grid-slate-200/50 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] pointer-events-none"></div>
                <div className="flex-1 overflow-auto p-8 relative z-10 custom-scrollbar">
                    {flowTree.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400">
                            <Zap size={48} className="mb-4 opacity-20" />
                            <p>No steps yet.</p>
                            <Button variant="link" onClick={() => handleAddNode('trigger')} className="mt-2">Start with a Trigger</Button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center pb-20">
                            {flowTree.map(root => renderNode(root))}
                        </div>
                    )}
                </div>
            </div>

            {/* Right Inspector */}
            <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 p-6 flex flex-col shadow-sm">
                <div className="pb-4 border-b border-slate-100 mb-4 flex justify-between items-center">
                    <h3 className="font-bold text-slate-900">Step Details</h3>
                    {selectedNodeId && (
                        <Button variant="ghost" size="icon" onClick={handleDeleteNode} className="text-red-500 hover:bg-red-50 h-8 w-8">
                            <Trash2 size={16} />
                        </Button>
                    )}
                </div>

                {selectedNodeId ? (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        {(() => {
                            const node = findNode(flowTree, selectedNodeId);
                            if (!node) return null;

                            return (
                                <>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Step Title</label>
                                        <input
                                            type="text"
                                            value={node.title}
                                            onChange={(e) => {
                                                const newTitle = e.target.value;
                                                setFlowTree(prev => {
                                                    const updateTitle = (nodes: FlowNode[]): FlowNode[] => {
                                                        return nodes.map(n => {
                                                            if (n.id === node.id) return { ...n, title: newTitle };
                                                            if (n.children) n.children = updateTitle(n.children);
                                                            if (n.branches) {
                                                                n.branches.truePath = updateTitle(n.branches.truePath);
                                                                n.branches.falsePath = updateTitle(n.branches.falsePath);
                                                            }
                                                            return n;
                                                        });
                                                    };
                                                    return updateTitle(prev);
                                                });
                                            }}
                                            className="w-full p-2 border border-slate-200 rounded-lg text-sm font-semibold"
                                        />
                                    </div>

                                    {(node.type === 'sms' || node.type === 'whatsapp' || node.type === 'email') && (
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-500 uppercase">Message Body</label>
                                            <textarea
                                                className="w-full h-32 p-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-100 outline-none resize-none"
                                                value={node.config?.message || ''}
                                                onChange={(e) => {
                                                    const newVal = e.target.value;
                                                    setFlowTree(prev => {
                                                        const updateConfig = (nodes: FlowNode[]): FlowNode[] => {
                                                            return nodes.map(n => {
                                                                if (n.id === node.id) return { ...n, config: { ...n.config, message: newVal } };
                                                                if (n.children) n.children = updateConfig(n.children);
                                                                if (n.branches) {
                                                                    n.branches.truePath = updateConfig(n.branches.truePath);
                                                                    n.branches.falsePath = updateConfig(n.branches.falsePath);
                                                                }
                                                                return n;
                                                            });
                                                        };
                                                        return updateConfig(prev);
                                                    });
                                                }}
                                            ></textarea>
                                            <p className="text-[10px] text-slate-400">Variables: {'{PatientName}'}, {'{Time}'}</p>
                                        </div>
                                    )}

                                    {node.type === 'delay' && (
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-500 uppercase">Wait Duration</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. 24h, 30m"
                                                value={node.config?.duration || ''}
                                                onChange={(e) => {
                                                    const newVal = e.target.value;
                                                    setFlowTree(prev => {
                                                        const updateConfig = (nodes: FlowNode[]): FlowNode[] => {
                                                            return nodes.map(n => {
                                                                if (n.id === node.id) return { ...n, config: { ...n.config, duration: newVal } };
                                                                if (n.children) n.children = updateConfig(n.children);
                                                                if (n.branches) {
                                                                    n.branches.truePath = updateConfig(n.branches.truePath);
                                                                    n.branches.falsePath = updateConfig(n.branches.falsePath);
                                                                }
                                                                return n;
                                                            });
                                                        };
                                                        return updateConfig(prev);
                                                    });
                                                }}
                                                className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                                            />
                                        </div>
                                    )}

                                    <div className="pt-4 border-t border-slate-100">
                                        <Button className="w-full" onClick={handleSave}>Save Changes</Button>
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center flex-1 text-center opacity-50">
                        <MoveRight size={32} className="mb-4 text-slate-300" />
                        <p className="text-sm font-bold text-slate-500">Select a node to<br />edit or add steps</p>
                    </div>
                )}
            </div>

        </div>
    );
};

export default AutomationBuilder;
