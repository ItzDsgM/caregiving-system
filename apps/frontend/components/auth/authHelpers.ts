/**
 * Shared client-side validation and safe redirect helpers for auth views.
 */

export const EMAIL_FORMAT_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Allows only relative internal application paths (`/...`) and blocks protocol-relative URLs (`//...`).
 */
export function sanitizeInternalRedirect(rawPath: string | null | undefined): string | null {
  if (!rawPath) return null;
  const trimmed = rawPath.trim();
  if (!trimmed.startsWith('/')) return null;
  if (trimmed.startsWith('//') || trimmed.startsWith('/\\')) return null;
  if (/[\r\n]/.test(trimmed)) return null;
  return trimmed;
}

export function normalizePhoneForSubmit(rawPhone: string): string {
  return rawPhone.trim().replace(/[\s()-]/g, '');
}

export function isValidPhoneInput(rawPhone: string): boolean {
  const normalized = normalizePhoneForSubmit(rawPhone);
  return /^\+?\d{7,15}$/.test(normalized);
}
