'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

export type KpiTone = 'teal' | 'emerald' | 'amber' | 'slate';

export interface AdminKpiCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  tone?: KpiTone;
  href?: string;
  actionLabel?: string;
}

const TONE_ICON_STYLES: Record<KpiTone, string> = {
  teal: 'bg-teal-50 text-teal-700 border-teal-200',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  slate: 'bg-slate-100 text-slate-700 border-slate-200',
};

const TONE_BORDER_ACCENT: Record<KpiTone, string> = {
  teal: 'border-slate-200',
  emerald: 'border-slate-200',
  amber: 'border-amber-200',
  slate: 'border-slate-200',
};

/**
 * Operational KPI card aligned with Linear/Datadog precision and Geist Mono tabular metrics.
 */
export function AdminKpiCard({
  label,
  value,
  subtitle,
  icon,
  tone = 'teal',
  href,
  actionLabel,
}: Readonly<AdminKpiCardProps>) {
  return (
    <article
      className={`flex flex-col justify-between rounded-[12px] border bg-white p-4 shadow-2xs transition-colors sm:p-5 ${TONE_BORDER_ACCENT[tone]}`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </span>
        <span
          className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] border ${TONE_ICON_STYLES[tone]}`}
          aria-hidden
        >
          {icon}
        </span>
      </div>

      <div className="mt-3">
        <p className="font-mono text-2xl font-semibold tracking-tight text-slate-900 tabular-nums sm:text-3xl">
          {value}
        </p>
        {subtitle ? (
          <p className="mt-1 text-xs leading-5 text-slate-600">{subtitle}</p>
        ) : null}
      </div>

      {href && actionLabel ? (
        <div className="mt-3 border-t border-slate-100 pt-2.5">
          <Link
            href={href}
            className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 transition-colors hover:text-teal-800"
          >
            <span>{actionLabel}</span>
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      ) : null}
    </article>
  );
}
