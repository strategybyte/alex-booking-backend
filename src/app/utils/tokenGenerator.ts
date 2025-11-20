import crypto from 'crypto';

/**
 * Generate a secure random token for payment links
 * @param length - Length of the token (default: 32)
 * @returns A URL-safe random token
 */
export const generatePaymentToken = (length: number = 32): string => {
  return crypto
    .randomBytes(length)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
    .slice(0, length);
};

/**
 * Generate token expiry date (24 hours from now by default)
 * @param hours - Number of hours until expiration (default: 24)
 * @returns Date object representing expiration time
 */
export const generateTokenExpiry = (hours: number = 24): Date => {
  const expiryDate = new Date();
  expiryDate.setHours(expiryDate.getHours() + hours);
  return expiryDate;
};

/**
 * Check if a token has expired
 * @param expiryDate - The expiration date to check
 * @returns true if token is expired, false otherwise
 */
export const isTokenExpired = (expiryDate: Date): boolean => {
  return new Date() > new Date(expiryDate);
};

/**
 * Format expiry date for email display
 * @param expiryDate - The expiration date
 * @returns Formatted date string
 */
export const formatExpiryDate = (expiryDate: Date): string => {
  return new Date(expiryDate).toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
};

const TokenGenerator = {
  generatePaymentToken,
  generateTokenExpiry,
  isTokenExpired,
  formatExpiryDate,
};

export default TokenGenerator;
