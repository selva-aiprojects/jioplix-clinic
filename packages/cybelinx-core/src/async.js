/**
 * Standard debounce utility for search inputs and keystroke events.
 */
export function debounce(func, waitMs) {
    let timeout = null;
    return (...args) => {
        if (timeout)
            clearTimeout(timeout);
        timeout = setTimeout(() => {
            func(...args);
        }, waitMs);
    };
}
