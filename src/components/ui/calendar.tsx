"use client"

import * as React from "react"
import ReactCalendar from "react-calendar"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import 'react-calendar/dist/Calendar.css';

export type CalendarProps = React.ComponentProps<typeof ReactCalendar>

function Calendar({
    className,
    ...props
}: CalendarProps) {
    return (
        <div className={cn("p-3 custom-calendar-wrapper", className)}>
            <ReactCalendar
                prevLabel={<ChevronLeft className="h-4 w-4" />}
                nextLabel={<ChevronRight className="h-4 w-4" />}
                next2Label={null}
                prev2Label={null}
                tileClassName={({ date, view }) =>
                    cn(
                        "hover:bg-accent hover:text-accent-foreground rounded-md",
                    )
                }
                {...props}
            />
            <style jsx global>{`
        .custom-calendar-wrapper .react-calendar {
            width: 100%;
            background: transparent;
            border: none;
            font-family: inherit;
        }
        .custom-calendar-wrapper .react-calendar__navigation {
            display: flex;
            margin-bottom: 1rem;
        }
        .custom-calendar-wrapper .react-calendar__navigation button {
            min-width: 44px;
            background: none;
            font-size: 1rem;
            font-weight: 500;
        }
        .custom-calendar-wrapper .react-calendar__navigation button:disabled {
            background-color: transparent;
        }
        .custom-calendar-wrapper .react-calendar__month-view__weekdays {
            text-align: center;
            text-transform: uppercase;
            font-weight: 500;
            font-size: 0.75rem;
            color: var(--muted-foreground);
            text-decoration: none;
        }
        .custom-calendar-wrapper .react-calendar__month-view__weekdays__weekday {
            padding: 0.5em;
        }
        .custom-calendar-wrapper .react-calendar__month-view__weekdays abbr {
            text-decoration: none;
        }
        .custom-calendar-wrapper .react-calendar__month-view__days__day {
            font-size: 0.875rem;
            padding: 0;
            height: 36px;
            width: 36px !important;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 2px auto;
        }
        .custom-calendar-wrapper .react-calendar__tile {
            max-width: 100%;
            background: none;
            text-align: center;
            line-height: 16px;
        }
        .custom-calendar-wrapper .react-calendar__tile:enabled:hover,
        .custom-calendar-wrapper .react-calendar__tile:enabled:focus {
            background-color: #f1f5f9;
            color: #0f172a;
            border-radius: 6px;
        }
        .custom-calendar-wrapper .react-calendar__tile--now {
            background: transparent;
            color: #0f172a;
            font-weight: bold;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
        }
        .custom-calendar-wrapper .react-calendar__tile--now:enabled:hover,
        .custom-calendar-wrapper .react-calendar__tile--now:enabled:focus {
             background: #f1f5f9;
        }
        .custom-calendar-wrapper .react-calendar__tile--active {
            background: #2563eb !important;
            color: white !important;
            border-radius: 6px;
        }
        .custom-calendar-wrapper .react-calendar__tile--active:enabled:hover,
        .custom-calendar-wrapper .react-calendar__tile--active:enabled:focus {
            background: #2563eb;
        }
      `}</style>
        </div>
    )
}
Calendar.displayName = "Calendar"

export { Calendar }
