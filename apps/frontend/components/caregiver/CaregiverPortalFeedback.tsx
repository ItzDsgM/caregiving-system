'use client';

import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function CaregiverErrorBanner({
  title = 'No pudimos cargar esta información',
  message,
  onRetry,
}: Readonly<{
  title?: string;
  message: string;
  onRetry?: () => void;
}>) {
  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-[12px] border border-rose-200 bg-rose-50/80 p-5 sm:flex-row sm:items-center sm:justify-between"
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
          className="shrink-0"
        >
          Reintentar
        </Button>
      ) : null}
    </div>
  );
}

export function CaregiverSectionSkeleton({
  rows = 3,
}: Readonly<{ rows?: number }>) {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Cargando contenido">
      <div className="h-24 animate-pulse rounded-[12px] border border-slate-200 bg-white" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="h-28 animate-pulse rounded-[12px] border border-slate-200 bg-white" />
        <div className="h-28 animate-pulse rounded-[12px] border border-slate-200 bg-white" />
        <div className="h-28 animate-pulse rounded-[12px] border border-slate-200 bg-white" />
      </div>
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="h-28 animate-pulse rounded-[12px] border border-slate-200 bg-white"
        />
      ))}
    </div>
  );
}
