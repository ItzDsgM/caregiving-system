'use client';

import React, { useState } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  Lock,
  Mail,
  MessageCircle,
  Phone,
} from 'lucide-react';
import { formatFullName, formatMaskedName } from '@/lib/format';

export interface MaskedContactBannerProps {
  unlocked: boolean;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  phoneNumber?: string | null;
  email?: string | null;
  lockedTitle?: string;
  lockedDescription?: string;
  unlockedTitle?: string;
  action?: React.ReactNode;
  className?: string;
}

function buildWhatsAppHref(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  const normalized = digits.length === 10 ? `57${digits}` : digits;
  return `https://wa.me/${normalized}`;
}

export function MaskedContactBanner({
  unlocked,
  firstName,
  lastName,
  fullName,
  phoneNumber,
  email,
  lockedTitle = 'Datos de contacto protegidos',
  lockedDescription = 'Por privacidad y seguridad, el teléfono y correo electrónico solo se desbloquean cuando la solicitud o postulación es aceptada.',
  unlockedTitle = 'Contacto directo desbloqueado',
  action,
  className = '',
}: Readonly<MaskedContactBannerProps>) {
  const [copiedField, setCopiedField] = useState<'phone' | 'email' | null>(
    null,
  );

  const displayName = fullName
    ? fullName
    : unlocked
      ? formatFullName(firstName, lastName)
      : formatMaskedName(firstName, lastName);

  const handleCopy = async (value: string, field: 'phone' | 'email') => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      setTimeout(() => {
        setCopiedField((prev) => (prev === field ? null : prev));
      }, 2200);
    } catch {
      // Ignorar si el navegador bloquea el portapapeles
    }
  };

  if (!unlocked || (!phoneNumber && !email)) {
    return (
      <div
        className={`rounded-[12px] border border-slate-200 bg-slate-50 p-4 ${className}`}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600">
              <Lock className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {lockedTitle}
              </p>
              {firstName ? (
                <p className="mt-0.5 text-xs font-medium text-slate-700">
                  Perfil visible como {displayName}
                </p>
              ) : null}
              <p className="mt-1 text-sm leading-5 text-slate-600">
                {lockedDescription}
              </p>
              <div className="mt-2.5 flex flex-wrap gap-3 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1.5 rounded-[8px] border border-slate-200 bg-white px-2.5 py-1 tabular-nums">
                  <Phone className="h-3.5 w-3.5" aria-hidden />
                  +57 ••• ••• ••••
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-[8px] border border-slate-200 bg-white px-2.5 py-1">
                  <Mail className="h-3.5 w-3.5" aria-hidden />
                  ••••@••••.•••
                </span>
              </div>
            </div>
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      </div>
    );
  }

  const whatsAppHref = phoneNumber ? buildWhatsAppHref(phoneNumber) : null;

  return (
    <div
      className={`rounded-[12px] border border-emerald-200 bg-emerald-50/70 p-4 ${className}`}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <CheckCircle2 className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-emerald-950">
                {unlockedTitle}
              </p>
              {displayName ? (
                <p className="text-xs font-medium text-emerald-800">
                  {displayName}
                </p>
              ) : null}
            </div>
            {whatsAppHref ? (
              <a
                href={whatsAppHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-[8px] bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-700"
              >
                <MessageCircle className="h-3.5 w-3.5" aria-hidden />
                WhatsApp
              </a>
            ) : null}
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {phoneNumber ? (
              <div className="flex items-center justify-between gap-2 rounded-[8px] border border-emerald-200 bg-white px-3 py-2">
                <a
                  href={`tel:${phoneNumber}`}
                  className="inline-flex min-w-0 items-center gap-2 text-sm font-medium text-slate-900 hover:text-teal-700 tabular-nums"
                >
                  <Phone className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                  <span className="truncate">{phoneNumber}</span>
                </a>
                <button
                  type="button"
                  onClick={() => handleCopy(phoneNumber, 'phone')}
                  aria-label="Copiar teléfono"
                  className="inline-flex shrink-0 items-center gap-1 rounded-[6px] px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                >
                  {copiedField === 'phone' ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
                      <span className="text-emerald-700">Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" aria-hidden />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              </div>
            ) : null}

            {email ? (
              <div className="flex items-center justify-between gap-2 rounded-[8px] border border-emerald-200 bg-white px-3 py-2">
                <a
                  href={`mailto:${email}`}
                  className="inline-flex min-w-0 items-center gap-2 text-sm font-medium text-slate-900 hover:text-teal-700"
                >
                  <Mail className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                  <span className="truncate">{email}</span>
                </a>
                <button
                  type="button"
                  onClick={() => handleCopy(email, 'email')}
                  aria-label="Copiar correo electrónico"
                  className="inline-flex shrink-0 items-center gap-1 rounded-[6px] px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                >
                  {copiedField === 'email' ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
                      <span className="text-emerald-700">Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" aria-hidden />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
