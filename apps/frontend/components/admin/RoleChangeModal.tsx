'use client';

import React, { useState } from 'react';
import { AlertCircle, AlertTriangle, UserCog } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ModalDialog } from '@/components/ui/ModalDialog';
import { adminApi, ApiError, extractErrorMessage } from '@/lib/api';
import { USER_ROLE_LABELS } from '@/lib/constants';
import type { User, UserRole } from '@/lib/types';

export interface RoleChangeTarget {
  id: string;
  label: string;
  email?: string;
  currentRole?: UserRole;
  nextRole: UserRole;
}

export interface RoleChangeModalProps {
  open: boolean;
  target: RoleChangeTarget | null;
  knownActiveAdminCount: number;
  onClose: () => void;
  onUpdated: (updatedUser: User) => void;
}

function RoleChangeForm({
  target,
  knownActiveAdminCount,
  onClose,
  onUpdated,
}: Readonly<{
  target: RoleChangeTarget;
  knownActiveAdminCount: number;
  onClose: () => void;
  onUpdated: (updatedUser: User) => void;
}>) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isDemotingAdmin =
    target.currentRole === 'ADMIN' && target.nextRole !== 'ADMIN';
  const isLikelyLastAdmin = isDemotingAdmin && knownActiveAdminCount <= 1;

  const handleConfirm = async () => {
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      const updated = await adminApi.updateUserRole(target.id, {
        role: target.nextRole,
      });
      onUpdated(updated);
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
    <div className="space-y-4">
      <div className="rounded-[10px] border border-slate-200 bg-slate-50 px-3.5 py-3 text-xs">
        <p className="font-semibold text-slate-900">{target.label}</p>
        {target.email ? (
          <p className="text-slate-600">{target.email}</p>
        ) : null}
        <p className="mt-1 font-mono text-[11px] text-slate-500 tabular-nums">
          {target.id}
        </p>
        <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
          {target.currentRole ? (
            <>
              <span className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 font-medium text-slate-700">
                Actual: {USER_ROLE_LABELS[target.currentRole]}
              </span>
              <span className="text-slate-400">→</span>
            </>
          ) : null}
          <span className="rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 font-semibold text-teal-800">
            Nuevo: {USER_ROLE_LABELS[target.nextRole]}
          </span>
        </div>
      </div>

      {isDemotingAdmin ? (
        <div className="flex items-start gap-2.5 rounded-[10px] border border-amber-300 bg-amber-50 p-3.5 text-xs leading-5 text-amber-950">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
          <div>
            <p className="font-semibold">
              {isLikelyLastAdmin
                ? 'Guardia activa: posible último administrador'
                : 'Advertencia de degradación administrativa'}
            </p>
            <p className="mt-0.5">
              {isLikelyLastAdmin
                ? 'Esta cuenta parece ser el único administrador activo conocido. El backend rechazará la operación si no existe otro administrador activo en la plataforma.'
                : 'Al retirar el rol ADMIN, este usuario perderá acceso inmediato al panel de moderación, reportes y gestión de roles.'}
            </p>
          </div>
        </div>
      ) : null}

      {target.nextRole === 'CAREGIVER' ? (
        <p className="rounded-[8px] border border-teal-200 bg-teal-50/70 px-3 py-2 text-xs text-teal-900">
          Al asignar el rol <strong>Cuidador Profesional</strong>, el backend
          inicializa automáticamente un <code className="font-mono">CaregiverProfile</code> si
          aún no existe.
        </p>
      ) : null}

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
          type="button"
          variant={isDemotingAdmin ? 'danger' : 'primary'}
          loading={isSubmitting}
          loadingText="Actualizando rol..."
          onClick={handleConfirm}
          leftIcon={<UserCog className="h-4 w-4" aria-hidden />}
        >
          Confirmar cambio de rol
        </Button>
      </div>
    </div>
  );
}

/**
 * Confirmation dialog for updating a user's RBAC role with visual guard against demoting active admins.
 */
export function RoleChangeModal({
  open,
  target,
  knownActiveAdminCount,
  onClose,
  onUpdated,
}: Readonly<RoleChangeModalProps>) {
  return (
    <ModalDialog
      open={open && target !== null}
      onClose={onClose}
      title="Confirmar cambio de rol"
      description="Actualiza los permisos RBAC de la cuenta seleccionada."
      size="md"
    >
      {open && target ? (
        <RoleChangeForm
          target={target}
          knownActiveAdminCount={knownActiveAdminCount}
          onClose={onClose}
          onUpdated={onUpdated}
        />
      ) : null}
    </ModalDialog>
  );
}
