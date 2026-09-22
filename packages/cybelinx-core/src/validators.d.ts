/**
 * Validates Ayushman Bharat Health Account (ABHA) number.
 * Standard format: 14 digits, typically hyphen-separated: "12-3456-7890-1234"
 */
export declare function validateABHA(abha: string): boolean;
/**
 * Validates Aadhaar number.
 * 12 numeric digits, optional spaces: "2345 6789 0123"
 */
export declare function validateAadhaar(aadhaar: string): boolean;
/**
 * Validates Indian Permanent Account Number (PAN).
 * Format: 5 letters, 4 digits, 1 letter (e.g. "ABCDE1234F")
 */
export declare function validatePAN(pan: string): boolean;
/**
 * Validates Goods and Services Tax Identification Number (GSTIN).
 * Format: 2 digit state code + 10 char PAN + 1 entity code + 'Z' + 1 checksum
 * Example: "27ABCDE1234F1Z5"
 */
export declare function validateGSTIN(gstin: string): boolean;
/**
 * Validates standard email address.
 */
export declare function validateEmail(email: string): boolean;
/**
 * Validates Indian phone number (10 digits with optional +91 prefix and formatting).
 * Example: "+91 9876543210", "9876543210", "+919876543210"
 */
export declare function validatePhone(phone: string): boolean;
