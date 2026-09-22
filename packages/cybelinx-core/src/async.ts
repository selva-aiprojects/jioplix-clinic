/**
 * Standard debounce utility for search inputs and keystroke events.
 */
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  waitMs: number,
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => {
      func(...args)
    }, waitMs)
  }
}
