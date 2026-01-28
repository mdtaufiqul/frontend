export const PERMISSIONS = {
    // Clinic
    VIEW_CLINIC: 'view_clinic_info',
    VIEW_ALL_CLINICS: 'view_all_clinics',
    MANAGE_CLINIC: 'manage_clinic_info',
    VIEW_STAFF: 'view_staff',
    MANAGE_STAFF: 'manage_staff',
    VIEW_SERVICES: 'view_schedule', // Maps to schedule for now
    MANAGE_SERVICES: 'manage_clinic_info',

    // Doctors/Users
    VIEW_DOCTORS: 'view_doctors',
    MANAGE_DOCTORS: 'manage_doctors',
    MANAGE_OWN_PROFILE: 'manage_own_config', // Assuming this maps to Doctor Communication Profile etc
    VIEW_OWN_PROFILE: 'view_own_config',

    // Patients
    VIEW_ALL_PATIENTS: 'view_patients', // Actually 'view_all_patients' in theory, but existing backend uses 'view_patients'
    VIEW_ASSIGNED_PATIENTS: 'view_assigned_patients', // New granular
    MANAGE_PATIENTS: 'manage_patients',

    // Appointments / Schedule
    VIEW_APPOINTMENTS: 'view_appointments',
    VIEW_SCHEDULE: 'view_appointments', // Alias
    MANAGE_APPOINTMENTS: 'manage_appointments',

    // Communications
    VIEW_COMMUNICATIONS: 'view_communications',
    MANAGE_COMMUNICATIONS: 'manage_communications',

    // Workflows
    VIEW_WORKFLOWS: 'view_workflows',
    MANAGE_WORKFLOWS: 'manage_workflows',

    // Waitlist
    VIEW_WAITLIST: 'view_appointments', // Mapped to general appointments for now? Or specific 'view_waitlist'
    MANAGE_WAITLIST: 'manage_appointments',

    // Billing
    VIEW_BILLING: 'view_billing',
    MANAGE_BILLING: 'manage_billing',

    // Analytics
    VIEW_ANALYTICS: 'view_analytics',
    VIEW_REPORTS: 'view_reports',
} as const;

export type PermissionKey = typeof PERMISSIONS[keyof typeof PERMISSIONS];

/**
 * The Central Source of Truth for which API requires which permission.
 * Components should (ideally) consult this, or strictly use the Key defined here.
 * 
 * Note: Dynamic parameters (e.g. IDs) are replaced with placeholders or ignored in the key map 
 * if we want strict URL matching, but for now this serves as documentation and constant lookup.
 */
export const API_PERMISSION_MAP: Record<string, PermissionKey> = {
    // Clinics
    '/clinics': PERMISSIONS.VIEW_CLINIC, // GET
    '/clinics/:id': PERMISSIONS.VIEW_CLINIC, // GET

    // Users
    '/users': PERMISSIONS.VIEW_STAFF, // Usually requires full staff view, unless filtered.
    '/users?role=doctor': PERMISSIONS.VIEW_DOCTORS,

    // Patients
    '/patients': PERMISSIONS.VIEW_ALL_PATIENTS, // Strict default. Doctors should use scoped calls?
    // NOTE: For doctors, we might need a separate endpoint or permission check logic `view_assigned_patients`

    // Appointments
    '/appointments': PERMISSIONS.VIEW_APPOINTMENTS,
    '/appointments/available-slots': PERMISSIONS.VIEW_APPOINTMENTS, // Public/Semi-public?
};
