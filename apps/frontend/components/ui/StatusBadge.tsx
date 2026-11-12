import React from 'react';
import {
  Ban,
  CalendarClock,
  CheckCheck,
  CheckCircle2,
  CircleDot,
  Clock,
  Lock,
  PlayCircle,
  ShieldCheck,
  ShieldOff,
  UserCheck,
  UserX,
  XCircle,
} from 'lucide-react';
import {
  APPLICATION_STATUS_LABELS,
  CONTACT_REQUEST_STATUS_LABELS,
  HISTORY_STATUS_LABELS,
  JOB_OFFER_STATUS_LABELS,
  VERIFICATION_STATUS_LABELS,
} from '@/lib/constants';
import type {
  ApplicationStatus,
  ContactRequestStatus,
  HistoryLifecycleStatus,
  JobOfferStatus,
  VerificationStatus,
} from '@/lib/types';

export type ExtendedStatus =
  | VerificationStatus
  | JobOfferStatus
  | ApplicationStatus
  | ContactRequestStatus
  | HistoryLifecycleStatus
  | 'ACTIVE'
  | 'INACTIVE'
  | 'TWO_FACTOR_ON'
  | 'TWO_FACTOR_OFF';

export type StatusDomain =
  | 'verification'
  | 'jobOffer'
  | 'application'
  | 'contactRequest'
  | 'history'
  | 'account'
  | 'twoFactor';

export interface StatusBadgeProps {
  status: ExtendedStatus;
  domain?: StatusDomain;
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
}

type BadgeTone = 'emerald' | 'amber' | 'rose' | 'teal' | 'slate';

const TONE_CLASSES: Record<BadgeTone, string> = {
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  amber: 'border-amber-200 bg-amber-50 text-amber-700',
  rose: 'border-rose-200 bg-rose-50 text-rose-700',
  teal: 'border-teal-200 bg-teal-50 text-teal-700',
  slate: 'border-slate-200 bg-slate-100 text-slate-700',
};

function resolveStatusLabel(
  status: ExtendedStatus,
  domain?: StatusDomain,
): string {
  if (domain === 'verification' && status in VERIFICATION_STATUS_LABELS) {
    return VERIFICATION_STATUS_LABELS[status as VerificationStatus];
  }
  if (domain === 'jobOffer' && status in JOB_OFFER_STATUS_LABELS) {
    return JOB_OFFER_STATUS_LABELS[status as JobOfferStatus];
  }
  if (domain === 'application' && status in APPLICATION_STATUS_LABELS) {
    return APPLICATION_STATUS_LABELS[status as ApplicationStatus];
  }
  if (
    domain === 'contactRequest' &&
    status in CONTACT_REQUEST_STATUS_LABELS
  ) {
    return CONTACT_REQUEST_STATUS_LABELS[status as ContactRequestStatus];
  }
  if (domain === 'history' && status in HISTORY_STATUS_LABELS) {
    return HISTORY_STATUS_LABELS[status as HistoryLifecycleStatus];
  }

  switch (status) {
    case 'APPROVED':
      return VERIFICATION_STATUS_LABELS.APPROVED;
    case 'PENDING':
      return 'Pendiente';
    case 'REJECTED':
      return 'Rechazada';
    case 'OPEN':
      return JOB_OFFER_STATUS_LABELS.OPEN;
    case 'CLOSED':
      return JOB_OFFER_STATUS_LABELS.CLOSED;
    case 'CANCELLED':
      return JOB_OFFER_STATUS_LABELS.CANCELLED;
    case 'ACCEPTED':
      return APPLICATION_STATUS_LABELS.ACCEPTED;
    case 'SCHEDULED':
      return HISTORY_STATUS_LABELS.SCHEDULED;
    case 'ONGOING':
      return HISTORY_STATUS_LABELS.ONGOING;
    case 'COMPLETED':
      return HISTORY_STATUS_LABELS.COMPLETED;
    case 'ACTIVE':
      return 'Activo';
    case 'INACTIVE':
      return 'Desactivado';
    case 'TWO_FACTOR_ON':
      return '2FA activo';
    case 'TWO_FACTOR_OFF':
      return '2FA inactivo';
    default:
      return String(status);
  }
}

function resolveStatusVisual(status: ExtendedStatus): {
  tone: BadgeTone;
  Icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
} {
  switch (status) {
    case 'APPROVED':
    case 'ACCEPTED':
      return { tone: 'emerald', Icon: CheckCircle2 };
    case 'OPEN':
      return { tone: 'emerald', Icon: CircleDot };
    case 'SCHEDULED':
      return { tone: 'teal', Icon: CalendarClock };
    case 'ONGOING':
      return { tone: 'emerald', Icon: PlayCircle };
    case 'PENDING':
      return { tone: 'amber', Icon: Clock };
    case 'REJECTED':
      return { tone: 'rose', Icon: XCircle };
    case 'CANCELLED':
      return { tone: 'rose', Icon: Ban };
    case 'CLOSED':
      return { tone: 'slate', Icon: Lock };
    case 'COMPLETED':
      return { tone: 'slate', Icon: CheckCheck };
    case 'ACTIVE':
      return { tone: 'emerald', Icon: UserCheck };
    case 'INACTIVE':
      return { tone: 'rose', Icon: UserX };
    case 'TWO_FACTOR_ON':
      return { tone: 'emerald', Icon: ShieldCheck };
    case 'TWO_FACTOR_OFF':
      return { tone: 'slate', Icon: ShieldOff };
    default:
      return { tone: 'slate', Icon: CircleDot };
  }
}

export function StatusBadge({
  status,
  domain,
  label,
  size = 'sm',
  className = '',
}: Readonly<StatusBadgeProps>) {
  const { tone, Icon } = resolveStatusVisual(status);
  const text = label ?? resolveStatusLabel(status, domain);
  const sizeClass =
    size === 'md' ? 'px-2.5 py-1 text-xs gap-1.5' : 'px-2 py-0.5 text-xs gap-1';

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium whitespace-nowrap ${TONE_CLASSES[tone]} ${sizeClass} ${className}`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>{text}</span>
    </span>
  );
}
