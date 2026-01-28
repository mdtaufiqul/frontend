import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { GitBranch } from 'lucide-react';
import { Card } from '@/components/ui/card';

function ConditionNode({ data }: any) {
    return (
        <Card className="min-w-[150px] border-purple-200 bg-purple-50 dark:bg-purple-950/20 shadow-sm">
            <Handle type="target" position={Position.Top} className="w-3 h-3 bg-purple-500" />
            <div className="p-3 flex flex-col items-center text-center">
                <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/50 mb-2">
                    <GitBranch className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="text-xs font-bold text-purple-700 dark:text-purple-300">Condition</div>
                <div className="text-xs text-muted-foreground">{data.label || 'If...'}</div>
            </div>

            {/* Two Source Handles for Branching */}
            <div className="absolute -bottom-3 left-0 w-full flex justify-around px-2">
                <div className="relative">
                    <Handle type="source" id="true" position={Position.Bottom} className="w-3 h-3 bg-emerald-500" />
                    <span className="absolute top-4 -left-1 text-[9px] text-emerald-600 font-bold">YES</span>
                </div>
                <div className="relative">
                    <Handle type="source" id="false" position={Position.Bottom} className="w-3 h-3 bg-red-500" />
                    <span className="absolute top-4 -left-1 text-[9px] text-red-600 font-bold">NO</span>
                </div>
            </div>
        </Card>
    );
}

export default memo(ConditionNode);
