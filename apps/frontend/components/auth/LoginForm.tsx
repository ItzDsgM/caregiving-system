'use client';

import React, { useEffect, useId, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  LogIn,
  Mail,
  ShieldAlert,
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/Button';
import { ModalDialog } from '@/components/ui/ModalDialog';
import { ApiError } from '@/lib/api';
import {
  getRoleDashboardPath,
  isTwoFactorChallengeResponse,
  useAuth,
} from '@/lib/auth';
import { formatFullName } from '@/lib/format';
import { PasswordField } from './PasswordField';
import { EMAIL_FORMAT_REGEX, sanitizeInternalRedirect } from './authHelpers';

type LoginField = 'email' | 'password';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, isLoading, login } = useAuth();

  const emailId = useId();

  const safeRedirect = sanitizeInternalRedirect(searchParams.get('redirect'));
  const registeredRole = searchParams.get('registered');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState<Partial<Record<LoginField, boolean>>>(
    {},
  );
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [suspendedModalOpen, setSuspendedModalOpen] = useState(false);
  const [suspendedMessage, setSuspendedMessage] = useState(
    'Usuario suspendido o inactivo',
  );

  useEffect(() => {
    return () => {
      setSuspendedModalOpen(false);
    };
  }, []);

  const emailError = (() => {
    if (!touched.email && !hasSubmitted) return null;
    const trimmed = email.trim();
    if (!trimmed) return 'Ingresa tu correo electrónico.';
    if (!EMAIL_FORMAT_REGEX.test(trimmed)) {
      return 'Ingresa un correo electrónico válido.';
    }
    return null;
  })();

  const passwordError = (() => {
    if (!touched.password && !hasSubmitted) return null;
    if (!password) return 'Ingresa tu contraseña.';
    return null;
  })();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    setHasSubmitted(true);
    setAuthError(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (
      !trimmedEmail ||
      !EMAIL_FORMAT_REGEX.test(trimmedEmail) ||
      !password
    ) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await login({
        email: trimmedEmail,
        password,
      });

      if (isTwoFactorChallengeResponse(response)) {
        const nextUrl = safeRedirect
          ? `/login/2fa?redirect=${encodeURIComponent(safeRedirect)}`
          : '/login/2fa';
        router.push(nextUrl);
        return;
      }

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
        setAuthError(
          'Correo electrónico o contraseña incorrectos. Verifica tus datos e intenta nuevamente.',
        );
      } else if (err instanceof ApiError) {
        setAuthError(err.message);
      } else {
        setAuthError(
          'No se pudo iniciar sesión. Verifica tu conexión e inténtalo nuevamente.',
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Iniciar sesión
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Accede a tu cuenta CareConnect para continuar.
        </p>
      </div>

      {registeredRole === 'caregiver' ? (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-[10px] border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs leading-5 text-emerald-800"
        >
          <CheckCircle2
            className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
            aria-hidden
          />
          <span>
            <strong>Cuenta de cuidador creada.</strong> Inicia sesión para subir
            tu cédula y antecedentes en el paso 2 de verificación.
          </span>
        </div>
      ) : registeredRole === 'client' ? (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-[10px] border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs leading-5 text-emerald-800"
        >
          <CheckCircle2
            className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
            aria-hidden
          />
          <span>
            <strong>Cuenta familiar creada.</strong> Inicia sesión para publicar
            ofertas o contactar cuidadores.
          </span>
        </div>
      ) : null}

      {!isLoading && isAuthenticated && user ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-teal-200 bg-teal-50/70 px-3.5 py-2 text-xs text-teal-900">
          <span className="truncate">
            Sesión actual:{' '}
            <strong>{formatFullName(user.firstName, user.lastName)}</strong>
          </span>
          <Link
            href={getRoleDashboardPath(user.role)}
            className="inline-flex items-center gap-1 font-semibold text-teal-700 hover:underline"
          >
            Ir a mi panel
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      ) : null}

      <form
        noValidate
        onSubmit={handleSubmit}
        className="space-y-4 rounded-[12px] border border-slate-200 bg-white p-5 shadow-xs sm:p-6"
      >
        <div>
          <label
            htmlFor={emailId}
            className="mb-1.5 block text-sm font-medium text-slate-800"
          >
            Correo electrónico
          </label>
          <input
            id={emailId}
            name="email"
            type="email"
            autoComplete="username"
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="none"
            placeholder="nombre@ejemplo.com"
            required
            disabled={isSubmitting}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (authError) setAuthError(null);
            }}
            onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
            aria-invalid={emailError ? true : undefined}
            aria-describedby={emailError ? `${emailId}-error` : undefined}
            className="h-10 w-full rounded-[8px] border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20 disabled:cursor-not-allowed disabled:bg-slate-50"
          />
          {emailError ? (
            <p
              id={`${emailId}-error`}
              className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-rose-600"
            >
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>{emailError}</span>
            </p>
          ) : null}
        </div>

        <PasswordField
          name="password"
          label="Contraseña"
          autoComplete="current-password"
          disabled={isSubmitting}
          value={password}
          onChange={(next) => {
            setPassword(next);
            if (authError) setAuthError(null);
          }}
          onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
          error={passwordError}
          labelRight={
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-teal-700 hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          }
        />

        {authError ? (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-[8px] border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-medium text-rose-700"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{authError}</span>
          </div>
        ) : null}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          loading={isSubmitting}
          loadingText="Verificando credenciales..."
          leftIcon={<LogIn className="h-4 w-4" aria-hidden />}
        >
          Iniciar sesión
        </Button>
      </form>

      <p className="text-center text-sm text-slate-600">
        ¿No tienes cuenta en CareConnect?{' '}
        <Link
          href="/register"
          className="font-semibold text-teal-700 hover:underline"
        >
          Crear una cuenta
        </Link>
      </p>

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
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-[10px] border border-rose-200 bg-rose-50 p-3.5">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
              <ShieldAlert className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">
                Estado de la cuenta
              </p>
              <p className="mt-0.5 text-sm font-medium text-rose-900">
                {suspendedMessage}
              </p>
            </div>
          </div>

          <p className="text-sm leading-6 text-slate-600">
            Mientras la cuenta permanezca inactiva, las sesiones y perfiles
            públicos quedan deshabilitados. Escríbenos a{' '}
            <span className="font-medium text-slate-900">
              soporte@careconnect.co
            </span>{' '}
            indicando tu correo registrado para solicitar una revisión.
          </p>
        </div>
      </ModalDialog>
    </div>
  );
}
