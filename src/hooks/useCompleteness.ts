import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { usePermissionApi } from './usePermissionApi';
import { PERMISSIONS } from '@/config/apiPermissions';

export const useCompleteness = () => {
    const [percentage, setPercentage] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const { user } = useAuth();
    const { get } = usePermissionApi();

    const calculate = async () => {
        try {
            if (!user) {
                setIsLoading(false);
                return;
            }

            // Skip completeness check for SYSTEM_ADMIN
            if (user.role === 'SYSTEM_ADMIN') {
                console.log('[useCompleteness] Skipping for SYSTEM_ADMIN');
                setPercentage(100); // Admin doesn't need setup
                setIsLoading(false);
                return;
            }

            let clinicRes, userRes, serviceRes;

            // 1. Fetch Clinic Info
            if (user.clinicId) {
                // Fetch specific clinic.
                clinicRes = await get(null, `/clinics/${user.clinicId}`);
            } else {
                clinicRes = await get('view_all_clinics', '/clinics');
            }

            // 2. Fetch Doctor Info
            if (user.role === 'DOCTOR') {
                userRes = { data: [user] }; // Mock response format
            } else {
                userRes = await get(PERMISSIONS.VIEW_STAFF, '/users?role=doctor');
            }

            // 3. Fetch Services
            // Use VIEW_SERVICES (maps to view_schedule) which doctors definitely have
            serviceRes = await get(PERMISSIONS.VIEW_SERVICES, '/services');

            // Handle clinicRes: findOne returns object, findAll returns array
            const clinic = (clinicRes?.data && Array.isArray(clinicRes.data))
                ? clinicRes.data[0]
                : clinicRes?.data;

            const doctor = userRes?.data?.[0]; // Assuming single doctor for now
            const services = serviceRes?.data;

            // Fields to check (matching SetupWizard logic)
            const fields = [
                clinic?.name?.trim(),
                clinic?.phone?.trim(),
                clinic?.address?.trim(),
                doctor?.name?.trim(),
                doctor?.email?.trim(),
                doctor?.specialties && doctor.specialties.length > 0 && doctor.specialties[0],
                // Handle both legacy array format and new object format {days: [...], slotDuration: 30}
                // Handle schedule: Defaults to active if missing (matches SetupWizard), valid if present and active
                (!doctor?.schedule) || (
                    Array.isArray(doctor.schedule)
                        ? doctor.schedule.some((day: any) => day.active)
                        : doctor.schedule.days && Array.isArray(doctor.schedule.days) && doctor.schedule.days.some((day: any) => day.active)
                ),
                services && services.length > 0
            ];

            const score = fields.filter(Boolean).length;
            const total = fields.length;
            const calculatedPercentage = Math.round((score / total) * 100);

            if (calculatedPercentage < 100) {
                console.log("DEBUG: Completeness < 100%", {
                    clinicName: !!clinic?.name,
                    clinicPhone: !!clinic?.phone,
                    clinicAddress: !!clinic?.address,
                    doctorName: !!doctor?.name,
                    doctorEmail: !!doctor?.email,
                    doctorSpecialty: !!(doctor?.specialties && doctor.specialties.length > 0),
                    doctorSchedule: !!(doctor?.schedule && (Array.isArray(doctor.schedule) ? doctor.schedule.some((day: any) => day.active) : doctor.schedule.days?.some((day: any) => day.active))),
                    services: services && services.length > 0
                });
            }

            setPercentage(calculatedPercentage);
        } catch (error) {
            console.error("Failed to calculate completeness", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        calculate();
        // Recalculate when user context becomes available or changes
    }, [user]);

    // Expose a refetch function if needed
    return { percentage, isLoading, refetch: calculate };
};
