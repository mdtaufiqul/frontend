import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Mail, MessageSquare, Send } from 'lucide-react';
import { Card } from '@/components/ui/card';

function ActionNode({ data }: any) {
    const Icon = data.channel === 'SMS' ? MessageSquare : Mail;

    return (
        <Card className="min-w-[150px] border-blue-200 bg-blue-50 dark:bg-blue-950/20 shadow-sm">
            <Handle type="target" position={Position.Top} className="w-3 h-3 bg-blue-500" />
            <div className="p-3 flex items-center gap-3">
                <div className="p-2 rounded-md bg-blue-100 dark:bg-blue-900/50">
                    <Icon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex flex-col text-left">
                    <div className="text-xs font-bold text-blue-700 dark:text-blue-300">
                        {data.channel || 'Action'}
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate max-w-[100px]">
                        {data.label || 'Send Message'}
                    </div>
                </div>
            </div>
            <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-blue-500" />
        </Card>
    );
}

export default memo(ActionNode);
