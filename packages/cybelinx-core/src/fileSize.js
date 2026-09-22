/**
 * Formats bytes into a human-readable file size string.
 * Example: formatFileSize(2097152) => "2 MB"
 */
export function formatFileSize(bytes) {
    if (bytes < 0)
        return '0 B';
    if (bytes < 1024)
        return `${bytes} B`;
    const units = ['KB', 'MB', 'GB', 'TB'];
    let unitIndex = -1;
    let size = bytes;
    do {
        size /= 1024;
        unitIndex++;
    } while (size >= 1024 && unitIndex < units.length - 1);
    const formatted = size % 1 === 0 ? size.toString() : size.toFixed(1);
    return `${formatted} ${units[unitIndex]}`;
}
