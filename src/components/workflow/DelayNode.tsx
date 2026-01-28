import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Clock } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';

function DelayNode({ data }: any) {
    return (
        <Card className="min-w-[150px] border-amber-200 bg-amber-50 dark:bg-amber-950/20 shadow-sm">
            <Handle type="target" position={Position.Top} className="w-3 h-3 bg-amber-500" />
            <div className="p-3 flex flex-col items-center text-center">
                <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/50 mb-2">
                    <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="text-xs font-bold text-amber-700 dark:text-amber-300">Wait</div>
                <div className="text-xs text-muted-foreground">{data.label || '1 Hour'}</div>
            </div>
            <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-amber-500" />
        </Card>
    );
}

export default memo(DelayNode);
