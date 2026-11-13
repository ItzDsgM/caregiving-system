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

export interface CountryDialOption {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
  minDigits: number;
  maxDigits: number;
  placeholder: string;
}

export const COUNTRY_DIAL_OPTIONS: CountryDialOption[] = [
  {
    code: 'CO',
    name: 'Colombia',
    dialCode: '+57',
    flag: '🇨🇴',
    minDigits: 10,
    maxDigits: 10,
    placeholder: '3001234567',
  },
  {
    code: 'MX',
    name: 'México',
    dialCode: '+52',
    flag: '🇲🇽',
    minDigits: 10,
    maxDigits: 10,
    placeholder: '5512345678',
  },
  {
    code: 'AR',
    name: 'Argentina',
    dialCode: '+54',
    flag: '🇦🇷',
    minDigits: 10,
    maxDigits: 10,
    placeholder: '1123456789',
  },
  {
    code: 'CL',
    name: 'Chile',
    dialCode: '+56',
    flag: '🇨🇱',
    minDigits: 9,
    maxDigits: 9,
    placeholder: '912345678',
  },
  {
    code: 'PE',
    name: 'Perú',
    dialCode: '+51',
    flag: '🇵🇪',
    minDigits: 9,
    maxDigits: 9,
    placeholder: '987654321',
  },
  {
    code: 'EC',
    name: 'Ecuador',
    dialCode: '+593',
    flag: '🇪🇨',
    minDigits: 9,
    maxDigits: 9,
    placeholder: '991234567',
  },
  {
    code: 'VE',
    name: 'Venezuela',
    dialCode: '+58',
    flag: '🇻🇪',
    minDigits: 10,
    maxDigits: 10,
    placeholder: '4121234567',
  },
  {
    code: 'PA',
    name: 'Panamá',
    dialCode: '+507',
    flag: '🇵🇦',
    minDigits: 8,
    maxDigits: 8,
    placeholder: '61234567',
  },
  {
    code: 'CR',
    name: 'Costa Rica',
    dialCode: '+506',
    flag: '🇨🇷',
    minDigits: 8,
    maxDigits: 8,
    placeholder: '81234567',
  },
  {
    code: 'UY',
    name: 'Uruguay',
    dialCode: '+598',
    flag: '🇺🇾',
    minDigits: 8,
    maxDigits: 9,
    placeholder: '91234567',
  },
  {
    code: 'PY',
    name: 'Paraguay',
    dialCode: '+595',
    flag: '🇵🇾',
    minDigits: 9,
    maxDigits: 9,
    placeholder: '981234567',
  },
  {
    code: 'BO',
    name: 'Bolivia',
    dialCode: '+591',
    flag: '🇧🇴',
    minDigits: 8,
    maxDigits: 8,
    placeholder: '71234567',
  },
  {
    code: 'GT',
    name: 'Guatemala',
    dialCode: '+502',
    flag: '🇬🇹',
    minDigits: 8,
    maxDigits: 8,
    placeholder: '51234567',
  },
  {
    code: 'SV',
    name: 'El Salvador',
    dialCode: '+503',
    flag: '🇸🇻',
    minDigits: 8,
    maxDigits: 8,
    placeholder: '71234567',
  },
  {
    code: 'HN',
    name: 'Honduras',
    dialCode: '+504',
    flag: '🇭🇳',
    minDigits: 8,
    maxDigits: 8,
    placeholder: '91234567',
  },
  {
    code: 'NI',
    name: 'Nicaragua',
    dialCode: '+505',
    flag: '🇳🇮',
    minDigits: 8,
    maxDigits: 8,
    placeholder: '81234567',
  },
  {
    code: 'DO',
    name: 'República Dominicana',
    dialCode: '+1',
    flag: '🇩🇴',
    minDigits: 10,
    maxDigits: 10,
    placeholder: '8091234567',
  },
  {
    code: 'US',
    name: 'Estados Unidos',
    dialCode: '+1',
    flag: '🇺🇸',
    minDigits: 10,
    maxDigits: 10,
    placeholder: '3051234567',
  },
  {
    code: 'ES',
    name: 'España',
    dialCode: '+34',
    flag: '🇪🇸',
    minDigits: 9,
    maxDigits: 9,
    placeholder: '612345678',
  },
  {
    code: 'BR',
    name: 'Brasil',
    dialCode: '+55',
    flag: '🇧🇷',
    minDigits: 10,
    maxDigits: 11,
    placeholder: '11912345678',
  },
];

/**
 * Keeps only numeric digits for a national phone input and strips a leading
 * country dial prefix when pasted with more digits than the country allows.
 */
export function sanitizeNationalPhoneDigits(
  raw: string,
  dialCode?: string,
  maxDigits?: number,
): string {
  let digits = raw.replace(/\D/g, '');
  if (dialCode) {
    const dialDigits = dialCode.replace(/\D/g, '');
    const prefixLimit =
      maxDigits ??
      COUNTRY_DIAL_OPTIONS.find((item) => item.dialCode === dialCode)?.maxDigits;
    if (
      dialDigits &&
      digits.startsWith(dialDigits) &&
      (prefixLimit !== undefined
        ? digits.length > prefixLimit
        : digits.length > dialDigits.length)
    ) {
      digits = digits.slice(dialDigits.length);
    }
  }
  if (maxDigits !== undefined && digits.length > maxDigits) {
    digits = digits.slice(0, maxDigits);
  }
  return digits;
}

/**
 * Validates national phone digits against the selected country's expected length.
 */
export function validateNationalPhone(
  digits: string,
  country: CountryDialOption,
): string | null {
  const trimmed = digits.trim();
  if (!trimmed) {
    return 'Ingresa tu número de teléfono.';
  }
  if (!/^\d+$/.test(trimmed)) {
    return 'Ingresa solo dígitos numéricos, sin espacios ni símbolos.';
  }
  if (
    trimmed.length < country.minDigits ||
    trimmed.length > country.maxDigits
  ) {
    if (country.minDigits === country.maxDigits) {
      return `Para ${country.name} (${country.dialCode}) el número debe tener ${country.minDigits} dígitos.`;
    }
    return `Para ${country.name} (${country.dialCode}) el número debe tener entre ${country.minDigits} y ${country.maxDigits} dígitos.`;
  }
  return null;
}

/**
 * Formats a dial code and national phone digits into E.164 format.
 */
export function formatE164Phone(
  dialCode: string,
  nationalDigits: string,
): string {
  return `${dialCode}${nationalDigits.replace(/\D/g, '')}`;
}
