'use client';

import React, { useState } from 'react';
import { AlertCircle, Ban, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ModalDialog } from '@/components/ui/ModalDialog';
import { adminApi, ApiError, extractErrorMessage } from '@/lib/api';
import { USER_ROLE_LABELS } from '@/lib/constants';
import type { User, UserRole } from '@/lib/types';

export interface SuspendUserTarget {
  id: string;
  label: string;
  email?: string;
  role?: UserRole;
}

export interface SuspendUserModalProps {
  open: boolean;
  target: SuspendUserTarget | null;
  onClose: () => void;
  onSuspended: (updatedUser: User) => void;
}

function SuspendUserForm({
  target,
  onClose,
  onSuspended,
}: Readonly<{
  target: SuspendUserTarget;
  onClose: () => void;
  onSuspended: (updatedUser: User) => void;
}>) {
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const trimmed = reason.trim();
  const missingReason = trimmed.length === 0;
  const tooLong = reason.length > 500;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setTouched(true);
    setErrorMessage(null);

    if (missingReason) {
      setErrorMessage('Debes ingresar el motivo obligatorio de suspensión.');
      return;
    }
    if (tooLong) {
      setErrorMessage('El motivo no puede superar los 500 caracteres.');
      return;
    }

    setIsSubmitting(true);
    try {
      const updated = await adminApi.updateUserStatus(target.id, {
        isActive: false,
        suspensionReason: trimmed,
      });
      onSuspended(updated);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : extractErrorMessage(undefined, 500);
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-start gap-3 rounded-[10px] border border-rose-200 bg-rose-50 p-3.5 text-xs leading-5 text-rose-900">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden />
        <div>
          <p className="font-semibold">Efectos en cascada al suspender</p>
          <p className="mt-0.5">
            Si la cuenta es <strong>CAREGIVER</strong>, se ocultará su perfil del
            catálogo público (<code className="font-mono">isPublic: false</code>).
            Si es <strong>CLIENT</strong>, sus ofertas{' '}
            <code className="font-mono">OPEN</code> pasarán a{' '}
            <code className="font-mono">CANCELLED</code>. Los accesos futuros
            recibirán HTTP 403.
          </p>
        </div>
      </div>

      <div className="rounded-[10px] border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs">
        <p className="font-semibold text-slate-900">{target.label}</p>
        {target.email ? (
          <p className="text-slate-600">{target.email}</p>
        ) : null}
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
          <span className="font-mono tabular-nums">{target.id}</span>
          {target.role ? (
            <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 font-medium text-slate-700">
              {USER_ROLE_LABELS[target.role]}
            </span>
          ) : null}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between gap-2">
          <label
            htmlFor="suspension-reason-input"
            className="block text-xs font-semibold text-slate-800"
          >
            Motivo de suspensión (obligatorio)
          </label>
          <span
            className={`font-mono text-[11px] tabular-nums ${
              tooLong ? 'font-semibold text-rose-600' : 'text-slate-500'
            }`}
          >
            {reason.length}/500
          </span>
        </div>
        <textarea
          id="suspension-reason-input"
          rows={3}
          maxLength={520}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          onBlur={() => setTouched(true)}
          aria-invalid={(touched && missingReason) || tooLong ? 'true' : undefined}
          placeholder="Ej: Incumplimiento reiterado de políticas de verificación o conducta."
          className="mt-1.5 w-full rounded-[8px] border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
        />
        {touched && missingReason ? (
          <p className="mt-1 text-xs font-medium text-rose-600">
            Ingresa el motivo para poder suspender la cuenta.
          </p>
        ) : null}
      </div>

      {errorMessage ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-[8px] border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-800"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden />
          <span>{errorMessage}</span>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-slate-200 pt-4">
        <Button
          type="button"
          variant="secondary"
          onClick={onClose}
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          variant="danger"
          loading={isSubmitting}
          loadingText="Suspendiendo..."
          leftIcon={<Ban className="h-4 w-4" aria-hidden />}
        >
          Confirmar suspensión
        </Button>
      </div>
    </form>
  );
}

/**
 * Confirmation modal requiring a suspensionReason before suspending a user account.
 */
export function SuspendUserModal({
  open,
  target,
  onClose,
  onSuspended,
}: Readonly<SuspendUserModalProps>) {
  return (
    <ModalDialog
      open={open && target !== null}
      onClose={onClose}
      title="Suspender cuenta de usuario"
      description="Desactiva temporalmente el acceso de la cuenta seleccionada."
      size="md"
    >
      {open && target ? (
        <SuspendUserForm
          target={target}
          onClose={onClose}
          onSuspended={onSuspended}
        />
      ) : null}
    </ModalDialog>
  );
}
