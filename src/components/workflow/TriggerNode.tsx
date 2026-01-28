import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Zap } from 'lucide-react';
import { Card } from '@/components/ui/card';

function TriggerNode({ data }: any) {
    return (
        <Card className="min-w-[150px] border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 shadow-md">
            <div className="p-3 flex flex-col items-center text-center">
                <div className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-900/50 mb-2">
                    <Zap className="w-5 h-5 text-emerald-600 dark:text-emerald-400 fill-current" />
                </div>
                <div className="text-xs font-bold text-emerald-700 dark:text-emerald-300">Trigger</div>
                <div className="text-xs text-muted-foreground">{data.label || 'Start'}</div>
            </div>
            <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-emerald-500" />
        </Card>
    );
}

export default memo(TriggerNode);
