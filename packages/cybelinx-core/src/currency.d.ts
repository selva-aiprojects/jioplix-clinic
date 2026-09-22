export interface FormatCurrencyOptions {
    fractionDigits?: number;
    compact?: boolean;
}
/**
 * Formats a numeric amount with the specified currency code.
 * Follows Indian numbering system (lakhs & crores) for INR.
 * Example: formatCurrency(125000, 'INR') => "₹ 1,25,000.00"
 */
export declare function formatCurrency(amount: number, currency?: string, options?: FormatCurrencyOptions): string;
/**
 * Formats compact numbers in Indian system (k, L, Cr).
 * Example: 240000 => "₹2.4L", 15000000 => "₹1.5Cr"
 */
export declare function formatCompactCurrency(amount: number, currency?: string): string;
