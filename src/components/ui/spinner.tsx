import * as React from "react"
import { cn } from "@/lib/utils"

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
    size?: 'sm' | 'md' | 'lg';
}

const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
    ({ className, size = 'md', ...props }, ref) => {
        const sizeClasses = {
            sm: 'h-4 w-4 border-2',
            md: 'h-8 w-8 border-4',
            lg: 'h-12 w-12 border-4',
        };

        return (
            <div
                ref={ref}
                className={cn(
                    "animate-spin rounded-full border-solid border-primary-600 border-t-transparent",
                    sizeClasses[size],
                    className
                )}
                {...props}
            />
        )
    }
)
Spinner.displayName = "Spinner"

export { Spinner }
