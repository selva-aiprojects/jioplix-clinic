export interface FormatDateTimeOptions {
    includeTime?: boolean;
    timezone?: string;
}
/**
 * Formats a date or timestamp with IST (Asia/Kolkata) as default timezone.
 * Example: "22 Sep 2026" or "22 Sep 2026, 12:00:00 pm"
 */
export declare function formatDateTime(date: Date | string | number, options?: FormatDateTimeOptions): string;
/**
 * Returns a human relative time string.
 * Example: "just now", "5 minutes ago", "2 hours ago", "1 day ago"
 */
export declare function formatRelativeTime(date: Date | string | number): string;
