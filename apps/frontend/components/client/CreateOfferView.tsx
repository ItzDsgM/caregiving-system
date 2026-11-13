'use client';

import React, { useId, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  CheckCircle2,
  Clock,
  MapPin,
  Send,
  Sparkles,
} from 'lucide-react';
import { jobOffersApi } from '@/lib/api';
import {
  CARE_SPECIALTY_LABELS,
  CARE_SPECIALTY_OPTIONS,
  COLOMBIAN_CITIES,
} from '@/lib/constants';
import {
  formatCOP,
  formatCOPRange,
  formatDateRange,
  formatDurationEs,
  toNullableNumeric,
} from '@/lib/format';
import { Button, buttonVariants } from '@/components/ui/Button';
import {
  FormCardSkeleton,
  PageSkeletonTransition,
} from '@/components/ui/PageSkeletons';
import { SchedulePicker } from '@/components/ui/SchedulePicker';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/ToastRegion';
import {
  ClientPageHeader,
  CompactScheduleSummary,
  InlineErrorAlert,
  resolveClientErrorMessage,
} from './ClientUiHelpers';
import {
  OFFER_DESCRIPTION_MIN,
  OFFER_TITLE_MIN,
  calculateInclusiveDays,
  validateOfferForm,
  type OfferFormField,
  type OfferFormValues,
} from './offerValidation';
import { useUtcTodayInputDate } from './storage';

const INITIAL_VALUES: OfferFormValues = {
  careType: 'ELDERLY_CARE',
  title: '',
  description: '',
  locationCity: 'Bogotá',
  locationZone: '',
  startDate: '',
  endDate: '',
  budgetMin: '',
  budgetMax: '',
  requiredSchedule: [],
};

export function CreateOfferView() {
  const router = useRouter();
  const toast = useToast();
  const todayUtc = useUtcTodayInputDate();
  const cityDatalistId = useId();

  const [values, setValues] = useState<OfferFormValues>(INITIAL_VALUES);
  const [touched, setTouched] = useState<Partial<Record<OfferFormField, boolean>>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const allErrors = useMemo(
    () =>
      validateOfferForm(values, {
        todayUtc,
        enforceFutureStart: true,
      }),
    [values, todayUtc],
  );

  const getFieldError = (field: OfferFormField): string | undefined => {
    if (!submitAttempted && !touched[field]) {
      return undefined;
    }
    return allErrors[field];
  };

  const markTouched = (field: OfferFormField) => {
    setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true }));
  };

  const updateField = <K extends keyof OfferFormValues>(
    field: K,
    nextValue: OfferFormValues[K],
  ) => {
    setValues((prev) => ({ ...prev, [field]: nextValue }));
    if (apiError) setApiError(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitAttempted(true);
    setApiError(null);

    if (Object.keys(allErrors).length > 0) {
      toast.warning(
        'Revisa los campos marcados',
        'Completa todos los requisitos mínimos antes de publicar tu oferta.',
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await jobOffersApi.create({
        title: values.title.trim(),
        description: values.description.trim(),
        careType: values.careType,
        locationCity: values.locationCity.trim(),
        locationZone: values.locationZone.trim(),
        startDate: values.startDate,
        endDate: values.endDate,
        requiredSchedule: values.requiredSchedule,
        budgetMin: Number(values.budgetMin),
        budgetMax: Number(values.budgetMax),
      });

      toast.success(
        'Oferta publicada con éxito',
        'Los cuidadores verificados ya pueden revisar tu solicitud y postular.',
      );
      router.push('/client/offers');
    } catch (err) {
      const msg = resolveClientErrorMessage(
        err,
        'No se pudo publicar la oferta. Verifica los datos e intenta nuevamente.',
      );
      setApiError(msg);
      toast.apiError(err, msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const previewDurationDays = calculateInclusiveDays(
    values.startDate,
    values.endDate,
  );
  const parsedMin = toNullableNumeric(values.budgetMin);
  const parsedMax = toNullableNumeric(values.budgetMax);

  const stepReadiness = [
    {
      label: 'Tipo y descripción',
      done:
        values.title.trim().length >= OFFER_TITLE_MIN &&
        values.description.trim().length >= OFFER_DESCRIPTION_MIN,
    },
    {
      label: 'Ciudad y zona',
      done: Boolean(values.locationCity.trim() && values.locationZone.trim()),
    },
    {
      label: 'Fechas y presupuesto',
      done:
        !allErrors.startDate &&
        !allErrors.endDate &&
        !allErrors.budgetMin &&
        !allErrors.budgetMax,
    },
    {
      label: 'Horarios por día',
      done: !allErrors.requiredSchedule,
    },
  ];

  const titleError = getFieldError('title');
  const descriptionError = getFieldError('description');
  const cityError = getFieldError('locationCity');
  const zoneError = getFieldError('locationZone');
  const startDateError = getFieldError('startDate');
  const endDateError = getFieldError('endDate');
  const budgetMinError = getFieldError('budgetMin');
  const budgetMaxError = getFieldError('budgetMax');
  const scheduleError = getFieldError('requiredSchedule');

  return (
    <PageSkeletonTransition skeleton={<FormCardSkeleton withPreview />}>
    <div className="mx-auto max-w-6xl space-y-6">
      <ClientPageHeader
        backHref="/client/offers"
        backLabel="Volver a Mis Ofertas"
        title="Publicar Nueva Oferta"
        description="Describe el tipo de asistencia, fechas, presupuesto y jornadas que necesitas. Tu contacto personal permanece oculto hasta que aceptes a un cuidador."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
        {/* Left 8 cols: 4 fieldset cards */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="space-y-6 lg:col-span-8"
        >
          <InlineErrorAlert
            message={apiError}
            title="Error al publicar la oferta"
          />

          {/* Fieldset 1: Tipo de Cuidado */}
          <fieldset className="rounded-[12px] border border-slate-200 bg-white p-6">
            <legend className="px-1 text-base font-semibold text-slate-900">
              1. Tipo de Cuidado
            </legend>
            <p className="mt-1 text-xs text-slate-500">
              Selecciona la especialidad principal y describe con claridad las necesidades de la persona a cuidar.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {CARE_SPECIALTY_OPTIONS.map((option) => {
                const isSelected = values.careType === option.value;
                return (
                  <label
                    key={option.value}
                    className={`flex cursor-pointer items-start gap-3 rounded-[12px] border p-4 transition-colors ${
                      isSelected
                        ? 'border-teal-600 bg-teal-50/50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="careType"
                      value={option.value}
                      checked={isSelected}
                      onChange={() => updateField('careType', option.value)}
                      className="mt-1 h-4 w-4 shrink-0"
                    />
                    <div className="min-w-0">
                      <span className="block text-sm font-semibold text-slate-900">
                        {option.label}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-slate-600">
                        {option.description}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor="offer-title"
                    className="block text-sm font-medium text-slate-900"
                  >
                    Título de la oferta
                  </label>
                  <span
                    className={`tabular-nums font-mono text-xs ${
                      values.title.trim().length >= OFFER_TITLE_MIN
                        ? 'text-teal-700'
                        : 'text-slate-500'
                    }`}
                  >
                    {values.title.trim().length}/{OFFER_TITLE_MIN} mín.
                  </span>
                </div>
                <input
                  id="offer-title"
                  type="text"
                  required
                  minLength={OFFER_TITLE_MIN}
                  value={values.title}
                  aria-invalid={Boolean(titleError) || undefined}
                  onChange={(e) => updateField('title', e.target.value)}
                  onBlur={() => markTouched('title')}
                  placeholder="Ej: Cuidador diurno con experiencia para adulto mayor"
                  className="mt-1.5 block h-10 w-full rounded-[8px] border border-slate-300 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
                />
                {titleError ? (
                  <p className="mt-1 text-xs font-medium text-rose-600">
                    {titleError}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-slate-500">
                    Resume el perfil requerido y la jornada en al menos {OFFER_TITLE_MIN} caracteres.
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor="offer-description"
                    className="block text-sm font-medium text-slate-900"
                  >
                    Descripción de responsabilidades y necesidades
                  </label>
                  <span
                    className={`tabular-nums font-mono text-xs ${
                      values.description.trim().length >= OFFER_DESCRIPTION_MIN
                        ? 'text-teal-700'
                        : 'text-slate-500'
                    }`}
                  >
                    {values.description.trim().length}/{OFFER_DESCRIPTION_MIN} mín.
                  </span>
                </div>
                <textarea
                  id="offer-description"
                  rows={4}
                  required
                  minLength={OFFER_DESCRIPTION_MIN}
                  value={values.description}
                  aria-invalid={Boolean(descriptionError) || undefined}
                  onChange={(e) => updateField('description', e.target.value)}
                  onBlur={() => markTouched('description')}
                  placeholder="Detalla apoyo en movilidad, recordatorio de medicamentos, alimentación, rutinas de acompañamiento y cualquier consideración médica..."
                  className="mt-1.5 block w-full rounded-[8px] border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
                />
                {descriptionError ? (
                  <p className="mt-1 text-xs font-medium text-rose-600">
                    {descriptionError}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-slate-500">
                    Mínimo {OFFER_DESCRIPTION_MIN} caracteres para ayudar a los cuidadores a evaluar si cumplen el perfil.
                  </p>
                )}
              </div>
            </div>
          </fieldset>

          {/* Fieldset 2: Ubicación */}
          <fieldset className="rounded-[12px] border border-slate-200 bg-white p-6">
            <legend className="px-1 text-base font-semibold text-slate-900">
              2. Ubicación del Servicio
            </legend>
            <p className="mt-1 text-xs text-slate-500">
              Solo mostramos la ciudad y el barrio de referencia; nunca publicamos tu dirección exacta.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="offer-city"
                  className="block text-sm font-medium text-slate-900"
                >
                  Ciudad
                </label>
                <input
                  id="offer-city"
                  type="text"
                  list={cityDatalistId}
                  required
                  value={values.locationCity}
                  aria-invalid={Boolean(cityError) || undefined}
                  onChange={(e) => updateField('locationCity', e.target.value)}
                  onBlur={() => markTouched('locationCity')}
                  placeholder="Ej: Bogotá"
                  className="mt-1.5 block h-10 w-full rounded-[8px] border border-slate-300 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
                />
                <datalist id={cityDatalistId}>
                  {COLOMBIAN_CITIES.map((city) => (
                    <option key={city} value={city} />
                  ))}
                </datalist>
                {cityError ? (
                  <p className="mt-1 text-xs font-medium text-rose-600">
                    {cityError}
                  </p>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {COLOMBIAN_CITIES.slice(0, 5).map((city) => (
                    <button
                      key={city}
                      type="button"
                      onClick={() => updateField('locationCity', city)}
                      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors cursor-pointer ${
                        values.locationCity === city
                          ? 'border-teal-600 bg-teal-50 text-teal-800'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {city}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label
                  htmlFor="offer-zone"
                  className="block text-sm font-medium text-slate-900"
                >
                  Zona o barrio
                </label>
                <input
                  id="offer-zone"
                  type="text"
                  required
                  value={values.locationZone}
                  aria-invalid={Boolean(zoneError) || undefined}
                  onChange={(e) => updateField('locationZone', e.target.value)}
                  onBlur={() => markTouched('locationZone')}
                  placeholder="Ej: Chapinero Alto, El Poblado, Ciudad Jardín"
                  className="mt-1.5 block h-10 w-full rounded-[8px] border border-slate-300 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
                />
                {zoneError ? (
                  <p className="mt-1 text-xs font-medium text-rose-600">
                    {zoneError}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-slate-500">
                    Ayuda a los cuidadores a estimar tiempos de desplazamiento.
                  </p>
                )}
              </div>
            </div>
          </fieldset>

          {/* Fieldset 3: Fechas y Presupuesto */}
          <fieldset className="rounded-[12px] border border-slate-200 bg-white p-6">
            <legend className="px-1 text-base font-semibold text-slate-900">
              3. Fechas y Presupuesto
            </legend>
            <p className="mt-1 text-xs text-slate-500">
              Define el periodo del servicio y el rango económico estimado en pesos colombianos (COP).
            </p>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="offer-start-date"
                  className="block text-sm font-medium text-slate-900"
                >
                  Fecha de inicio
                </label>
                <input
                  id="offer-start-date"
                  type="date"
                  required
                  min={todayUtc || undefined}
                  value={values.startDate}
                  aria-invalid={Boolean(startDateError) || undefined}
                  onChange={(e) => updateField('startDate', e.target.value)}
                  onBlur={() => markTouched('startDate')}
                  className="mt-1.5 block h-10 w-full rounded-[8px] border border-slate-300 bg-white px-3.5 font-mono text-sm text-slate-900 tabular-nums focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
                />
                {startDateError ? (
                  <p className="mt-1 text-xs font-medium text-rose-600">
                    {startDateError}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-slate-500">
                    {todayUtc
                      ? `Debe ser igual o posterior a ${todayUtc} (UTC).`
                      : 'Debe ser hoy o una fecha futura.'}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="offer-end-date"
                  className="block text-sm font-medium text-slate-900"
                >
                  Fecha de finalización
                </label>
                <input
                  id="offer-end-date"
                  type="date"
                  required
                  min={values.startDate || todayUtc || undefined}
                  value={values.endDate}
                  aria-invalid={Boolean(endDateError) || undefined}
                  onChange={(e) => updateField('endDate', e.target.value)}
                  onBlur={() => markTouched('endDate')}
                  className="mt-1.5 block h-10 w-full rounded-[8px] border border-slate-300 bg-white px-3.5 font-mono text-sm text-slate-900 tabular-nums focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
                />
                {endDateError ? (
                  <p className="mt-1 text-xs font-medium text-rose-600">
                    {endDateError}
                  </p>
                ) : previewDurationDays ? (
                  <p className="mt-1 text-xs font-medium text-teal-700">
                    Duración estimada:{' '}
                    <span className="font-mono tabular-nums">
                      {formatDurationEs(previewDurationDays)}
                    </span>
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-slate-500">
                    Igual o posterior a la fecha de inicio.
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="offer-budget-min"
                  className="block text-sm font-medium text-slate-900"
                >
                  Presupuesto mínimo (COP)
                </label>
                <input
                  id="offer-budget-min"
                  type="number"
                  inputMode="numeric"
                  required
                  min={1}
                  step={1000}
                  value={values.budgetMin}
                  aria-invalid={Boolean(budgetMinError) || undefined}
                  onChange={(e) => updateField('budgetMin', e.target.value)}
                  onBlur={() => markTouched('budgetMin')}
                  placeholder="Ej: 800000"
                  className="mt-1.5 block h-10 w-full rounded-[8px] border border-slate-300 bg-white px-3.5 font-mono text-sm text-slate-900 tabular-nums placeholder:font-sans placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
                />
                {budgetMinError ? (
                  <p className="mt-1 text-xs font-medium text-rose-600">
                    {budgetMinError}
                  </p>
                ) : (
                  <p className="mt-1 font-mono text-xs text-slate-600 tabular-nums">
                    {parsedMin && parsedMin > 0
                      ? formatCOP(parsedMin)
                      : 'Ingresa el valor mínimo en pesos COP'}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="offer-budget-max"
                  className="block text-sm font-medium text-slate-900"
                >
                  Presupuesto máximo (COP)
                </label>
                <input
                  id="offer-budget-max"
                  type="number"
                  inputMode="numeric"
                  required
                  min={1}
                  step={1000}
                  value={values.budgetMax}
                  aria-invalid={Boolean(budgetMaxError) || undefined}
                  onChange={(e) => updateField('budgetMax', e.target.value)}
                  onBlur={() => markTouched('budgetMax')}
                  placeholder="Ej: 1200000"
                  className="mt-1.5 block h-10 w-full rounded-[8px] border border-slate-300 bg-white px-3.5 font-mono text-sm text-slate-900 tabular-nums placeholder:font-sans placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
                />
                {budgetMaxError ? (
                  <p className="mt-1 text-xs font-medium text-rose-600">
                    {budgetMaxError}
                  </p>
                ) : (
                  <p className="mt-1 font-mono text-xs text-slate-600 tabular-nums">
                    {parsedMax && parsedMax > 0
                      ? formatCOP(parsedMax)
                      : 'Mayor o igual al presupuesto mínimo'}
                  </p>
                )}
              </div>
            </div>
          </fieldset>

          {/* Fieldset 4: Horarios por Día */}
          <fieldset className="rounded-[12px] border border-slate-200 bg-white p-6">
            <legend className="px-1 text-base font-semibold text-slate-900">
              4. Horarios Requeridos por Día
            </legend>
            <p className="mt-1 text-xs text-slate-500">
              Marca los días y jornadas en los que necesitas acompañamiento.
            </p>

            <div className="mt-4">
              <SchedulePicker
                value={values.requiredSchedule}
                onChange={(next) => {
                  updateField('requiredSchedule', next);
                  markTouched('requiredSchedule');
                }}
              />
            </div>

            {scheduleError ? (
              <p className="mt-2 text-xs font-medium text-rose-600">
                {scheduleError}
              </p>
            ) : null}
          </fieldset>

          <div className="flex flex-wrap items-center justify-end gap-3 rounded-[12px] border border-slate-200 bg-white px-6 py-4">
            <Link
              href="/client/offers"
              className={buttonVariants({ variant: 'secondary', size: 'md' })}
            >
              Cancelar
            </Link>
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={isSubmitting}
              loadingText="Publicando oferta..."
              leftIcon={<Send className="h-4 w-4" aria-hidden />}
            >
              Publicar Oferta
            </Button>
          </div>
        </form>

        {/* Right 4 cols: Sticky Live Preview */}
        <aside className="space-y-4 lg:sticky lg:top-24 lg:col-span-4">
          <div className="rounded-[12px] border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-teal-700">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                Vista previa pública
              </span>
              <StatusBadge status="OPEN" domain="jobOffer" />
            </div>

            <div className="mt-4 space-y-3">
              <span className="inline-block rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-800">
                {CARE_SPECIALTY_LABELS[values.careType]}
              </span>

              <h2 className="text-base font-bold text-slate-900">
                {values.title.trim() ||
                  'Título de tu oferta aparecerá aquí'}
              </h2>

              <p className="line-clamp-4 text-xs leading-5 text-slate-600">
                {values.description.trim() ||
                  'Aquí se mostrará la descripción detallada de los cuidados, rutinas y responsabilidades.'}
              </p>

              <div className="space-y-2 border-t border-slate-100 pt-3 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                  <span>
                    {values.locationCity.trim() || 'Ciudad'} —{' '}
                    {values.locationZone.trim() || 'Zona / Barrio'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                  <span>
                    {values.startDate && values.endDate
                      ? formatDateRange(values.startDate, values.endDate)
                      : 'Fechas por definir'}
                  </span>
                  {previewDurationDays ? (
                    <span className="font-mono text-[11px] font-semibold text-teal-700 tabular-nums">
                      ({formatDurationEs(previewDurationDays)})
                    </span>
                  ) : null}
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                  <span className="font-mono font-semibold text-slate-900 tabular-nums">
                    {parsedMin || parsedMax
                      ? formatCOPRange(parsedMin, parsedMax)
                      : 'Presupuesto por definir'}
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Turnos solicitados
                </p>
                <CompactScheduleSummary
                  schedule={values.requiredSchedule}
                  maxDays={7}
                  emptyLabel="Selecciona al menos 1 turno"
                />
              </div>
            </div>
          </div>

          <div className="rounded-[12px] border border-slate-200 bg-white p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-700">
              Lista de verificación
            </h3>
            <ul className="mt-3 space-y-2">
              {stepReadiness.map((step) => (
                <li
                  key={step.label}
                  className="flex items-center gap-2.5 text-xs"
                >
                  <CheckCircle2
                    className={`h-4 w-4 shrink-0 ${
                      step.done ? 'text-emerald-600' : 'text-slate-300'
                    }`}
                    aria-hidden
                  />
                  <span
                    className={
                      step.done
                        ? 'font-medium text-slate-800'
                        : 'text-slate-500'
                    }
                  >
                    {step.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
    </PageSkeletonTransition>
  );
}
