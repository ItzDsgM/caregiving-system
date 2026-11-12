'use client';

import React from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  RefreshCw,
} from 'lucide-react';
import { ApiError, extractErrorMessage } from '@/lib/api';
import {
  DAY_OF_WEEK_ORDER,
  DAY_OF_WEEK_SHORT_LABELS,
  SHIFT_TYPE_SHORT_LABELS,
} from '@/lib/constants';
import type { AvailabilitySlot, DayOfWeek } from '@/lib/types';
import { Button } from '@/components/ui/Button';

export function resolveClientErrorMessage(
  err: unknown,
  fallback = 'No pudimos cargar la información. Intenta nuevamente.',
): string {
  if (err instanceof ApiError) {
    return err.message || extractErrorMessage(err.rawMessage, err.statusCode);
  }
  if (err instanceof Error && err.message.trim().length > 0) {
    return err.message;
  }
  return fallback;
}

export interface ClientPageHeaderProps {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  actions?: React.ReactNode;
}

export function ClientPageHeader({
  title,
  description,
  backHref,
  backLabel = 'Volver',
  actions,
}: Readonly<ClientPageHeaderProps>) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        {backHref ? (
          <Link
            href={backHref}
            className="mb-2 inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 transition-colors hover:text-teal-700"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            <span>{backLabel}</span>
          </Link>
        ) : null}
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
            {description}
          </p>
        ) : null}
      </div>

      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2.5">
          {actions}
        </div>
      ) : null}
    </div>
  );
}

export interface InlineErrorAlertProps {
  message: string | null | undefined;
  title?: string;
  className?: string;
}

export function InlineErrorAlert({
  message,
  title = 'No se pudo completar la acción',
  className = '',
}: Readonly<InlineErrorAlertProps>) {
  if (!message) {
    return null;
  }

  return (
    <div
      role="alert"
      className={`flex items-start gap-2.5 rounded-[8px] border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-800 ${className}`}
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden />
      <div className="min-w-0">
        <p className="font-semibold text-rose-900">{title}</p>
        <p className="mt-0.5 text-xs leading-5 text-rose-700">{message}</p>
      </div>
    </div>
  );
}

export interface SectionErrorCardProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function SectionErrorCard({
  title = 'Error al cargar los datos',
  message,
  onRetry,
}: Readonly<SectionErrorCardProps>) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start justify-between gap-4 rounded-[12px] border border-rose-200 bg-rose-50/70 p-5 sm:flex-row sm:items-center"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-700">
          <AlertCircle className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-rose-950">{title}</h2>
          <p className="mt-0.5 text-sm text-rose-800">{message}</p>
        </div>
      </div>

      {onRetry ? (
        <Button
          variant="secondary"
          size="sm"
          onClick={onRetry}
          leftIcon={<RefreshCw className="h-3.5 w-3.5" aria-hidden />}
        >
          Reintentar
        </Button>
      ) : null}
    </div>
  );
}

export interface CompactScheduleSummaryProps {
  schedule: ReadonlyArray<AvailabilitySlot>;
  maxDays?: number;
  emptyLabel?: string;
  className?: string;
}

export function CompactScheduleSummary({
  schedule,
  maxDays = 5,
  emptyLabel = 'Sin horarios definidos',
  className = '',
}: Readonly<CompactScheduleSummaryProps>) {
  if (!schedule || schedule.length === 0) {
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs text-slate-500 ${className}`}>
        <CalendarDays className="h-3.5 w-3.5" aria-hidden />
        {emptyLabel}
      </span>
    );
  }

  const orderIndex = new Map<DayOfWeek, number>(
    DAY_OF_WEEK_ORDER.map((day, idx) => [day, idx]),
  );

  const sorted = [...schedule]
    .filter((slot) => slot.shifts && slot.shifts.length > 0)
    .sort((a, b) => (orderIndex.get(a.day) ?? 99) - (orderIndex.get(b.day) ?? 99));

  const visible = sorted.slice(0, maxDays);
  const remaining = sorted.length - visible.length;

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {visible.map((slot) => {
        const shiftText = slot.shifts
          .map((shift) => SHIFT_TYPE_SHORT_LABELS[shift] ?? shift)
          .join('/');

        return (
          <span
            key={slot.day}
            className="inline-flex items-center gap-1 rounded-[6px] border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700"
          >
            <span className="font-semibold text-slate-900">
              {DAY_OF_WEEK_SHORT_LABELS[slot.day] ?? slot.day}
            </span>
            <span className="tabular-nums text-teal-700">{shiftText}</span>
          </span>
        );
      })}
      {remaining > 0 ? (
        <span className="tabular-nums text-[11px] font-medium text-slate-500">
          +{remaining} {remaining === 1 ? 'día' : 'días'}
        </span>
      ) : null}
    </div>
  );
}

export function PageLoadingSkeleton({
  cards = 3,
}: Readonly<{ cards?: number }>) {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Cargando contenido">
      <div className="h-8 w-64 animate-pulse rounded-[8px] bg-slate-200/80" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: cards }, (_, index) => (
          <div
            key={index}
            className="h-32 animate-pulse rounded-[12px] border border-slate-200 bg-white p-5"
          >
            <div className="h-4 w-28 rounded bg-slate-200/70" />
            <div className="mt-4 h-7 w-16 rounded bg-slate-200/90" />
            <div className="mt-3 h-3 w-32 rounded bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
