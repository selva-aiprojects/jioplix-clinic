/**
 * Standard debounce utility for search inputs and keystroke events.
 */
export declare function debounce<T extends (...args: any[]) => void>(func: T, waitMs: number): (...args: Parameters<T>) => void;
