
import React from 'react';
import { TrendingUp, TrendingDown, HelpCircle } from 'lucide-react';

interface NoShowScoreProps {
    score: number;
}

export const NoShowScore: React.FC<NoShowScoreProps> = ({ score }) => {
    // Determine Color
    let colorClass = 'text-green-600 bg-green-50 border-green-200';
    let Icon = TrendingUp;

    if (score < 50) {
        colorClass = 'text-red-600 bg-red-50 border-red-200';
        Icon = TrendingDown;
    } else if (score < 80) {
        colorClass = 'text-yellow-600 bg-yellow-50 border-yellow-200';
        Icon = HelpCircle;
    }

    return (
        <div className={`flex items-center gap-3 p-3 rounded-lg border ${colorClass} shadow-sm transition-all`}>
            <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold opacity-70 tracking-wider">Reliability Score</span>
                <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold">{Math.round(score)}/100</span>
                    <Icon className="w-5 h-5 opacity-80" />
                </div>
            </div>

            {/* Tooltip / Explanation (Simple for now) */}
            <div className="h-8 w-[1px] bg-current opacity-20 mx-1"></div>

            <div className="text-xs opacity-80 max-w-[140px] leading-tight">
                {score >= 80 && "Excellent attendance record. Likely to confirm."}
                {score >= 50 && score < 80 && "Average reliability. Send reminders."}
                {score < 50 && "High risk of No-Show. consider deposit."}
            </div>
        </div>
    );
};
