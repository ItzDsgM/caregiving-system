'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileText,
  ShieldAlert,
  ShieldCheck,
  UploadCloud,
  UserPlus,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/ToastRegion';
import { ApiError, authApi, fetchFromApi } from '@/lib/api';
import {
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_TYPE_OPTIONS,
  PASSWORD_REGEX,
  REQUIRED_VERIFICATION_DOC_TYPES,
} from '@/lib/constants';
import type { DocumentType } from '@/lib/types';
import { PasswordField } from './PasswordField';
import {
  COUNTRY_DIAL_OPTIONS,
  type CountryDialOption,
  EMAIL_FORMAT_REGEX,
  formatE164Phone,
  sanitizeNationalPhoneDigits,
  validateNationalPhone,
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

const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
]);
const ALLOWED_EXTENSIONS = /\.(pdf|jpe?g|png)$/i;

function validateSelectedDocFile(file: File): string | null {
  const hasAllowedMime = file.type ? ALLOWED_MIME_TYPES.has(file.type) : false;
  const hasAllowedExt = ALLOWED_EXTENSIONS.test(file.name);
  if (!hasAllowedMime && !hasAllowedExt) {
    return 'Formato no permitido. Solo se aceptan archivos PDF, PNG o JPG.';
  }
  if (file.size === 0) {
    return 'El archivo seleccionado está vacío.';
  }
  if (file.size > MAX_DOCUMENT_BYTES) {
    return 'El archivo supera el límite máximo de 5 MB.';
  }
  return null;
}

function formatFileSizeLabel(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  if (mb < 0.1) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${mb.toFixed(2)} MB`;
}

function validateRegisterField(
  field: FieldName,
  values: RegisterValues,
  country: CountryDialOption,
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
    case 'phone':
      return validateNationalPhone(values.phone, country);
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

interface DocumentSelectorCardProps {
  docType: DocumentType;
  requiredForBadge: boolean;
  file?: File;
  disabled: boolean;
  onSelectFile: (docType: DocumentType, file: File | null) => void;
  onRemoveFile: (docType: DocumentType) => void;
}

function DocumentSelectorCard({
  docType,
  requiredForBadge,
  file,
  disabled,
  onSelectFile,
  onRemoveFile,
}: Readonly<DocumentSelectorCardProps>) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const inputId = useId();
  const label = DOCUMENT_TYPE_LABELS[docType];

  const handleClear = () => {
    if (inputRef.current) {
      inputRef.current.value = '';
    }
    onRemoveFile(docType);
  };

  return (
    <div
      className={`rounded-[10px] border p-3.5 transition-colors ${
        file
          ? 'border-emerald-200 bg-emerald-50/40'
          : 'border-slate-200 bg-slate-50/60'
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-2.5">
          {file ? (
            <CheckCircle2
              className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600"
              aria-hidden
            />
          ) : (
            <FileText
              className="mt-0.5 h-5 w-5 shrink-0 text-slate-400"
              aria-hidden
            />
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="text-sm font-semibold text-slate-900">{label}</p>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                  requiredForBadge
                    ? 'bg-teal-100 text-teal-800'
                    : 'bg-slate-200/70 text-slate-600'
                }`}
              >
                {requiredForBadge ? 'Obligatorio para insignia' : 'Opcional'}
              </span>
            </div>
            {file ? (
              <p className="mt-1 truncate text-xs text-emerald-800">
                <span className="font-mono font-medium">{file.name}</span>{' '}
                <span className="text-slate-500 tabular-nums">
                  ({formatFileSizeLabel(file.size)})
                </span>
              </p>
            ) : (
              <p className="mt-0.5 text-xs text-slate-500">
                PDF, PNG o JPG · Máximo 5 MB
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
            disabled={disabled}
            onChange={(event) => {
              const picked = event.target.files?.[0] ?? null;
              onSelectFile(docType, picked);
              event.target.value = '';
            }}
            className="sr-only"
          />

          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            leftIcon={<UploadCloud className="h-3.5 w-3.5" aria-hidden />}
          >
            {file ? 'Cambiar' : 'Seleccionar'}
          </Button>

          {file ? (
            <button
              type="button"
              disabled={disabled}
              onClick={handleClear}
              aria-label={`Quitar archivo de ${label}`}
              className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] border border-slate-200 bg-white text-slate-500 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function RegisterForm({ role }: Readonly<RegisterFormProps>) {
  const router = useRouter();
  const toast = useToast();

  const firstNameId = useId();
  const lastNameId = useId();
  const emailId = useId();
  const phoneId = useId();

  const emailInputRef = useRef<HTMLInputElement | null>(null);
  const pendingEmailFocusRef = useRef(false);

  const [countryCode, setCountryCode] = useState<string>('CO');
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedDocs, setSelectedDocs] = useState<
    Partial<Record<DocumentType, File>>
  >({});
  const [docError, setDocError] = useState<string | null>(null);

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
  const [submittingMode, setSubmittingMode] = useState<
    'client' | 'upload' | 'skip' | null
  >(null);

  const isCaregiver = role === 'CAREGIVER';
  const selectedCountry =
    COUNTRY_DIAL_OPTIONS.find((item) => item.code === countryCode) ??
    COUNTRY_DIAL_OPTIONS[0];

  useEffect(() => {
    if (step === 1 && pendingEmailFocusRef.current) {
      pendingEmailFocusRef.current = false;
      emailInputRef.current?.focus();
    }
  }, [step]);

  const selectedRequiredCount = REQUIRED_VERIFICATION_DOC_TYPES.filter(
    (docType) => Boolean(selectedDocs[docType]),
  ).length;
  const selectedDocsCount = Object.values(selectedDocs).filter(Boolean).length;

  const requiredDocOptions = DOCUMENT_TYPE_OPTIONS.filter(
    (opt) => opt.requiredForBadge,
  );
  const optionalDocOptions = DOCUMENT_TYPE_OPTIONS.filter(
    (opt) => !opt.requiredForBadge,
  );

  const getFieldError = (field: FieldName): string | null => {
    if (field === 'email' && emailConflictError) {
      return emailConflictError;
    }
    if (!touched[field] && !hasSubmitted) {
      return null;
    }
    return validateRegisterField(field, values, selectedCountry);
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

  const validateStepOneFields = (): boolean => {
    const fields: FieldName[] = [
      'firstName',
      'lastName',
      'email',
      'phone',
      'password',
    ];
    return !fields.some(
      (field) => validateRegisterField(field, values, selectedCountry) !== null,
    );
  };

  const handleDocumentPicked = (docType: DocumentType, file: File | null) => {
    if (!file) return;
    const validationError = validateSelectedDocFile(file);
    if (validationError) {
      setDocError(validationError);
      return;
    }
    setDocError(null);
    setFormError(null);
    setSelectedDocs((prev) => ({ ...prev, [docType]: file }));
  };

  const handleDocumentRemoved = (docType: DocumentType) => {
    setDocError(null);
    setSelectedDocs((prev) => {
      const next = { ...prev };
      delete next[docType];
      return next;
    });
  };

  const handleRegistrationConflict = () => {
    setEmailConflictError(
      'Este correo electrónico ya está registrado en CareConnect.',
    );
    if (isCaregiver && step === 2) {
      pendingEmailFocusRef.current = true;
      setStep(1);
    } else {
      emailInputRef.current?.focus();
    }
  };

  const handleSubmitStepOne = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    if (isSubmitting) return;

    setHasSubmitted(true);
    setEmailConflictError(null);
    setFormError(null);

    if (!validateStepOneFields()) {
      return;
    }

    if (isCaregiver) {
      setDocError(null);
      setStep(2);
      return;
    }

    setIsSubmitting(true);
    setSubmittingMode('client');
    try {
      await authApi.register({
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        email: values.email.trim().toLowerCase(),
        phone: formatE164Phone(selectedCountry.dialCode, values.phone),
        password: values.password,
        role,
      });

      toast.success(
        'Cuenta familiar creada',
        'Ya puedes iniciar sesión y publicar tu primera oferta.',
      );
      router.push('/login?registered=client');
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 409) {
        handleRegistrationConflict();
      } else if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError(
          'No pudimos completar el registro. Intenta de nuevo en unos segundos.',
        );
      }
    } finally {
      setIsSubmitting(false);
      setSubmittingMode(null);
    }
  };

  const handleCaregiverComplete = async (uploadSelectedDocs: boolean) => {
    if (isSubmitting) return;

    setHasSubmitted(true);
    setEmailConflictError(null);
    setFormError(null);
    setDocError(null);

    if (!validateStepOneFields()) {
      setStep(1);
      return;
    }

    const normalizedEmail = values.email.trim().toLowerCase();
    const formattedPhone = formatE164Phone(
      selectedCountry.dialCode,
      values.phone,
    );

    setIsSubmitting(true);
    setSubmittingMode(uploadSelectedDocs ? 'upload' : 'skip');

    try {
      await authApi.register({
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        email: normalizedEmail,
        phone: formattedPhone,
        password: values.password,
        role: 'CAREGIVER',
      });
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 409) {
        handleRegistrationConflict();
      } else if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError(
          'No pudimos completar el registro. Intenta de nuevo en unos segundos.',
        );
      }
      setIsSubmitting(false);
      setSubmittingMode(null);
      return;
    }

    if (!uploadSelectedDocs) {
      toast.success(
        'Cuenta de cuidador creada',
        'Puedes iniciar sesión y subir tus documentos de verificación más adelante desde tu portal.',
      );
      router.push('/login?registered=caregiver');
      return;
    }

    try {
      const loginResponse = await authApi.login({
        email: normalizedEmail,
        password: values.password,
      });

      if (
        !('access_token' in loginResponse) ||
        !loginResponse.access_token
      ) {
        toast.warning(
          'Cuenta creada; inicia sesión para subir documentos',
          'Tu cuenta fue registrada, pero debes completar el inicio de sesión para subir tus archivos desde el portal.',
        );
        router.push('/login?registered=caregiver');
        return;
      }

      const accessToken = loginResponse.access_token;
      const entries = Object.entries(selectedDocs) as Array<
        [DocumentType, File | undefined]
      >;

      let uploadedCount = 0;
      let failedCount = 0;

      for (const [docType, file] of entries) {
        if (!file) continue;
        const formData = new FormData();
        formData.append('file', file);
        formData.append('documentType', docType);

        try {
          await fetchFromApi('/caregivers/me/documents', {
            method: 'POST',
            body: formData,
            token: accessToken,
            skipUnauthorizedRedirect: true,
          });
          uploadedCount += 1;
        } catch {
          failedCount += 1;
        }
      }

      if (failedCount === 0) {
        toast.success(
          'Cuenta y documentos registrados',
          `Se ${
            uploadedCount === 1
              ? 'subió 1 documento'
              : `subieron ${uploadedCount} documentos`
          } para revisión. Ya puedes iniciar sesión.`,
        );
      } else if (uploadedCount > 0) {
        toast.warning(
          'Cuenta creada con carga parcial',
          `Se subieron ${uploadedCount} documentos, pero ${failedCount} fallaron. Inicia sesión para subir los pendientes desde tu portal.`,
        );
      } else {
        toast.warning(
          'Cuenta creada; documentos pendientes',
          'Tu cuenta fue creada, pero no pudimos subir los archivos en este momento. Inicia sesión para cargarlos desde tu portal.',
        );
      }

      router.push('/login?registered=caregiver');
    } catch {
      toast.warning(
        'Cuenta creada; documentos pendientes',
        'Tu cuenta fue creada, pero no pudimos iniciar sesión automáticamente para subir los archivos. Inicia sesión para cargarlos desde tu portal.',
      );
      router.push('/login?registered=caregiver');
    } finally {
      setIsSubmitting(false);
      setSubmittingMode(null);
    }
  };

  const firstNameError = getFieldError('firstName');
  const lastNameError = getFieldError('lastName');
  const emailError = getFieldError('email');
  const phoneError = getFieldError('phone');
  const passwordError = getFieldError('password');

  const phoneDigitHint =
    selectedCountry.minDigits === selectedCountry.maxDigits
      ? `${selectedCountry.minDigits} dígitos`
      : `${selectedCountry.minDigits} a ${selectedCountry.maxDigits} dígitos`;

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
            {step === 2 ? (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  setFormError(null);
                  setStep(1);
                }}
                className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 hover:underline disabled:pointer-events-none disabled:opacity-60 cursor-pointer"
              >
                <CheckCircle2
                  className="h-5 w-5 shrink-0 text-emerald-600"
                  aria-hidden
                />
                <span>Cuenta base</span>
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 font-semibold text-teal-800">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-teal-600 text-[11px] font-bold text-white tabular-nums">
                  1
                </span>
                Cuenta base
              </span>
            )}

            <ArrowRight
              className="h-3.5 w-3.5 shrink-0 text-teal-500"
              aria-hidden
            />

            {step === 2 ? (
              <span className="inline-flex items-center gap-1.5 font-semibold text-teal-800">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-teal-600 text-[11px] font-bold text-white tabular-nums">
                  2
                </span>
                Documentos de verificación
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 font-medium text-slate-600">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 bg-white text-[11px] font-semibold text-slate-600 tabular-nums">
                  2
                </span>
                Documentos de verificación
              </span>
            )}
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
              ? step === 2
                ? 'Documentos de verificación'
                : 'Crea tu cuenta de cuidador'
              : 'Crea tu cuenta familiar'}
          </h1>
          <p className="mt-1 text-sm leading-5 text-slate-600">
            {isCaregiver
              ? step === 2
                ? 'Adjunta tu cédula y antecedentes para obtener la insignia de confianza verificada, o omite este paso y súbelos luego desde tu portal.'
                : 'Completa tus datos base para activar tu perfil y avanzar a la verificación documental.'
              : 'Regístrate para publicar ofertas de cuidado y contactar cuidadores verificados.'}
          </p>
        </div>
      </div>

      {!isCaregiver || step === 1 ? (
        <form
          noValidate
          onSubmit={handleSubmitStepOne}
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
                  <AlertCircle
                    className="mt-0.5 h-3.5 w-3.5 shrink-0"
                    aria-hidden
                  />
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
                  <AlertCircle
                    className="mt-0.5 h-3.5 w-3.5 shrink-0"
                    aria-hidden
                  />
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
                <AlertCircle
                  className="mt-0.5 h-3.5 w-3.5 shrink-0"
                  aria-hidden
                />
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
            <div className="flex items-stretch gap-2">
              <select
                aria-label="Indicativo de país"
                disabled={isSubmitting}
                value={countryCode}
                onChange={(e) => {
                  setCountryCode(e.target.value);
                  if (formError) setFormError(null);
                }}
                className="h-10 w-[136px] shrink-0 rounded-[8px] border border-slate-200 bg-white px-2.5 text-sm text-slate-900 transition-colors focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20 disabled:cursor-not-allowed disabled:bg-slate-50 sm:w-[152px]"
              >
                {COUNTRY_DIAL_OPTIONS.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.flag} {country.dialCode} ({country.code}) ·{' '}
                    {country.name}
                  </option>
                ))}
              </select>

              <input
                id={phoneId}
                name="phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                maxLength={selectedCountry.maxDigits}
                placeholder={`Ej. ${selectedCountry.placeholder}`}
                required
                disabled={isSubmitting}
                value={values.phone}
                onChange={(e) => {
                  const sanitized = sanitizeNationalPhoneDigits(
                    e.target.value,
                    selectedCountry.dialCode,
                    selectedCountry.maxDigits,
                  );
                  handleFieldChange('phone', sanitized);
                }}
                onBlur={() => handleFieldBlur('phone')}
                aria-invalid={phoneError ? true : undefined}
                aria-describedby={
                  phoneError ? `${phoneId}-error` : `${phoneId}-hint`
                }
                className="h-10 min-w-0 flex-1 rounded-[8px] border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20 disabled:cursor-not-allowed disabled:bg-slate-50 tabular-nums"
              />
            </div>
            {phoneError ? (
              <p
                id={`${phoneId}-error`}
                className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-rose-600"
              >
                <AlertCircle
                  className="mt-0.5 h-3.5 w-3.5 shrink-0"
                  aria-hidden
                />
                <span>{phoneError}</span>
              </p>
            ) : (
              <p
                id={`${phoneId}-hint`}
                className="mt-1.5 text-xs text-slate-500"
              >
                {selectedCountry.flag} {selectedCountry.name} (
                <span className="font-mono tabular-nums">
                  {selectedCountry.dialCode}
                </span>
                ) · {phoneDigitHint} (ej.{' '}
                <span className="font-mono tabular-nums">
                  {selectedCountry.placeholder}
                </span>
                ).
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
                En el siguiente paso podrás adjuntar tu cédula y antecedentes
                judiciales para verificación o elegir subirlos luego desde tu
                portal.
              </span>
            </div>
          ) : null}

          {isCaregiver ? (
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              disabled={isSubmitting}
              rightIcon={<ArrowRight className="h-4 w-4" aria-hidden />}
            >
              Continuar a documentación
            </Button>
          ) : (
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={isSubmitting && submittingMode === 'client'}
              loadingText="Creando cuenta..."
              leftIcon={<UserPlus className="h-4 w-4" aria-hidden />}
            >
              Crear cuenta familiar
            </Button>
          )}
        </form>
      ) : (
        <div className="space-y-5 rounded-[12px] border border-slate-200 bg-white p-6 shadow-xs">
          {/* Requisitos de Verificación */}
          <section
            aria-labelledby="register-docs-required-heading"
            className="space-y-3 rounded-[10px] border border-slate-200 bg-slate-50/70 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                {selectedRequiredCount ===
                REQUIRED_VERIFICATION_DOC_TYPES.length ? (
                  <ShieldCheck
                    className="h-5 w-5 shrink-0 text-emerald-600"
                    aria-hidden
                  />
                ) : (
                  <ShieldAlert
                    className="h-5 w-5 shrink-0 text-amber-600"
                    aria-hidden
                  />
                )}
                <h2
                  id="register-docs-required-heading"
                  className="text-sm font-semibold text-slate-900"
                >
                  Requisitos de Verificación
                </h2>
              </div>
              <span className="font-mono text-xs font-semibold text-slate-700 tabular-nums">
                {selectedRequiredCount}/2
              </span>
            </div>

            <progress
              aria-label="Progreso de requisitos de verificación"
              value={selectedRequiredCount}
              max={2}
              className="h-2 w-full overflow-hidden rounded-full"
            />

            <p className="text-xs leading-5 text-slate-600">
              Para activar tu insignia de cuidador verificado necesitarás subir
              estos 2 documentos obligatorios:
            </p>

            <div className="space-y-2.5">
              {requiredDocOptions.map((opt) => (
                <DocumentSelectorCard
                  key={opt.value}
                  docType={opt.value}
                  requiredForBadge={opt.requiredForBadge}
                  file={selectedDocs[opt.value]}
                  disabled={isSubmitting}
                  onSelectFile={handleDocumentPicked}
                  onRemoveFile={handleDocumentRemoved}
                />
              ))}
            </div>
          </section>

          {/* Opcionales recomendados */}
          <section
            aria-labelledby="register-docs-optional-heading"
            className="space-y-2.5"
          >
            <div>
              <h3
                id="register-docs-optional-heading"
                className="text-xs font-semibold uppercase tracking-wide text-slate-600"
              >
                Opcionales recomendados
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Fortalece tu perfil con certificados de salud o formación
                académica.
              </p>
            </div>

            <div className="space-y-2.5">
              {optionalDocOptions.map((opt) => (
                <DocumentSelectorCard
                  key={opt.value}
                  docType={opt.value}
                  requiredForBadge={opt.requiredForBadge}
                  file={selectedDocs[opt.value]}
                  disabled={isSubmitting}
                  onSelectFile={handleDocumentPicked}
                  onRemoveFile={handleDocumentRemoved}
                />
              ))}
            </div>
          </section>

          {docError ? (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-[8px] border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-medium text-rose-700"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>{docError}</span>
            </div>
          ) : null}

          {formError ? (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-[8px] border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-medium text-rose-700"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>{formError}</span>
            </div>
          ) : null}

          <div className="space-y-3 border-t border-slate-100 pt-4">
            <Button
              type="button"
              variant="primary"
              size="lg"
              fullWidth
              disabled={selectedDocsCount === 0 || isSubmitting}
              loading={isSubmitting && submittingMode === 'upload'}
              loadingText="Creando cuenta y subiendo..."
              leftIcon={<UploadCloud className="h-4 w-4" aria-hidden />}
              onClick={() => {
                void handleCaregiverComplete(true);
              }}
            >
              Crear cuenta y subir documentos
            </Button>

            <div className="rounded-[10px] border border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5">
              <p className="text-xs leading-5 text-slate-600">
                Si prefieres completar tu registro ahora y subir tus documentos
                más adelante desde tu portal de cuidador, puedes omitir este
                paso explícitamente:
              </p>
              <Button
                type="button"
                variant="secondary"
                size="md"
                fullWidth
                disabled={isSubmitting}
                loading={isSubmitting && submittingMode === 'skip'}
                loadingText="Creando cuenta..."
                onClick={() => {
                  void handleCaregiverComplete(false);
                }}
              >
                Omitir por ahora y crear cuenta
              </Button>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="md"
              fullWidth
              disabled={isSubmitting}
              leftIcon={<ArrowLeft className="h-4 w-4" aria-hidden />}
              onClick={() => {
                setFormError(null);
                setStep(1);
              }}
            >
              Volver a datos de la cuenta
            </Button>
          </div>
        </div>
      )}

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
