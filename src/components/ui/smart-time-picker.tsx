"use client"

import * as React from "react"
import { Clock, Check } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface SmartTimePickerProps {
    value: string
    onChange: (time: string) => void
    className?: string
    availableSlots?: any[]
    isLoading?: boolean
}

export function SmartTimePicker({ value, onChange, className, availableSlots, isLoading }: SmartTimePickerProps) {
    const [isOpen, setIsOpen] = React.useState(false)
    const scrollRef = React.useRef<HTMLDivElement>(null)

    // Helper to convert 24h (14:00) to 12h (02:00 PM) format for matching
    const to12h = (time24: string) => {
        if (!time24) return "";
        const [h, m] = time24.split(":").map(Number);
        const modifier = h >= 12 ? "PM" : "AM";
        const h12 = h % 12 || 12;
        return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${modifier}`;
    };

    // Use availableSlots from API if provided, otherwise fallback to default generation
    const timeSlots = React.useMemo(() => {
        if (availableSlots && availableSlots.length > 0) {
            return availableSlots.map(slot => ({
                label: to12h(slot.time),
                original: slot.time,
                available: slot.available
            }));
        }

        const slots = []
        for (let i = 0; i < 24; i++) {
            const hour = i
            const isPM = hour >= 12
            const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
            const modifier = isPM ? 'PM' : 'AM'

            slots.push({
                label: `${displayHour.toString().padStart(2, '0')}:00 ${modifier}`,
                available: true
            })
            slots.push({
                label: `${displayHour.toString().padStart(2, '0')}:30 ${modifier}`,
                available: true
            })
        }
        return slots
    }, [availableSlots])

    // Scroll to selected time when opened
    React.useEffect(() => {
        if (isOpen && value && scrollRef.current) {
            const selectedButton = scrollRef.current.querySelector(`button[data-time="${value}"]`)
            if (selectedButton) {
                selectedButton.scrollIntoView({ block: 'center' })
            }
        }
    }, [isOpen, value])

    const handleTimeSelect = (time: string, isAvailable: boolean) => {
        if (!isAvailable) return;
        onChange(time)
        setIsOpen(false)
    }

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <div className={cn("relative w-full", className)}>
                    <Input
                        value={value}
                        readOnly
                        className="w-full pl-9 font-medium cursor-pointer"
                        placeholder="Select Time"
                    />
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
            </PopoverTrigger>
            <PopoverContent className="w-60 p-1 rounded-xl shadow-2xl border-slate-200 z-[200]" align="start">
                {isLoading ? (
                    <div className="p-4 text-center text-xs text-slate-500 font-medium animate-pulse">
                        Loading slots...
                    </div>
                ) : (
                    <div
                        ref={scrollRef}
                        className="h-72 overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent"
                    >
                        {timeSlots.map((slot) => (
                            <button
                                key={slot.label}
                                data-time={slot.label}
                                disabled={!slot.available}
                                onClick={() => handleTimeSelect(slot.label, slot.available)}
                                className={cn(
                                    "w-full text-left px-3 py-2.5 text-sm rounded-lg transition-all flex items-center justify-between group mb-1",
                                    value === slot.label
                                        ? "bg-primary-600 text-white shadow-md shadow-primary-500/20"
                                        : !slot.available
                                            ? "text-slate-300 bg-slate-50 cursor-not-allowed opacity-60"
                                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                )}
                            >
                                <div className="flex flex-col">
                                    <span className="font-medium">{slot.label}</span>
                                    {!slot.available && (
                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Occupied</span>
                                    )}
                                </div>
                                {value === slot.label && <Check size={14} className="text-white" />}
                            </button>
                        ))}
                    </div>
                )}
            </PopoverContent>
        </Popover>
    )
}
