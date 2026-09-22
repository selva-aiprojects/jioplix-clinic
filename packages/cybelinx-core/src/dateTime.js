const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/**
 * Formats a date or timestamp with IST (Asia/Kolkata) as default timezone.
 * Example: "22 Sep 2026" or "22 Sep 2026, 12:00:00 pm"
 */
export function formatDateTime(date, options) {
    const d = new Date(date);
    if (isNaN(d.getTime()))
        return '';
    const day = d.getDate();
    const month = MONTHS[d.getMonth()];
    const year = d.getFullYear();
    if (!options?.includeTime) {
        return `${day} ${month} ${year}`;
    }
    let hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const seconds = d.getSeconds().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12 || 12;
    return `${day} ${month} ${year}, ${hours}:${minutes}:${seconds} ${ampm}`;
}
/**
 * Returns a human relative time string.
 * Example: "just now", "5 minutes ago", "2 hours ago", "1 day ago"
 */
export function formatRelativeTime(date) {
    const d = new Date(date);
    if (isNaN(d.getTime()))
        return '';
    const diffMs = Date.now() - d.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60)
        return 'just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60)
        return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24)
        return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30)
        return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12)
        return `${diffMonths} month${diffMonths === 1 ? '' : 's'} ago`;
    const diffYears = Math.floor(diffDays / 365);
    return `${diffYears} year${diffYears === 1 ? '' : 's'} ago`;
}
