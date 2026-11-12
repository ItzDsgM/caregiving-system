import type { DecimalValue, JwtPayload } from "./types";

const CURRENCY_FORMATTER = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

const DATE_FORMATTER = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * Coerces TypeORM `decimal` columns (serialized as numeric strings or numbers) to a finite number.
 */
export function toNumeric(value: DecimalValue | null | undefined, fallback = 0): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : fallback;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return fallback;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

/**
 * Coerces nullable TypeORM `decimal` values, returning `null` when absent or invalid.
 */
export function toNullableNumeric(value: DecimalValue | null | undefined): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatCOP(amount: DecimalValue | null | undefined, emptyFallback = "Por definir"): string {
  const num = toNullableNumeric(amount);
  if (num === null) {
    return emptyFallback;
  }
  return CURRENCY_FORMATTER.format(num);
}

export function formatCOPRange(
  min: DecimalValue | null | undefined,
  max: DecimalValue | null | undefined,
): string {
  const nMin = toNullableNumeric(min);
  const nMax = toNullableNumeric(max);
  if (nMin === null && nMax === null) return "Presupuesto por definir";
  if (nMin !== null && nMax !== null) {
    return nMin === nMax
      ? CURRENCY_FORMATTER.format(nMin)
      : `${CURRENCY_FORMATTER.format(nMin)} – ${CURRENCY_FORMATTER.format(nMax)}`;
  }
  return CURRENCY_FORMATTER.format(nMin ?? nMax ?? 0);
}

/**
 * Parses ISO date strings safely. Plain `YYYY-MM-DD` strings are anchored at local noon
 * to avoid UTC-offset day-shift (e.g., displaying Nov 9 instead of Nov 10 in UTC-5).
 */
export function parseSafeDate(input: string | Date | null | undefined): Date | null {
  if (!input) return null;
  if (input instanceof Date) {
    return Number.isNaN(input.getTime()) ? null : input;
  }
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input.trim());
  if (dateOnlyMatch) {
    const year = Number(dateOnlyMatch[1]);
    const month = Number(dateOnlyMatch[2]) - 1;
    const day = Number(dateOnlyMatch[3]);
    return new Date(year, month, day, 12, 0, 0);
  }
  const parsed = new Date(input);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDate(input: string | Date | null | undefined, withTime = false): string {
  const date = parseSafeDate(input);
  if (!date) return "—";
  return withTime ? DATE_TIME_FORMATTER.format(date) : DATE_FORMATTER.format(date);
}

export function formatDateRange(startDate: string, endDate: string): string {
  return `${formatDate(startDate)} – ${formatDate(endDate)}`;
}

/**
 * Returns today's date in YYYY-MM-DD local format for `<input type="date" min={...}>`.
 */
export function getTodayInputDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function toInputDate(input: string | Date | null | undefined): string {
  const date = parseSafeDate(input);
  if (!date) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatRelativeTime(isoDate: string): string {
  const date = parseSafeDate(isoDate);
  if (!date) return "—";
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Ahora";
  if (diffMins < 60) return `Hace ${diffMins} min`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `Hace ${diffHours} h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Ayer";
  if (diffDays < 30) return `Hace ${diffDays} días`;
  return formatDate(date);
}

/**
 * Privacy-preserving public display name: `"María G."`
 */
export function formatMaskedName(
  firstName?: string | null,
  lastName?: string | null,
  fallback = "Cuidador",
): string {
  const first = (firstName || "").trim();
  const last = (lastName || "").trim();
  if (!first && !last) return fallback;
  if (!last) return first;
  return `${first} ${last.charAt(0).toUpperCase()}.`.trim();
}

export function formatFullName(
  firstName?: string | null,
  lastName?: string | null,
  fallback = "Usuario",
): string {
  const combined = `${(firstName || "").trim()} ${(lastName || "").trim()}`.trim();
  return combined || fallback;
}

export function getInitials(
  firstName?: string | null,
  lastName?: string | null,
): string {
  const f = (firstName || "").trim().charAt(0).toUpperCase();
  const l = (lastName || "").trim().charAt(0).toUpperCase();
  return `${f}${l}` || "CC";
}

export function formatMaskedEmail(email: string): string {
  const trimmed = (email || "").trim();
  const atIndex = trimmed.indexOf("@");
  if (atIndex <= 1) return trimmed;
  const local = trimmed.slice(0, atIndex);
  const domain = trimmed.slice(atIndex);
  return `${local.charAt(0)}${"*".repeat(Math.min(Math.max(local.length - 1, 2), 5))}${domain}`;
}

export function formatDurationEs(durationDays: number): string {
  const safeDays = Math.max(1, Math.round(durationDays));
  if (safeDays === 1) return "1 día";
  if (safeDays < 30) return `${safeDays} días`;
  const months = Math.floor(safeDays / 30);
  const remDays = safeDays % 30;
  const monthLabel = months === 1 ? "1 mes" : `${months} meses`;
  if (remDays === 0) return monthLabel;
  return `${monthLabel} ${remDays} ${remDays === 1 ? "día" : "días"}`;
}

export function getApiOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";
  return raw.replace(/\/api\/v1\/?$/i, "").replace(/\/+$/, "");
}

/**
 * Resolves a backend relative upload path (`/uploads/documents/...`) to its full origin URL.
 */
export function resolveDocumentUrl(fileUrl?: string | null): string | null {
  if (!fileUrl) return null;
  const trimmed = fileUrl.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const origin = getApiOrigin();
  return `${origin}/${trimmed.replace(/^\/+/, "")}`;
}

export function isImageDocumentUrl(fileUrl?: string | null): boolean {
  if (!fileUrl) return false;
  return /\.(png|jpe?g|webp|gif)(\?.*)?$/i.test(fileUrl);
}

export function isPdfDocumentUrl(fileUrl?: string | null): boolean {
  if (!fileUrl) return false;
  return /\.pdf(\?.*)?$/i.test(fileUrl);
}

function escapeCsvCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return "";
  let str = String(value);
  // Prevent CSV formula injection when opened in Excel/Sheets
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildCsvString(
  headers: string[],
  rows: Array<Array<string | number | boolean | null | undefined>>,
): string {
  const headerLine = headers.map(escapeCsvCell).join(",");
  const rowLines = rows.map((row) => row.map(escapeCsvCell).join(","));
  return `\uFEFF${[headerLine, ...rowLines].join("\r\n")}`;
}

export function downloadCsv(
  filename: string,
  headers: string[],
  rows: Array<Array<string | number | boolean | null | undefined>>,
): void {
  if (typeof window === "undefined") return;
  const csv = buildCsvString(headers, rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3 || !parts[1]) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");

    let json: string;
    if (typeof globalThis.atob === "function") {
      const binary = globalThis.atob(padded);
      const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
      json = new TextDecoder().decode(bytes);
    } else {
      json = Buffer.from(padded, "base64").toString("utf-8");
    }

    const parsed = JSON.parse(json) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as JwtPayload;
  } catch {
    return null;
  }
}

export function isJwtExpired(payload: JwtPayload | null): boolean {
  if (!payload || typeof payload.exp !== "number") return true;
  return payload.exp * 1000 <= Date.now();
}
