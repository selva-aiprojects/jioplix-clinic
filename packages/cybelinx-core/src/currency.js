/**
 * Formats a numeric amount with the specified currency code.
 * Follows Indian numbering system (lakhs & crores) for INR.
 * Example: formatCurrency(125000, 'INR') => "₹ 1,25,000.00"
 */
export function formatCurrency(amount, currency = 'INR', options) {
    const fractionDigits = options?.fractionDigits ?? (currency === 'INR' ? 2 : 2);
    if (currency.toUpperCase() === 'INR') {
        const formatted = Math.abs(amount).toLocaleString('en-IN', {
            minimumFractionDigits: fractionDigits,
            maximumFractionDigits: fractionDigits,
        });
        const sign = amount < 0 ? '-' : '';
        return `${sign}₹ ${formatted}`;
    }
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
    }).format(amount);
}
/**
 * Formats compact numbers in Indian system (k, L, Cr).
 * Example: 240000 => "₹2.4L", 15000000 => "₹1.5Cr"
 */
export function formatCompactCurrency(amount, currency = 'INR') {
    const prefix = currency.toUpperCase() === 'INR' ? '₹' : '$';
    const abs = Math.abs(amount);
    const sign = amount < 0 ? '-' : '';
    if (currency.toUpperCase() === 'INR') {
        if (abs >= 10_000_000)
            return `${sign}${prefix}${(abs / 10_000_000).toFixed(2)}Cr`;
        if (abs >= 100_000)
            return `${sign}${prefix}${(abs / 100_000).toFixed(2)}L`;
        if (abs >= 1_000)
            return `${sign}${prefix}${(abs / 1_000).toFixed(1)}k`;
        return `${sign}${prefix}${abs}`;
    }
    return new Intl.NumberFormat('en-US', {
        notation: 'compact',
        style: 'currency',
        currency,
    }).format(amount);
}
