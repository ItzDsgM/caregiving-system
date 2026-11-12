'use client';

import React, { useId, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowLeft,
  KeyRound,
  MailCheck,
  Send,
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/Button';
import { ApiError, authApi } from '@/lib/api';
import { EMAIL_FORMAT_REGEX } from './authHelpers';

export function ForgotPasswordForm() {
  const emailId = useId();

  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [confirmedEmail, setConfirmedEmail] = useState<string | null>(null);

  const emailError = (() => {
    if (!touched && !hasSubmitted) return null;
    const trimmed = email.trim();
    if (!trimmed) return 'Ingresa tu correo electrónico.';
    if (!EMAIL_FORMAT_REGEX.test(trimmed)) {
      return 'Ingresa un correo electrónico válido.';
    }
    return null;
  })();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    setHasSubmitted(true);
    setRequestError(null);

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !EMAIL_FORMAT_REGEX.test(normalizedEmail)) {
      return;
    }

    setIsSubmitting(true);
    try {
      await authApi.forgotPassword({ email: normalizedEmail });
      setConfirmedEmail(normalizedEmail);
    } catch (err) {
      if (err instanceof ApiError) {
        setRequestError(err.message);
      } else {
        setRequestError(
          'No pudimos procesar la solicitud. Verifica tu conexión e intenta de nuevo.',
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (confirmedEmail) {
    return (
      <div className="rounded-[12px] border border-slate-200 bg-white p-6 text-center shadow-xs sm:p-8">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <MailCheck className="h-6 w-6" aria-hidden />
        </div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
          Revisa tu correo electrónico
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Si el correo{' '}
          <span className="font-semibold text-slate-900">{confirmedEmail}</span>{' '}
          existe en nuestra plataforma, hemos enviado instrucciones para
          restablecer tu contraseña.
        </p>

        <div className="mt-4 rounded-[8px] border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs leading-5 text-slate-600">
          Por tu seguridad, el enlace temporal caduca en 15 minutos. Revisa
          también tu carpeta de correo no deseado.
        </div>

        <div className="mt-6 space-y-2.5">
          <Link
            href="/login"
            className={buttonVariants({
              variant: 'primary',
              size: 'lg',
              fullWidth: true,
            })}
          >
            Volver al inicio de sesión
          </Link>
          <Button
            type="button"
            variant="ghost"
            size="md"
            fullWidth
            onClick={() => {
              setConfirmedEmail(null);
              setHasSubmitted(false);
              setTouched(false);
            }}
          >
            Intentar con otro correo
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[12px] border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-teal-600">
          <KeyRound className="h-6 w-6" aria-hidden />
        </div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
          Recuperar contraseña
        </h1>
        <p className="mt-1.5 text-sm leading-6 text-slate-600">
          Ingresa tu correo electrónico registrado y te enviaremos un enlace
          para crear una nueva contraseña.
        </p>
      </div>

      <form noValidate onSubmit={handleSubmit} className="mt-6 space-y-4">
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
              if (requestError) setRequestError(null);
            }}
            onBlur={() => setTouched(true)}
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

        {requestError ? (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-[8px] border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-medium text-rose-700"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{requestError}</span>
          </div>
        ) : null}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          loading={isSubmitting}
          loadingText="Enviando instrucciones..."
          leftIcon={<Send className="h-4 w-4" aria-hidden />}
        >
          Enviar instrucciones
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
