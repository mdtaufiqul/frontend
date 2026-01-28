"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import Badge from '@/components/ui/badge';
import { Building2, User, Calendar, Clock } from 'lucide-react';
import api, { getFullUrl } from '@/utils/api';
import { normalizeTimezone } from '@/utils/timezones';

// DashboardHeader displays a branding header in the dashboard layout.
// For doctors, it shows the associated clinic's logo and name.
// For other roles, it shows the user's name.
export const DashboardHeader: React.FC = () => {
    const { user } = useAuth();
    const [fetchedClinic, setFetchedClinic] = useState<{ name: string; logo?: string } | null>(null);
    const [currentTime, setCurrentTime] = useState(new Date());

    const isDoctor = user?.role === 'DOCTOR';
    // Use fetched clinic if available, otherwise fall back to user.clinic
    const effectiveClinic = fetchedClinic || user?.clinic;
    // Use user's timezone if set, otherwise fallback to browser's resolved timezone
    const timezone = user?.timezone ? normalizeTimezone(user.timezone) : Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Update time every second
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        // Debug logs for branding issue
        if (isDoctor) {
            console.log("DashboardHeader Debug:", {
                user,
                isDoctor,
                userClinic: user?.clinic,
                userClinicId: user?.clinicId,
                fetchedClinic,
                effectiveClinic
            });
        }

        // If user is doctor, has clinicId, but clinic details (name or logo) are missing, fetch them.
        // We check if clinic object is missing OR if it exists but lacks name/logo
        const clinicMissingOrIncomplete = !user?.clinic || !user?.clinic?.name || !user?.clinic?.logo;

        if (isDoctor && user?.clinicId && clinicMissingOrIncomplete && !fetchedClinic) {
            console.log("Fetching missing/incomplete clinic data for header...");
            const fetchClinic = async () => {
                try {
                    const { data } = await api.get(`/clinics/${user.clinicId}`);
                    console.log("Fetched clinic data result:", data);
                    if (data) {
                        setFetchedClinic(data);
                    }
                } catch (error) {
                    console.error('Failed to fetch clinic details for header:', error);
                }
            };
            fetchClinic();
        }
    }, [isDoctor, user?.clinicId, user?.clinic, fetchedClinic, effectiveClinic, user]);

    // Format date and time in user's timezone
    const formattedDate = currentTime.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: timezone
    });

    const formattedTime = currentTime.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
        timeZone: timezone
    });

    return (
        <div className="flex items-center justify-between px-4 py-2 bg-white/70 backdrop-blur-xl border-b border-slate-200/50 shadow-glass">
            {/* Left side: Logo and Name */}
            <div className="flex items-center gap-3">
                {isDoctor && effectiveClinic?.logo ? (
                    <img
                        src={getFullUrl(effectiveClinic.logo)}
                        alt={effectiveClinic.name ?? 'Clinic Logo'}
                        className="h-10 w-10 rounded-full object-cover shadow-sm bg-white"
                    />
                ) : (
                    <User className="h-10 w-10 text-primary-500 bg-primary-50 rounded-full p-2" />
                )}
                <h4 className="text-lg font-semibold text-slate-800">
                    {isDoctor && effectiveClinic?.name ? effectiveClinic.name : user?.name ?? 'User'}
                </h4>
                {/* Optional badge for role */}
                {user?.role && (
                    <Badge variant="neutral" className="ml-2 capitalize">
                        {user.role.toLowerCase()}
                    </Badge>
                )}
            </div>

            {/* Right side: Date and Time */}
            <div className="flex items-center gap-4">
                {/* Date */}
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200">
                    <Calendar size={16} className="text-slate-600" />
                    <span className="text-sm font-medium text-slate-700">{formattedDate}</span>
                </div>

                {/* Time */}
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-200">
                    <Clock size={16} className="text-blue-600" />
                    <span className="text-sm font-bold text-blue-700 tabular-nums">{formattedTime}</span>
                </div>

                {/* Timezone indicator */}
                {timezone !== 'UTC' && (
                    <div className="text-xs text-slate-500 px-2 py-1 bg-slate-100 rounded">
                        {timezone}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DashboardHeader;
