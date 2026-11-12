'use client';

import React, { useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import { jobOffersApi } from '@/lib/api';
import { CARE_SPECIALTY_OPTIONS, COLOMBIAN_CITIES } from '@/lib/constants';
import { formatCOP, toInputDate, toNumeric } from '@/lib/format';
import type { MyJobOfferItem, UpdateJobOfferPayload } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { ModalDialog } from '@/components/ui/ModalDialog';
import { SchedulePicker } from '@/components/ui/SchedulePicker';
import { useToast } from '@/components/ui/ToastRegion';
import { InlineErrorAlert, resolveClientErrorMessage } from './ClientUiHelpers';
import {
  OFFER_DESCRIPTION_MIN,
  OFFER_TITLE_MIN,
  validateOfferForm,
  type OfferFormField,
  type OfferFormValues,
} from './offerValidation';
import { useUtcTodayInputDate } from './storage';

export interface EditOfferModalDialogProps {
  offer: MyJobOfferItem | null;
  onClose: () => void;
  onUpdated: (updated: MyJobOfferItem) => void;
}

function EditOfferModalForm({
  offer,
  onClose,
  onUpdated,
}: {
  offer: MyJobOfferItem;
  onClose: () => void;
  onUpdated: (updated: MyJobOfferItem) => void;
}) {
  const toast = useToast();
  const todayUtc = useUtcTodayInputDate();

  const initialStart = toInputDate(offer.startDate);
  const initialEnd = toInputDate(offer.endDate);

  const [values, setValues] = useState<OfferFormValues>({
    careType: offer.careType,
    title: offer.title,
    description: offer.description,
    locationCity: offer.locationCity,
    locationZone: offer.locationZone,
    startDate: initialStart,
    endDate: initialEnd,
    budgetMin: String(toNumeric(offer.budgetMin, 0)),
    budgetMax: String(toNumeric(offer.budgetMax, 0)),
    requiredSchedule: offer.requiredSchedule ?? [],
  });
  const [touched, setTouched] = useState<Partial<Record<OfferFormField, boolean>>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const startDateChanged = values.startDate !== initialStart;

  const allErrors = useMemo(
    () =>
      validateOfferForm(values, {
        todayUtc,
        enforceFutureStart: startDateChanged,
      }),
    [values, todayUtc, startDateChanged],
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
      return;
    }

    const payload: UpdateJobOfferPayload = {
      title: values.title.trim(),
      description: values.description.trim(),
      careType: values.careType,
      locationCity: values.locationCity.trim(),
      locationZone: values.locationZone.trim(),
      requiredSchedule: values.requiredSchedule,
      budgetMin: Number(values.budgetMin),
      budgetMax: Number(values.budgetMax),
    };

    if (values.startDate !== initialStart) {
      payload.startDate = values.startDate;
    }
    if (values.endDate !== initialEnd) {
      payload.endDate = values.endDate;
    }

    setIsSubmitting(true);
    try {
      const updated = await jobOffersApi.update(offer.id, payload);
      onClose();
      onUpdated({
        ...updated,
        applicationsCount: offer.applicationsCount,
      });
      toast.success('Oferta actualizada', 'Los cambios han sido guardados.');
    } catch (err) {
      setApiError(
        resolveClientErrorMessage(
          err,
          'No pudimos guardar los cambios de la oferta.',
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <InlineErrorAlert
        message={apiError}
        title="No se pudieron guardar los cambios"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label
            htmlFor="edit-offer-title"
            className="block text-sm font-medium text-slate-900"
          >
            Título
          </label>
          <input
            id="edit-offer-title"
            type="text"
            required
            minLength={OFFER_TITLE_MIN}
            value={values.title}
            aria-invalid={Boolean(getFieldError('title')) || undefined}
            onChange={(e) => updateField('title', e.target.value)}
            onBlur={() => markTouched('title')}
            className="mt-1 block h-10 w-full rounded-[8px] border border-slate-300 px-3 text-sm text-slate-900 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
          />
          {getFieldError('title') ? (
            <p className="mt-1 text-xs font-medium text-rose-600">
              {getFieldError('title')}
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="edit-offer-caretype"
            className="block text-sm font-medium text-slate-900"
          >
            Especialidad
          </label>
          <select
            id="edit-offer-caretype"
            value={values.careType}
            onChange={(e) =>
              updateField('careType', e.target.value as OfferFormValues['careType'])
            }
            className="mt-1 block h-10 w-full rounded-[8px] border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
          >
            {CARE_SPECIALTY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="edit-offer-city"
            className="block text-sm font-medium text-slate-900"
          >
            Ciudad
          </label>
          <input
            id="edit-offer-city"
            type="text"
            list="edit-offer-cities"
            required
            value={values.locationCity}
            aria-invalid={Boolean(getFieldError('locationCity')) || undefined}
            onChange={(e) => updateField('locationCity', e.target.value)}
            onBlur={() => markTouched('locationCity')}
            className="mt-1 block h-10 w-full rounded-[8px] border border-slate-300 px-3 text-sm text-slate-900 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
          />
          <datalist id="edit-offer-cities">
            {COLOMBIAN_CITIES.map((city) => (
              <option key={city} value={city} />
            ))}
          </datalist>
          {getFieldError('locationCity') ? (
            <p className="mt-1 text-xs font-medium text-rose-600">
              {getFieldError('locationCity')}
            </p>
          ) : null}
        </div>

        <div className="sm:col-span-2">
          <label
            htmlFor="edit-offer-zone"
            className="block text-sm font-medium text-slate-900"
          >
            Zona o barrio
          </label>
          <input
            id="edit-offer-zone"
            type="text"
            required
            value={values.locationZone}
            aria-invalid={Boolean(getFieldError('locationZone')) || undefined}
            onChange={(e) => updateField('locationZone', e.target.value)}
            onBlur={() => markTouched('locationZone')}
            className="mt-1 block h-10 w-full rounded-[8px] border border-slate-300 px-3 text-sm text-slate-900 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
          />
          {getFieldError('locationZone') ? (
            <p className="mt-1 text-xs font-medium text-rose-600">
              {getFieldError('locationZone')}
            </p>
          ) : null}
        </div>

        <div className="sm:col-span-2">
          <label
            htmlFor="edit-offer-description"
            className="block text-sm font-medium text-slate-900"
          >
            Descripción
          </label>
          <textarea
            id="edit-offer-description"
            rows={3}
            required
            minLength={OFFER_DESCRIPTION_MIN}
            value={values.description}
            aria-invalid={Boolean(getFieldError('description')) || undefined}
            onChange={(e) => updateField('description', e.target.value)}
            onBlur={() => markTouched('description')}
            className="mt-1 block w-full rounded-[8px] border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
          />
          {getFieldError('description') ? (
            <p className="mt-1 text-xs font-medium text-rose-600">
              {getFieldError('description')}
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="edit-offer-start"
            className="block text-sm font-medium text-slate-900"
          >
            Fecha de inicio
          </label>
          <input
            id="edit-offer-start"
            type="date"
            required
            value={values.startDate}
            aria-invalid={Boolean(getFieldError('startDate')) || undefined}
            onChange={(e) => updateField('startDate', e.target.value)}
            onBlur={() => markTouched('startDate')}
            className="mt-1 block h-10 w-full rounded-[8px] border border-slate-300 px-3 font-mono text-sm text-slate-900 tabular-nums focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
          />
          {getFieldError('startDate') ? (
            <p className="mt-1 text-xs font-medium text-rose-600">
              {getFieldError('startDate')}
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="edit-offer-end"
            className="block text-sm font-medium text-slate-900"
          >
            Fecha de finalización
          </label>
          <input
            id="edit-offer-end"
            type="date"
            required
            min={values.startDate || undefined}
            value={values.endDate}
            aria-invalid={Boolean(getFieldError('endDate')) || undefined}
            onChange={(e) => updateField('endDate', e.target.value)}
            onBlur={() => markTouched('endDate')}
            className="mt-1 block h-10 w-full rounded-[8px] border border-slate-300 px-3 font-mono text-sm text-slate-900 tabular-nums focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
          />
          {getFieldError('endDate') ? (
            <p className="mt-1 text-xs font-medium text-rose-600">
              {getFieldError('endDate')}
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="edit-offer-bmin"
            className="block text-sm font-medium text-slate-900"
          >
            Presupuesto mínimo (COP)
          </label>
          <input
            id="edit-offer-bmin"
            type="number"
            min={1}
            step={1000}
            required
            value={values.budgetMin}
            aria-invalid={Boolean(getFieldError('budgetMin')) || undefined}
            onChange={(e) => updateField('budgetMin', e.target.value)}
            onBlur={() => markTouched('budgetMin')}
            className="mt-1 block h-10 w-full rounded-[8px] border border-slate-300 px-3 font-mono text-sm text-slate-900 tabular-nums focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
          />
          {getFieldError('budgetMin') ? (
            <p className="mt-1 text-xs font-medium text-rose-600">
              {getFieldError('budgetMin')}
            </p>
          ) : (
            <p className="mt-1 font-mono text-xs text-slate-500 tabular-nums">
              {formatCOP(values.budgetMin)}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="edit-offer-bmax"
            className="block text-sm font-medium text-slate-900"
          >
            Presupuesto máximo (COP)
          </label>
          <input
            id="edit-offer-bmax"
            type="number"
            min={1}
            step={1000}
            required
            value={values.budgetMax}
            aria-invalid={Boolean(getFieldError('budgetMax')) || undefined}
            onChange={(e) => updateField('budgetMax', e.target.value)}
            onBlur={() => markTouched('budgetMax')}
            className="mt-1 block h-10 w-full rounded-[8px] border border-slate-300 px-3 font-mono text-sm text-slate-900 tabular-nums focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
          />
          {getFieldError('budgetMax') ? (
            <p className="mt-1 text-xs font-medium text-rose-600">
              {getFieldError('budgetMax')}
            </p>
          ) : (
            <p className="mt-1 font-mono text-xs text-slate-500 tabular-nums">
              {formatCOP(values.budgetMax)}
            </p>
          )}
        </div>

        <div className="sm:col-span-2">
          <span className="mb-2 block text-sm font-medium text-slate-900">
            Horarios por día
          </span>
          <SchedulePicker
            compact
            showPresets={false}
            value={values.requiredSchedule}
            onChange={(next) => {
              updateField('requiredSchedule', next);
              markTouched('requiredSchedule');
            }}
          />
          {getFieldError('requiredSchedule') ? (
            <p className="mt-1.5 text-xs font-medium text-rose-600">
              {getFieldError('requiredSchedule')}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 pt-4">
        <Button
          type="button"
          variant="secondary"
          disabled={isSubmitting}
          onClick={onClose}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          variant="primary"
          loading={isSubmitting}
          loadingText="Guardando..."
          leftIcon={<Save className="h-4 w-4" aria-hidden />}
        >
          Guardar Cambios
        </Button>
      </div>
    </form>
  );
}

export function EditOfferModalDialog({
  offer,
  onClose,
  onUpdated,
}: Readonly<EditOfferModalDialogProps>) {
  return (
    <ModalDialog
      open={Boolean(offer)}
      onClose={onClose}
      title="Editar Oferta Abierta"
      description="Actualiza los detalles mientras la oferta permanezca abierta a postulaciones."
      size="lg"
    >
      {offer ? (
        <EditOfferModalForm
          key={offer.id}
          offer={offer}
          onClose={onClose}
          onUpdated={onUpdated}
        />
      ) : null}
    </ModalDialog>
  );
}
