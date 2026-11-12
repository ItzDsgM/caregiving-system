'use client';

import React, { useId, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  UserPlus,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/ToastRegion';
import { ApiError, authApi } from '@/lib/api';
import { PASSWORD_REGEX } from '@/lib/constants';
import { PasswordField } from './PasswordField';
import {
  EMAIL_FORMAT_REGEX,
  isValidPhoneInput,
  normalizePhoneForSubmit,
} from './authHelpers';

export interface RegisterFormProps {
  role: 'CLIENT' | 'CAREGIVER';
}

type FieldName = 'firstName' | 'lastName' | 'email' | 'phone' | 'password';

interface RegisterValues {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
}

function validateRegisterField(
  field: FieldName,
  values: RegisterValues,
): string | null {
  switch (field) {
    case 'firstName':
      return values.firstName.trim().length > 0
        ? null
        : 'Ingresa tu nombre.';
    case 'lastName':
      return values.lastName.trim().length > 0
        ? null
        : 'Ingresa tu apellido.';
    case 'email': {
      const trimmed = values.email.trim();
      if (!trimmed) return 'Ingresa tu correo electrónico.';
      if (!EMAIL_FORMAT_REGEX.test(trimmed)) {
        return 'Ingresa un correo electrónico válido.';
      }
      return null;
    }
    case 'phone': {
      const trimmed = values.phone.trim();
      if (!trimmed) return 'Ingresa tu número de teléfono.';
      if (!isValidPhoneInput(trimmed)) {
        return 'Usa un teléfono válido en formato E.164 (ej. +573001234567).';
      }
      return null;
    }
    case 'password': {
      if (!values.password) return 'Crea una contraseña segura.';
      if (!PASSWORD_REGEX.test(values.password)) {
        return 'La contraseña debe cumplir los 4 requisitos indicados arriba.';
      }
      return null;
    }
    default:
      return null;
  }
}

export function RegisterForm({ role }: Readonly<RegisterFormProps>) {
  const router = useRouter();
  const toast = useToast();

  const firstNameId = useId();
  const lastNameId = useId();
  const emailId = useId();
  const phoneId = useId();

  const emailInputRef = useRef<HTMLInputElement | null>(null);

  const [values, setValues] = useState<RegisterValues>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
  });
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>(
    {},
  );
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [emailConflictError, setEmailConflictError] = useState<string | null>(
    null,
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isCaregiver = role === 'CAREGIVER';

  const getFieldError = (field: FieldName): string | null => {
    if (field === 'email' && emailConflictError) {
      return emailConflictError;
    }
    if (!touched[field] && !hasSubmitted) {
      return null;
    }
    return validateRegisterField(field, values);
  };

  const handleFieldChange = (field: FieldName, nextValue: string) => {
    setValues((prev) => ({ ...prev, [field]: nextValue }));
    if (field === 'email' && emailConflictError) {
      setEmailConflictError(null);
    }
    if (formError) {
      setFormError(null);
    }
  };

  const handleFieldBlur = (field: FieldName) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    setHasSubmitted(true);
    setEmailConflictError(null);
    setFormError(null);

    const fields: FieldName[] = [
      'firstName',
      'lastName',
      'email',
      'phone',
      'password',
    ];
    const hasClientErrors = fields.some(
      (field) => validateRegisterField(field, values) !== null,
    );
    if (hasClientErrors) {
      return;
    }

    setIsSubmitting(true);
    try {
      await authApi.register({
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        email: values.email.trim().toLowerCase(),
        phone: normalizePhoneForSubmit(values.phone),
        password: values.password,
        role,
      });

      if (isCaregiver) {
        toast.success(
          'Cuenta de cuidador creada',
          'Inicia sesión para subir tu cédula y antecedentes en el paso 2.',
        );
        router.push('/login?registered=caregiver');
      } else {
        toast.success(
          'Cuenta familiar creada',
          'Ya puedes iniciar sesión y publicar tu primera oferta.',
        );
        router.push('/login?registered=client');
      }
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 409) {
        setEmailConflictError(
          'Este correo electrónico ya está registrado en CareConnect.',
        );
        emailInputRef.current?.focus();
      } else if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError(
          'No pudimos completar el registro. Intenta de nuevo en unos segundos.',
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const firstNameError = getFieldError('firstName');
  const lastNameError = getFieldError('lastName');
  const emailError = getFieldError('email');
  const phoneError = getFieldError('phone');
  const passwordError = getFieldError('password');

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link
            href="/register"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 transition-colors hover:text-teal-700"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Cambiar tipo de cuenta
          </Link>

          <Link
            href={isCaregiver ? '/register/client' : '/register/caregiver'}
            className="text-xs font-medium text-teal-700 hover:underline"
          >
            {isCaregiver
              ? '¿Buscas cuidado para tu familia?'
              : '¿Eres cuidador profesional?'}
          </Link>
        </div>

        {isCaregiver ? (
          <nav
            aria-label="Pasos de registro de cuidador"
            className="flex items-center gap-2 rounded-[10px] border border-teal-200 bg-teal-50/70 px-3 py-2.5 text-xs"
          >
            <span className="inline-flex items-center gap-1.5 font-semibold text-teal-800">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-teal-600 text-[11px] font-bold text-white tabular-nums">
                1
              </span>
              Cuenta base
            </span>
            <ArrowRight
              className="h-3.5 w-3.5 shrink-0 text-teal-500"
              aria-hidden
            />
            <span className="inline-flex items-center gap-1.5 font-medium text-slate-600">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 bg-white text-[11px] font-semibold text-slate-600 tabular-nums">
                2
              </span>
              Documentos de verificación
            </span>
          </nav>
        ) : (
          <div className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
            Registro Familia / Cliente
          </div>
        )}

        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {isCaregiver
              ? 'Crea tu cuenta de cuidador'
              : 'Crea tu cuenta familiar'}
          </h1>
          <p className="mt-1 text-sm leading-5 text-slate-600">
            {isCaregiver
              ? 'Completa tus datos base para activar tu perfil y avanzar a la verificación documental.'
              : 'Regístrate para publicar ofertas de cuidado y contactar cuidadores verificados.'}
          </p>
        </div>
      </div>

      <form
        noValidate
        onSubmit={handleSubmit}
        className="space-y-4 rounded-[12px] border border-slate-200 bg-white p-6 shadow-xs"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor={firstNameId}
              className="mb-1.5 block text-sm font-medium text-slate-800"
            >
              Nombre
            </label>
            <input
              id={firstNameId}
              name="firstName"
              type="text"
              autoComplete="given-name"
              placeholder="Ej. Carlos"
              required
              disabled={isSubmitting}
              value={values.firstName}
              onChange={(e) => handleFieldChange('firstName', e.target.value)}
              onBlur={() => handleFieldBlur('firstName')}
              aria-invalid={firstNameError ? true : undefined}
              aria-describedby={
                firstNameError ? `${firstNameId}-error` : undefined
              }
              className="h-10 w-full rounded-[8px] border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20 disabled:cursor-not-allowed disabled:bg-slate-50"
            />
            {firstNameError ? (
              <p
                id={`${firstNameId}-error`}
                className="mt-1 flex items-start gap-1 text-xs font-medium text-rose-600"
              >
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                <span>{firstNameError}</span>
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor={lastNameId}
              className="mb-1.5 block text-sm font-medium text-slate-800"
            >
              Apellido
            </label>
            <input
              id={lastNameId}
              name="lastName"
              type="text"
              autoComplete="family-name"
              placeholder="Ej. Mendoza"
              required
              disabled={isSubmitting}
              value={values.lastName}
              onChange={(e) => handleFieldChange('lastName', e.target.value)}
              onBlur={() => handleFieldBlur('lastName')}
              aria-invalid={lastNameError ? true : undefined}
              aria-describedby={
                lastNameError ? `${lastNameId}-error` : undefined
              }
              className="h-10 w-full rounded-[8px] border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20 disabled:cursor-not-allowed disabled:bg-slate-50"
            />
            {lastNameError ? (
              <p
                id={`${lastNameId}-error`}
                className="mt-1 flex items-start gap-1 text-xs font-medium text-rose-600"
              >
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                <span>{lastNameError}</span>
              </p>
            ) : null}
          </div>
        </div>

        <div>
          <label
            htmlFor={emailId}
            className="mb-1.5 block text-sm font-medium text-slate-800"
          >
            Correo electrónico
          </label>
          <input
            ref={emailInputRef}
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
            value={values.email}
            onChange={(e) => handleFieldChange('email', e.target.value)}
            onBlur={() => handleFieldBlur('email')}
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
              <span>
                {emailError}{' '}
                {emailConflictError ? (
                  <Link
                    href="/login"
                    className="font-semibold text-teal-700 underline"
                  >
                    Ir a iniciar sesión
                  </Link>
                ) : null}
              </span>
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor={phoneId}
            className="mb-1.5 block text-sm font-medium text-slate-800"
          >
            Teléfono de contacto
          </label>
          <input
            id={phoneId}
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="+573001234567"
            required
            disabled={isSubmitting}
            value={values.phone}
            onChange={(e) => handleFieldChange('phone', e.target.value)}
            onBlur={() => handleFieldBlur('phone')}
            aria-invalid={phoneError ? true : undefined}
            aria-describedby={
              phoneError ? `${phoneId}-error` : `${phoneId}-hint`
            }
            className="h-10 w-full rounded-[8px] border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20 disabled:cursor-not-allowed disabled:bg-slate-50"
          />
          {phoneError ? (
            <p
              id={`${phoneId}-error`}
              className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-rose-600"
            >
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>{phoneError}</span>
            </p>
          ) : (
            <p id={`${phoneId}-hint`} className="mt-1.5 text-xs text-slate-500">
              Formato internacional E.164 recomendado (ej.{' '}
              <span className="font-mono tabular-nums">+573001234567</span>).
            </p>
          )}
        </div>

        <PasswordField
          name="password"
          label="Contraseña"
          autoComplete="new-password"
          minLength={8}
          showRulesAbove
          disabled={isSubmitting}
          value={values.password}
          onChange={(next) => handleFieldChange('password', next)}
          onBlur={() => handleFieldBlur('password')}
          error={passwordError}
        />

        {formError ? (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-[8px] border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-medium text-rose-700"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{formError}</span>
          </div>
        ) : null}

        {isCaregiver ? (
          <div className="flex items-start gap-2 rounded-[8px] border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs leading-5 text-slate-600">
            <CheckCircle2
              className="mt-0.5 h-4 w-4 shrink-0 text-teal-600"
              aria-hidden
            />
            <span>
              Al crear tu cuenta, activaremos tu perfil base para que puedas
              subir tu cédula y antecedentes en el siguiente paso.
            </span>
          </div>
        ) : null}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          loading={isSubmitting}
          loadingText="Creando cuenta..."
          leftIcon={<UserPlus className="h-4 w-4" aria-hidden />}
        >
          {isCaregiver
            ? 'Crear cuenta de cuidador'
            : 'Crear cuenta familiar'}
        </Button>
      </form>

      <p className="text-center text-sm text-slate-600">
        ¿Ya tienes una cuenta?{' '}
        <Link
          href="/login"
          className="font-semibold text-teal-700 hover:underline"
        >
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}
