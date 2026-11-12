'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  Loader2,
  Mail,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/Button';
import { ModalDialog } from '@/components/ui/ModalDialog';
import { useToast } from '@/components/ui/ToastRegion';
import { ApiError } from '@/lib/api';
import { getRoleDashboardPath, useAuth } from '@/lib/auth';
import { formatMaskedEmail } from '@/lib/format';
import { OtpCodeInput } from './OtpCodeInput';
import { sanitizeInternalRedirect } from './authHelpers';

export function TwoFactorChallengeForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const {
    isLoading,
    pendingTwoFactor,
    completeTwoFactorLogin,
    clearPendingTwoFactor,
  } = useAuth();

  const safeRedirect = sanitizeInternalRedirect(searchParams.get('redirect'));

  const [code, setCode] = useState('');
  const [touched, setTouched] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const [suspendedModalOpen, setSuspendedModalOpen] = useState(false);
  const [suspendedMessage, setSuspendedMessage] = useState(
    'Usuario suspendido o inactivo',
  );

  useEffect(() => {
    return () => {
      setSuspendedModalOpen(false);
    };
  }, []);

  const codeError = (() => {
    if (!touched && !hasSubmitted) return null;
    if (!code) return 'Ingresa el código de 6 dígitos.';
    if (!/^\d{6}$/.test(code)) {
      return 'El código debe tener exactamente 6 dígitos numéricos.';
    }
    return null;
  })();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-[12px] border border-slate-200 bg-white p-8 text-center shadow-xs">
        <Loader2 className="h-6 w-6 animate-spin text-teal-600" aria-hidden />
        <p className="text-sm font-medium text-slate-600">
          Cargando desafío de verificación...
        </p>
      </div>
    );
  }

  if (!pendingTwoFactor) {
    return (
      <div className="rounded-[12px] border border-slate-200 bg-white p-6 text-center shadow-xs sm:p-8">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
          <ShieldAlert className="h-6 w-6" aria-hidden />
        </div>
        <h1 className="mt-4 text-xl font-bold tracking-tight text-slate-900">
          Sesión de verificación no disponible
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Tu desafío de autenticación en dos pasos ha expirado o no fue iniciado
          desde el inicio de sesión. Ingresa tus credenciales nuevamente para
          continuar.
        </p>
        <div className="mt-6">
          <Link
            href="/login"
            className={buttonVariants({
              variant: 'primary',
              size: 'lg',
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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    setHasSubmitted(true);
    setServerError(null);

    if (!/^\d{6}$/.test(code)) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await completeTwoFactorLogin({
        email: pendingTwoFactor.email,
        code,
        challengeToken: pendingTwoFactor.challengeToken,
      });

      toast.success(
        'Verificación completada',
        'Has iniciado sesión de forma segura.',
      );
      const destination =
        safeRedirect ?? getRoleDashboardPath(response.user.role);
      router.replace(destination);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 403) {
        setSuspendedMessage(
          err.message || 'Usuario suspendido o inactivo',
        );
        setSuspendedModalOpen(true);
      } else if (err instanceof ApiError && err.statusCode === 401) {
        setServerError(
          'Código de verificación incorrecto o desafío expirado. Intenta nuevamente o vuelve a iniciar sesión.',
        );
      } else if (err instanceof ApiError) {
        setServerError(err.message);
      } else {
        setServerError(
          'No pudimos validar el código 2FA. Revisa tu conexión e inténtalo otra vez.',
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReturnToLogin = () => {
    clearPendingTwoFactor();
    router.push('/login');
  };

  return (
    <div className="rounded-[12px] border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-teal-600">
          <ShieldCheck className="h-6 w-6" aria-hidden />
        </div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
          Verificación en dos pasos
        </h1>
        <p className="mt-1.5 text-sm leading-6 text-slate-600">
          Ingresa el código de 6 dígitos de tu app autenticadora para{' '}
          <span className="font-semibold text-slate-900">
            {formatMaskedEmail(pendingTwoFactor.email)}
          </span>
          .
        </p>
      </div>

      <form noValidate onSubmit={handleSubmit} className="mt-6 space-y-5">
        <OtpCodeInput
          value={code}
          autoFocus
          disabled={isSubmitting}
          onChange={(digits) => {
            setCode(digits);
            if (serverError) setServerError(null);
          }}
          onBlur={() => setTouched(true)}
          error={codeError}
          hint="Puedes pegar directamente el código desde tu gestor o app TOTP."
        />

        {serverError ? (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-[8px] border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-medium text-rose-700"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{serverError}</span>
          </div>
        ) : null}

        <div className="space-y-2.5">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={isSubmitting}
            loadingText="Validando código..."
          >
            Verificar y entrar
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="md"
            fullWidth
            disabled={isSubmitting}
            onClick={handleReturnToLogin}
            leftIcon={<ArrowLeft className="h-4 w-4" aria-hidden />}
          >
            Volver al inicio de sesión
          </Button>
        </div>
      </form>

      <ModalDialog
        open={suspendedModalOpen}
        onClose={() => setSuspendedModalOpen(false)}
        title="Cuenta suspendida o inactiva"
        description="El acceso a esta cuenta se encuentra restringido temporalmente."
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setSuspendedModalOpen(false)}
            >
              Entendido
            </Button>
            <a
              href="mailto:soporte@careconnect.co?subject=Revisi%C3%B3n%20de%20cuenta%20suspendida"
              className={buttonVariants({ variant: 'primary' })}
            >
              <Mail className="h-4 w-4" aria-hidden />
              Contactar a soporte
            </a>
          </>
        }
      >
        <p className="text-sm leading-6 text-slate-600">{suspendedMessage}</p>
      </ModalDialog>
    </div>
  );
}
