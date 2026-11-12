import React from 'react';
import { Shield, ShieldAlert, ShieldCheck } from 'lucide-react';
import type { VerificationStatus } from '@/lib/types';

export interface BadgeVerifiedProps {
  verified?: boolean;
  status?: VerificationStatus;
  hideWhenUnverified?: boolean;
  size?: 'sm' | 'md';
  label?: string;
  className?: string;
}

export function BadgeVerified({
  verified,
  status,
  hideWhenUnverified = false,
  size = 'sm',
  label,
  className = '',
}: Readonly<BadgeVerifiedProps>) {
  const resolvedStatus: VerificationStatus | null =
    status ??
    (verified === true ? 'APPROVED' : verified === false ? 'PENDING' : null);

  if (!resolvedStatus) {
    return null;
  }

  if (hideWhenUnverified && resolvedStatus !== 'APPROVED') {
    return null;
  }

  const sizeClass =
    size === 'md' ? 'px-2.5 py-1 text-xs gap-1.5' : 'px-2 py-0.5 text-xs gap-1';

  if (resolvedStatus === 'APPROVED') {
    return (
      <span
        className={`inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 font-medium text-emerald-700 ${sizeClass} ${className}`}
      >
        <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>{label ?? 'Verificado'}</span>
      </span>
    );
  }

  if (resolvedStatus === 'REJECTED') {
    return (
      <span
        className={`inline-flex items-center rounded-full border border-rose-200 bg-rose-50 font-medium text-rose-700 ${sizeClass} ${className}`}
      >
        <ShieldAlert className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>{label ?? 'Rechazado'}</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center rounded-full border border-amber-200 bg-amber-50 font-medium text-amber-700 ${sizeClass} ${className}`}
    >
      <Shield className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>{label ?? 'Pendiente'}</span>
    </span>
  );
}
