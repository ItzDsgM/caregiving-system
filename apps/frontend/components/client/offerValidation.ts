import { parseSafeDate } from '@/lib/format';
import type { AvailabilitySlot, CareSpecialty } from '@/lib/types';

export interface OfferFormValues {
  careType: CareSpecialty;
  title: string;
  description: string;
  locationCity: string;
  locationZone: string;
  startDate: string;
  endDate: string;
  budgetMin: string;
  budgetMax: string;
  requiredSchedule: AvailabilitySlot[];
}

export type OfferFormField =
  | 'title'
  | 'description'
  | 'locationCity'
  | 'locationZone'
  | 'startDate'
  | 'endDate'
  | 'budgetMin'
  | 'budgetMax'
  | 'requiredSchedule';

export type OfferFormErrors = Partial<Record<OfferFormField, string>>;

export const OFFER_TITLE_MIN = 10;
export const OFFER_DESCRIPTION_MIN = 30;

export function validateOfferForm(
  values: OfferFormValues,
  options: { todayUtc?: string; enforceFutureStart?: boolean } = {},
): OfferFormErrors {
  const errors: OfferFormErrors = {};
  const { todayUtc = '', enforceFutureStart = true } = options;

  if (values.title.trim().length < OFFER_TITLE_MIN) {
    errors.title = `El título debe tener al menos ${OFFER_TITLE_MIN} caracteres.`;
  }

  if (values.description.trim().length < OFFER_DESCRIPTION_MIN) {
    errors.description = `La descripción debe tener al menos ${OFFER_DESCRIPTION_MIN} caracteres.`;
  }

  if (!values.locationCity.trim()) {
    errors.locationCity = 'Ingresa la ciudad donde se prestará el servicio.';
  }

  if (!values.locationZone.trim()) {
    errors.locationZone = 'Ingresa la zona o barrio de referencia.';
  }

  if (!values.startDate) {
    errors.startDate = 'Selecciona la fecha de inicio.';
  } else if (enforceFutureStart && todayUtc && values.startDate < todayUtc) {
    errors.startDate = `La fecha de inicio debe ser igual o posterior a hoy UTC (${todayUtc}).`;
  }

  if (!values.endDate) {
    errors.endDate = 'Selecciona la fecha de finalización.';
  } else if (values.startDate && values.endDate < values.startDate) {
    errors.endDate = 'La fecha de finalización debe ser igual o posterior al inicio.';
  }

  const minVal = Number(values.budgetMin);
  const maxVal = Number(values.budgetMax);

  if (!values.budgetMin || !Number.isFinite(minVal) || minVal <= 0) {
    errors.budgetMin = 'Ingresa un presupuesto mínimo mayor a 0 COP.';
  }

  if (!values.budgetMax || !Number.isFinite(maxVal) || maxVal <= 0) {
    errors.budgetMax = 'Ingresa un presupuesto máximo mayor a 0 COP.';
  } else if (Number.isFinite(minVal) && minVal > 0 && maxVal < minVal) {
    errors.budgetMax = 'El presupuesto máximo debe ser mayor o igual al mínimo.';
  }

  const hasValidSlot = values.requiredSchedule.some(
    (slot) => Array.isArray(slot.shifts) && slot.shifts.length > 0,
  );
  if (!hasValidSlot) {
    errors.requiredSchedule =
      'Selecciona al menos un día y turno en la matriz de horarios.';
  }

  return errors;
}

export function calculateInclusiveDays(
  startDate: string,
  endDate: string,
): number | null {
  const start = parseSafeDate(startDate);
  const end = parseSafeDate(endDate);
  if (!start || !end) return null;
  const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return null;
  return diff + 1;
}
