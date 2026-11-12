'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  LockKeyhole,
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/Button';
import { useToast } from '@/components/ui/ToastRegion';
import { ApiError, authApi } from '@/lib/api';
import { PASSWORD_REGEX } from '@/lib/constants';
import { PasswordField } from './PasswordField';

type ResetField = 'newPassword' | 'confirmPassword';

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  const token = searchParams.get('token')?.trim() ?? '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [touched, setTouched] = useState<Partial<Record<ResetField, boolean>>>(
    {},
  );
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  if (!token) {
    return (
      <div className="rounded-[12px] border border-slate-200 bg-white p-6 text-center shadow-xs sm:p-8">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
          <AlertTriangle className="h-6 w-6" aria-hidden />
        </div>
        <h1 className="mt-4 text-xl font-bold tracking-tight text-slate-900">
          Enlace de recuperación inválido o incompleto
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          No encontramos un token de verificación en el enlace. Solicita un
          nuevo correo de recuperación para restablecer tu contraseña.
        </p>

        <div className="mt-6 space-y-2.5">
          <Link
            href="/forgot-password"
            className={buttonVariants({
              variant: 'primary',
              size: 'lg',
              fullWidth: true,
            })}
          >
            Solicitar nuevo enlace
          </Link>
          <Link
            href="/login"
            className={buttonVariants({
              variant: 'ghost',
              size: 'md',
              fullWidth: true,
            })}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Volver al inicio de sesión
          </Link>
        </div>
      </div>
    );
  }

  const newPasswordError = (() => {
    if (!touched.newPassword && !hasSubmitted) return null;
    if (!newPassword) return 'Ingresa tu nueva contraseña.';
    if (!PASSWORD_REGEX.test(newPassword)) {
      return 'La contraseña debe cumplir los 4 requisitos indicados arriba.';
    }
    return null;
  })();

  const confirmPasswordError = (() => {
    if (!touched.confirmPassword && !hasSubmitted) return null;
    if (!confirmPassword) return 'Confirma tu nueva contraseña.';
    if (confirmPassword !== newPassword) {
      return 'Las contraseñas no coinciden.';
    }
    return null;
  })();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    setHasSubmitted(true);
    setServerError(null);

    if (
      !PASSWORD_REGEX.test(newPassword) ||
      confirmPassword !== newPassword
    ) {
      return;
    }

    setIsSubmitting(true);
    try {
      await authApi.resetPassword({
        token,
        newPassword,
      });

      toast.success(
        'Contraseña restablecida',
        'Inicia sesión con tu nueva contraseña.',
      );
      router.replace('/login');
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(
          err.statusCode === 400
            ? 'El token de recuperación es inválido o ha expirado. Solicita un nuevo enlace.'
            : err.message,
        );
      } else {
        setServerError(
          'No se pudo actualizar tu contraseña. Intenta nuevamente.',
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-[12px] border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-teal-600">
          <LockKeyhole className="h-6 w-6" aria-hidden />
        </div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
          Restablecer contraseña
        </h1>
        <p className="mt-1.5 text-sm leading-6 text-slate-600">
          Crea una nueva contraseña segura. Al confirmar, las sesiones activas
          anteriores se cerrarán por seguridad.
        </p>
      </div>

      <form noValidate onSubmit={handleSubmit} className="mt-6 space-y-4">
        <PasswordField
          name="newPassword"
          label="Nueva contraseña"
          autoComplete="new-password"
          minLength={8}
          showRulesAbove
          disabled={isSubmitting}
          value={newPassword}
          onChange={(next) => {
            setNewPassword(next);
            if (serverError) setServerError(null);
          }}
          onBlur={() => setTouched((prev) => ({ ...prev, newPassword: true }))}
          error={newPasswordError}
        />

        <PasswordField
          name="confirmPassword"
          label="Confirmar nueva contraseña"
          autoComplete="new-password"
          minLength={8}
          disabled={isSubmitting}
          value={confirmPassword}
          onChange={(next) => {
            setConfirmPassword(next);
            if (serverError) setServerError(null);
          }}
          onBlur={() =>
            setTouched((prev) => ({ ...prev, confirmPassword: true }))
          }
          error={confirmPasswordError}
        />

        {serverError ? (
          <div
            role="alert"
            className="space-y-1.5 rounded-[8px] border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-medium text-rose-700"
          >
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>{serverError}</span>
            </div>
            <div className="pl-6">
              <Link
                href="/forgot-password"
                className="font-semibold text-teal-700 underline"
              >
                Solicitar nuevo enlace de recuperación
              </Link>
            </div>
          </div>
        ) : null}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          loading={isSubmitting}
          loadingText="Actualizando contraseña..."
          leftIcon={<CheckCircle2 className="h-4 w-4" aria-hidden />}
        >
          Restablecer contraseña
        </Button>
      </form>

      <div className="mt-5 text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition-colors hover:text-teal-700"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Volver al inicio de sesión
        </Link>
      </div>
    </div>
  );
}
