import React from 'react';
import clsx from 'clsx';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    children: React.ReactNode;
    variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary';
    className?: string;
}

const Badge: React.FC<BadgeProps> = ({ children, variant = 'neutral', className, ...props }) => {
    const variants = {
        success: "bg-green-50 text-green-700 border border-green-100",
        warning: "bg-yellow-50 text-yellow-700 border border-yellow-100",
        danger: "bg-red-50 text-red-700 border border-red-100",
        info: "bg-blue-50 text-blue-700 border border-blue-100",
        neutral: "bg-slate-100 text-slate-600 border border-slate-200",
        primary: "bg-primary-50 text-primary-700 border border-primary-100",
    };

    return (
        <span className={clsx(
            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
            variants[variant],
            className
        )} {...props}>
            {children}
        </span>
    );
};

export { Badge };
export default Badge;
