/**
 * Validates Ayushman Bharat Health Account (ABHA) number.
 * Standard format: 14 digits, typically hyphen-separated: "12-3456-7890-1234"
 */
export function validateABHA(abha) {
    if (!abha || typeof abha !== 'string')
        return false;
    const clean = abha.replace(/[\s-]/g, '');
    // Must be exactly 14 numeric digits
    if (!/^\d{14}$/.test(clean))
        return false;
    // First digit cannot be 0 or 1 in standard ABHA issuing scheme, but 12-xxxx is standard sandbox
    return true;
}
/**
 * Validates Aadhaar number.
 * 12 numeric digits, optional spaces: "2345 6789 0123"
 */
export function validateAadhaar(aadhaar) {
    if (!aadhaar || typeof aadhaar !== 'string')
        return false;
    const clean = aadhaar.replace(/[\s-]/g, '');
    if (!/^\d{12}$/.test(clean))
        return false;
    // Cannot start with 0 or 1
    if (clean.startsWith('0') || clean.startsWith('1'))
        return false;
    return true;
}
/**
 * Validates Indian Permanent Account Number (PAN).
 * Format: 5 letters, 4 digits, 1 letter (e.g. "ABCDE1234F")
 */
export function validatePAN(pan) {
    if (!pan || typeof pan !== 'string')
        return false;
    const clean = pan.trim().toUpperCase();
    return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(clean);
}
/**
 * Validates Goods and Services Tax Identification Number (GSTIN).
 * Format: 2 digit state code + 10 char PAN + 1 entity code + 'Z' + 1 checksum
 * Example: "27ABCDE1234F1Z5"
 */
export function validateGSTIN(gstin) {
    if (!gstin || typeof gstin !== 'string')
        return false;
    const clean = gstin.trim().toUpperCase();
    return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(clean);
}
/**
 * Validates standard email address.
 */
export function validateEmail(email) {
    if (!email || typeof email !== 'string')
        return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
/**
 * Validates Indian phone number (10 digits with optional +91 prefix and formatting).
 * Example: "+91 9876543210", "9876543210", "+919876543210"
 */
export function validatePhone(phone) {
    if (!phone || typeof phone !== 'string')
        return false;
    const clean = phone.replace(/[\s\-()]/g, '');
    // Handles 10-digit or +91 / 91 prefixed 10-digit numbers starting with 6, 7, 8, 9
    return /^(\+?91)?[6-9]\d{9}$/.test(clean);
}
