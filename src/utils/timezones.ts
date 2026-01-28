// Common timezone mappings and lists for the application

/**
 * Maps Rails-style timezone names to IANA timezone identifiers
 */
export const RAILS_TO_IANA_TIMEZONE_MAP: Record<string, string> = {
    // US & Canada
    'Eastern Time (US & Canada)': 'America/New_York',
    'Central Time (US & Canada)': 'America/Chicago',
    'Mountain Time (US & Canada)': 'America/Denver',
    'Pacific Time (US & Canada)': 'America/Los_Angeles',
    'Alaska': 'America/Anchorage',
    'Hawaii': 'Pacific/Honolulu',
    'Arizona': 'America/Phoenix',
    'Indiana (East)': 'America/Indiana/Indianapolis',

    // Europe
    'London': 'Europe/London',
    'Dublin': 'Europe/Dublin',
    'Lisbon': 'Europe/Lisbon',
    'Paris': 'Europe/Paris',
    'Berlin': 'Europe/Berlin',
    'Rome': 'Europe/Rome',
    'Madrid': 'Europe/Madrid',
    'Amsterdam': 'Europe/Amsterdam',
    'Brussels': 'Europe/Brussels',
    'Copenhagen': 'Europe/Copenhagen',
    'Stockholm': 'Europe/Stockholm',
    'Vienna': 'Europe/Vienna',
    'Warsaw': 'Europe/Warsaw',
    'Prague': 'Europe/Prague',
    'Athens': 'Europe/Athens',
    'Helsinki': 'Europe/Helsinki',
    'Moscow': 'Europe/Moscow',
    'Istanbul': 'Europe/Istanbul',

    // Asia
    'Bangkok': 'Asia/Bangkok',
    'Beijing': 'Asia/Shanghai',
    'Hong Kong': 'Asia/Hong_Kong',
    'Singapore': 'Asia/Singapore',
    'Tokyo': 'Asia/Tokyo',
    'Seoul': 'Asia/Seoul',
    'Mumbai': 'Asia/Kolkata',
    'Dubai': 'Asia/Dubai',
    'Karachi': 'Asia/Karachi',
    'Dhaka': 'Asia/Dhaka',
    'Jakarta': 'Asia/Jakarta',
    'Manila': 'Asia/Manila',
    'Kuala Lumpur': 'Asia/Kuala_Lumpur',

    // Australia & Pacific
    'Sydney': 'Australia/Sydney',
    'Melbourne': 'Australia/Melbourne',
    'Brisbane': 'Australia/Brisbane',
    'Perth': 'Australia/Perth',
    'Adelaide': 'Australia/Adelaide',
    'Auckland': 'Pacific/Auckland',

    // Americas (South)
    'Buenos Aires': 'America/Argentina/Buenos_Aires',
    'Sao Paulo': 'America/Sao_Paulo',
    'Mexico City': 'America/Mexico_City',
    'Bogota': 'America/Bogota',
    'Lima': 'America/Lima',
    'Santiago': 'America/Santiago',

    // Africa
    'Cairo': 'Africa/Cairo',
    'Johannesburg': 'Africa/Johannesburg',
    'Lagos': 'Africa/Lagos',
    'Nairobi': 'Africa/Nairobi',
    'Casablanca': 'Africa/Casablanca',
};

/**
 * Popular IANA timezones grouped by region for display in dropdowns
 */
export const POPULAR_TIMEZONES = [
    // North America
    { label: 'Eastern Time - New York', value: 'America/New_York', region: 'North America' },
    { label: 'Central Time - Chicago', value: 'America/Chicago', region: 'North America' },
    { label: 'Mountain Time - Denver', value: 'America/Denver', region: 'North America' },
    { label: 'Pacific Time - Los Angeles', value: 'America/Los_Angeles', region: 'North America' },
    { label: 'Alaska Time - Anchorage', value: 'America/Anchorage', region: 'North America' },
    { label: 'Hawaii Time - Honolulu', value: 'Pacific/Honolulu', region: 'North America' },
    { label: 'Arizona - Phoenix', value: 'America/Phoenix', region: 'North America' },
    { label: 'Toronto', value: 'America/Toronto', region: 'North America' },
    { label: 'Vancouver', value: 'America/Vancouver', region: 'North America' },
    { label: 'Mexico City', value: 'America/Mexico_City', region: 'North America' },

    // Europe
    { label: 'London (GMT/BST)', value: 'Europe/London', region: 'Europe' },
    { label: 'Paris', value: 'Europe/Paris', region: 'Europe' },
    { label: 'Berlin', value: 'Europe/Berlin', region: 'Europe' },
    { label: 'Rome', value: 'Europe/Rome', region: 'Europe' },
    { label: 'Madrid', value: 'Europe/Madrid', region: 'Europe' },
    { label: 'Amsterdam', value: 'Europe/Amsterdam', region: 'Europe' },
    { label: 'Brussels', value: 'Europe/Brussels', region: 'Europe' },
    { label: 'Vienna', value: 'Europe/Vienna', region: 'Europe' },
    { label: 'Stockholm', value: 'Europe/Stockholm', region: 'Europe' },
    { label: 'Copenhagen', value: 'Europe/Copenhagen', region: 'Europe' },
    { label: 'Warsaw', value: 'Europe/Warsaw', region: 'Europe' },
    { label: 'Prague', value: 'Europe/Prague', region: 'Europe' },
    { label: 'Athens', value: 'Europe/Athens', region: 'Europe' },
    { label: 'Helsinki', value: 'Europe/Helsinki', region: 'Europe' },
    { label: 'Moscow', value: 'Europe/Moscow', region: 'Europe' },
    { label: 'Istanbul', value: 'Europe/Istanbul', region: 'Europe' },
    { label: 'Dublin', value: 'Europe/Dublin', region: 'Europe' },
    { label: 'Lisbon', value: 'Europe/Lisbon', region: 'Europe' },

    // Asia
    { label: 'Dubai', value: 'Asia/Dubai', region: 'Asia' },
    { label: 'Mumbai', value: 'Asia/Kolkata', region: 'Asia' },
    { label: 'Dhaka', value: 'Asia/Dhaka', region: 'Asia' },
    { label: 'Bangkok', value: 'Asia/Bangkok', region: 'Asia' },
    { label: 'Singapore', value: 'Asia/Singapore', region: 'Asia' },
    { label: 'Hong Kong', value: 'Asia/Hong_Kong', region: 'Asia' },
    { label: 'Shanghai', value: 'Asia/Shanghai', region: 'Asia' },
    { label: 'Tokyo', value: 'Asia/Tokyo', region: 'Asia' },
    { label: 'Seoul', value: 'Asia/Seoul', region: 'Asia' },
    { label: 'Jakarta', value: 'Asia/Jakarta', region: 'Asia' },
    { label: 'Manila', value: 'Asia/Manila', region: 'Asia' },
    { label: 'Kuala Lumpur', value: 'Asia/Kuala_Lumpur', region: 'Asia' },
    { label: 'Karachi', value: 'Asia/Karachi', region: 'Asia' },
    { label: 'Taipei', value: 'Asia/Taipei', region: 'Asia' },

    // Australia & Pacific
    { label: 'Sydney', value: 'Australia/Sydney', region: 'Australia & Pacific' },
    { label: 'Melbourne', value: 'Australia/Melbourne', region: 'Australia & Pacific' },
    { label: 'Brisbane', value: 'Australia/Brisbane', region: 'Australia & Pacific' },
    { label: 'Perth', value: 'Australia/Perth', region: 'Australia & Pacific' },
    { label: 'Adelaide', value: 'Australia/Adelaide', region: 'Australia & Pacific' },
    { label: 'Auckland', value: 'Pacific/Auckland', region: 'Australia & Pacific' },

    // South America
    { label: 'Buenos Aires', value: 'America/Argentina/Buenos_Aires', region: 'South America' },
    { label: 'São Paulo', value: 'America/Sao_Paulo', region: 'South America' },
    { label: 'Bogotá', value: 'America/Bogota', region: 'South America' },
    { label: 'Lima', value: 'America/Lima', region: 'South America' },
    { label: 'Santiago', value: 'America/Santiago', region: 'South America' },
    { label: 'Caracas', value: 'America/Caracas', region: 'South America' },

    // Africa
    { label: 'Cairo', value: 'Africa/Cairo', region: 'Africa' },
    { label: 'Johannesburg', value: 'Africa/Johannesburg', region: 'Africa' },
    { label: 'Lagos', value: 'Africa/Lagos', region: 'Africa' },
    { label: 'Nairobi', value: 'Africa/Nairobi', region: 'Africa' },
    { label: 'Casablanca', value: 'Africa/Casablanca', region: 'Africa' },

    // UTC
    { label: 'UTC (Coordinated Universal Time)', value: 'UTC', region: 'UTC' },
];

/**
 * Normalizes a timezone string to a valid IANA identifier
 * @param tz - Timezone string (can be Rails-style, GMT variant, or IANA)
 * @returns Valid IANA timezone identifier
 */
export function normalizeTimezone(tz: string | undefined): string {
    if (!tz) return 'UTC';

    // Normalize common GMT variants to UTC
    const tzUpper = tz.toUpperCase().trim();
    if (tzUpper === 'GMT' || tzUpper === 'GMT0' || tzUpper === 'GMT+0' || tzUpper === 'GMT-0') {
        return 'UTC';
    }

    // Handle GMT+X or GMT-X offsets (convert to Etc/GMT format)
    const gmtOffsetMatch = tzUpper.match(/^GMT([+-])(\d{1,2})$/);
    if (gmtOffsetMatch) {
        const sign = gmtOffsetMatch[1];
        const offset = gmtOffsetMatch[2];
        // Note: Etc/GMT zones have INVERTED signs (Etc/GMT+5 is actually UTC-5)
        const invertedSign = sign === '+' ? '-' : '+';
        return `Etc/GMT${invertedSign}${offset}`;
    }

    // Check if it's already a valid IANA identifier
    if (POPULAR_TIMEZONES.some(t => t.value === tz)) {
        return tz;
    }

    // Try to map from Rails-style name
    const mapped = RAILS_TO_IANA_TIMEZONE_MAP[tz];
    if (mapped) {
        return mapped;
    }

    // If it looks like an IANA identifier (contains /), return as-is
    if (tz.includes('/')) {
        return tz;
    }

    // Default to UTC if we can't recognize it
    console.warn(`[Timezone] Unknown timezone format: "${tz}", defaulting to UTC`);
    return 'UTC';
}

/**
 * Gets the timezone abbreviation (e.g., "EST", "PST", "BDT") for a given timezone
 * @param timezone - IANA timezone identifier
 * @param date - Date to get abbreviation for (defaults to now, important for DST)
 * @returns Timezone abbreviation (e.g., "EST") or timezone name if abbreviation unavailable
 */
export function getTimezoneAbbreviation(timezone: string, date: Date = new Date()): string {
    try {
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            timeZoneName: 'short'
        });
        const parts = formatter.formatToParts(date);
        const tzPart = parts.find(part => part.type === 'timeZoneName');
        return tzPart?.value || timezone;
    } catch (error) {
        console.warn(`[Timezone] Could not get abbreviation for ${timezone}`, error);
        return timezone;
    }
}

/**
 * Gets a human-readable display name for a timezone
 * @param timezone - IANA timezone identifier
 * @returns Human-readable timezone name (e.g., "Eastern Time - New York")
 */
export function getTimezoneDisplayName(timezone: string): string {
    // Try to find in popular timezones list
    const popular = POPULAR_TIMEZONES.find(t => t.value === timezone);
    if (popular) {
        return popular.label;
    }

    // Try to find in Rails mapping (reverse lookup)
    const railsName = Object.entries(RAILS_TO_IANA_TIMEZONE_MAP).find(
        ([_, iana]) => iana === timezone
    )?.[0];

    if (railsName) {
        return railsName;
    }

    // Fallback: format the IANA identifier nicely
    // "America/New_York" -> "America - New York"
    return timezone.replace('/', ' - ').replace(/_/g, ' ');
}
