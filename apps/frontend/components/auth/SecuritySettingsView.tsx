'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import QRCode from 'qrcode';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  KeyRound,
  Loader2,
  LogOut,
  QrCode,
  ShieldCheck,
  ShieldOff,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ModalDialog } from '@/components/ui/ModalDialog';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/ToastRegion';
import { ApiError, authApi, usersApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { USER_ROLE_LABELS } from '@/lib/constants';
import { formatFullName } from '@/lib/format';
import { OtpCodeInput } from './OtpCodeInput';

interface TwoFactorSetupState {
  secret: string;
  otpauthUrl: string;
  qrDataUrl: string;
}

export function SecuritySettingsView() {
  const { user, setUser, refreshUser, logout } = useAuth();
  const toast = useToast();

  const [isHydratingMe, setIsHydratingMe] = useState(true);

  const [isGenerating, setIsGenerating] = useState(false);
  const [setupData, setSetupData] = useState<TwoFactorSetupState | null>(null);
  const [secretCopied, setSecretCopied] = useState(false);

  const [enableCode, setEnableCode] = useState('');
  const [enableTouched, setEnableTouched] = useState(false);
  const [enableSubmitted, setEnableSubmitted] = useState(false);
  const [enableError, setEnableError] = useState<string | null>(null);
  const [isEnabling, setIsEnabling] = useState(false);

  const [disableModalOpen, setDisableModalOpen] = useState(false);
  const [disableCode, setDisableCode] = useState('');
  const [disableTouched, setDisableTouched] = useState(false);
  const [disableSubmitted, setDisableSubmitted] = useState(false);
  const [disableError, setDisableError] = useState<string | null>(null);
  const [isDisabling, setIsDisabling] = useState(false);

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    let active = true;

    async function syncUserSecurityState() {
      try {
        const freshUser = await usersApi.getMe();
        if (active) {
          setUser(freshUser);
        }
      } catch {
        // Global unauthorized handler manages expired sessions cleanly
      } finally {
        if (active) {
          setIsHydratingMe(false);
        }
      }
    }

    void syncUserSecurityState();

    return () => {
      active = false;
      setDisableModalOpen(false);
      setSetupData(null);
      setEnableCode('');
      setDisableCode('');
    };
  }, [setUser]);

  const isTwoFactorEnabled = Boolean(user?.isTwoFactorEnabled);

  const enableFieldError = (() => {
    if (enableError) return enableError;
    if (!enableTouched && !enableSubmitted) return null;
    if (!enableCode) return 'Ingresa el código de 6 dígitos.';
    if (!/^\d{6}$/.test(enableCode)) {
      return 'El código debe contener exactamente 6 dígitos.';
    }
    return null;
  })();

  const disableFieldError = (() => {
    if (disableError) return disableError;
    if (!disableTouched && !disableSubmitted) return null;
    if (!disableCode) return 'Ingresa tu código actual de 6 dígitos.';
    if (!/^\d{6}$/.test(disableCode)) {
      return 'El código debe contener exactamente 6 dígitos.';
    }
    return null;
  })();

  const handleGenerate2fa = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setEnableError(null);
    setEnableCode('');
    setEnableTouched(false);
    setEnableSubmitted(false);

    try {
      const { secret, otpauthUrl } = await authApi.generateTwoFactorSecret();
      const qrDataUrl = await QRCode.toDataURL(otpauthUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      });
      setSetupData({ secret, otpauthUrl, qrDataUrl });
    } catch (err) {
      toast.apiError(
        err,
        'No pudimos generar el código QR de verificación en dos pasos.',
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopySecret = async () => {
    if (!setupData?.secret) return;
    try {
      await navigator.clipboard.writeText(setupData.secret);
      setSecretCopied(true);
      toast.success('Clave secreta copiada', 'Pégala manualmente en tu app autenticadora.');
      setTimeout(() => setSecretCopied(false), 2500);
    } catch {
      toast.warning(
        'No se pudo copiar automáticamente',
        'Selecciona y copia la clave manualmente.',
      );
    }
  };

  const handleEnable2fa = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isEnabling) return;

    setEnableSubmitted(true);
    setEnableError(null);

    if (!/^\d{6}$/.test(enableCode)) {
      return;
    }

    setIsEnabling(true);
    try {
      const response = await authApi.enableTwoFactor({ code: enableCode });
      if (user) {
        setUser({
          ...user,
          isTwoFactorEnabled: response.isTwoFactorEnabled,
        });
      }
      await refreshUser();
      setSetupData(null);
      setEnableCode('');
      setEnableTouched(false);
      setEnableSubmitted(false);
      toast.success(
        '2FA activado correctamente',
        'Tu cuenta ahora solicita verificación en dos pasos al iniciar sesión.',
      );
    } catch (err) {
      if (err instanceof ApiError) {
        setEnableError(
          err.statusCode === 400
            ? 'Código inválido. Verifica la hora de tu dispositivo e intenta con el código actual.'
            : err.message,
        );
      } else {
        setEnableError('No pudimos activar el 2FA. Intenta nuevamente.');
      }
    } finally {
      setIsEnabling(false);
    }
  };

  const handleOpenDisableModal = () => {
    setDisableCode('');
    setDisableTouched(false);
    setDisableSubmitted(false);
    setDisableError(null);
    setDisableModalOpen(true);
  };

  const handleCloseDisableModal = () => {
    if (isDisabling) return;
    setDisableModalOpen(false);
    setDisableCode('');
    setDisableError(null);
  };

  const handleDisable2fa = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isDisabling) return;

    setDisableSubmitted(true);
    setDisableError(null);

    if (!/^\d{6}$/.test(disableCode)) {
      return;
    }

    setIsDisabling(true);
    try {
      const response = await authApi.disableTwoFactor({ code: disableCode });
      if (user) {
        setUser({
          ...user,
          isTwoFactorEnabled: response.isTwoFactorEnabled,
        });
      }
      await refreshUser();
      setDisableModalOpen(false);
      setDisableCode('');
      toast.success(
        '2FA desactivado',
        'La verificación en dos pasos fue removida de tu cuenta.',
      );
    } catch (err) {
      if (err instanceof ApiError) {
        setDisableError(
          err.statusCode === 400
            ? 'Código TOTP incorrecto. Revisa tu app autenticadora e intenta de nuevo.'
            : err.message,
        );
      } else {
        setDisableError('No se pudo desactivar el 2FA en este momento.');
      }
    } finally {
      setIsDisabling(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Seguridad y Autenticación 2FA
        </h1>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Protege el acceso a tu cuenta CareConnect mediante códigos temporales
          TOTP generados por tu aplicación autenticadora.
        </p>
      </header>

      {/* Card 1: Two-Factor Authentication */}
      <section className="rounded-[12px] border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span
              className={`mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] ${
                isTwoFactorEnabled
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {isTwoFactorEnabled ? (
                <ShieldCheck className="h-5 w-5" aria-hidden />
              ) : (
                <ShieldOff className="h-5 w-5" aria-hidden />
              )}
            </span>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Autenticación en dos pasos (2FA)
              </h2>
              <p className="mt-0.5 text-sm text-slate-600">
                Compatible con Google Authenticator, Authy, 1Password y
                gestores TOTP estándar.
              </p>
            </div>
          </div>

          {isHydratingMe && !user ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              Verificando...
            </span>
          ) : (
            <StatusBadge
              status={isTwoFactorEnabled ? 'TWO_FACTOR_ON' : 'TWO_FACTOR_OFF'}
              label={isTwoFactorEnabled ? 'Activo' : 'Inactivo'}
              size="md"
            />
          )}
        </div>

        <div className="mt-6 border-t border-slate-100 pt-5">
          {isTwoFactorEnabled ? (
            <div className="space-y-4">
              <div className="flex items-start gap-2.5 rounded-[10px] border border-emerald-200 bg-emerald-50/80 p-3.5 text-sm leading-5 text-emerald-800">
                <CheckCircle2
                  className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
                  aria-hidden
                />
                <span>
                  La verificación en dos pasos está activa. Cada inicio de
                  sesión requerirá un código temporal de 6 dígitos además de tu
                  contraseña.
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-slate-500">
                  Si cambiaste de teléfono, desactiva el 2FA con tu código
                  actual y vuelve a vincular un nuevo código QR.
                </p>
                <Button
                  type="button"
                  variant="danger-outline"
                  size="md"
                  onClick={handleOpenDisableModal}
                >
                  Desactivar 2FA
                </Button>
              </div>
            </div>
          ) : setupData ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Left: Scannable QR + Copyable Secret */}
              <div className="flex flex-col items-center rounded-[12px] border border-slate-200 bg-slate-50/70 p-4 text-center">
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-700">
                  <QrCode className="h-3.5 w-3.5 text-teal-600" aria-hidden />
                  1. Escanea el código QR
                </div>

                <div className="mt-3 rounded-[10px] border border-slate-200 bg-white p-2.5 shadow-2xs">
                  <Image
                    src={setupData.qrDataUrl}
                    alt="Código QR para vincular autenticación en dos pasos"
                    width={176}
                    height={176}
                    unoptimized
                    className="h-44 w-44"
                  />
                </div>

                <div className="mt-4 w-full space-y-1.5 text-left">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    O ingresa esta clave manualmente
                  </p>
                  <div className="flex items-center justify-between gap-2 rounded-[8px] border border-slate-200 bg-white px-2.5 py-2">
                    <code className="min-w-0 flex-1 break-all font-mono text-xs font-semibold text-slate-900 tabular-nums">
                      {setupData.secret}
                    </code>
                    <button
                      type="button"
                      onClick={handleCopySecret}
                      aria-label="Copiar clave secreta 2FA"
                      className="inline-flex h-7 shrink-0 items-center gap-1 rounded-[6px] border border-slate-200 bg-slate-50 px-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 cursor-pointer"
                    >
                      {secretCopied ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
                          <span>Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" aria-hidden />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Right: 6-digit OTP verification */}
              <form
                noValidate
                onSubmit={handleEnable2fa}
                className="flex flex-col justify-between space-y-4"
              >
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                      2. Confirma el código generado
                    </p>
                    <p className="mt-1 text-sm leading-5 text-slate-600">
                      Introduce el código de 6 dígitos que muestra tu aplicación
                      autenticadora para activar la protección.
                    </p>
                  </div>

                  <OtpCodeInput
                    value={enableCode}
                    disabled={isEnabling}
                    onChange={(digits) => {
                      setEnableCode(digits);
                      if (enableError) setEnableError(null);
                    }}
                    onBlur={() => setEnableTouched(true)}
                    error={enableFieldError}
                  />
                </div>

                <div className="space-y-2 pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    fullWidth
                    loading={isEnabling}
                    loadingText="Activando 2FA..."
                  >
                    Confirmar y activar
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    fullWidth
                    disabled={isEnabling}
                    onClick={() => {
                      setSetupData(null);
                      setEnableCode('');
                      setEnableError(null);
                    }}
                  >
                    Cancelar configuración
                  </Button>
                </div>
              </form>
            </div>
          ) : (
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-900">
                  La verificación en dos pasos no está activada
                </p>
                <p className="text-sm text-slate-600">
                  Genera un código QR único para proteger tu cuenta en menos de
                  un minuto.
                </p>
              </div>

              <Button
                type="button"
                variant="primary"
                size="md"
                loading={isGenerating}
                loadingText="Generando QR..."
                onClick={handleGenerate2fa}
                leftIcon={<KeyRound className="h-4 w-4" aria-hidden />}
                className="shrink-0"
              >
                Activar 2FA
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Card 2: Account & Active Session Summary */}
      <section className="rounded-[12px] border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Sesión actual y estado de cuenta
            </h2>
            <p className="mt-0.5 text-sm text-slate-600">
              Cerrar sesión invalida de inmediato tus tokens JWT emitidos hasta
              este momento.
            </p>
          </div>
          {user ? (
            <StatusBadge
              status={user.isActive ? 'ACTIVE' : 'INACTIVE'}
              size="sm"
            />
          ) : null}
        </div>

        {user ? (
          <dl className="mt-4 grid grid-cols-1 gap-3 rounded-[10px] border border-slate-100 bg-slate-50/70 p-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs font-medium text-slate-500">Titular</dt>
              <dd className="mt-0.5 truncate font-semibold text-slate-900">
                {formatFullName(user.firstName, user.lastName)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Correo</dt>
              <dd className="mt-0.5 truncate font-medium text-slate-800">
                {user.email}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Rol</dt>
              <dd className="mt-0.5 font-medium text-teal-700">
                {USER_ROLE_LABELS[user.role]}
              </dd>
            </div>
          </dl>
        ) : null}

        <div className="mt-4 flex justify-end">
          <Button
            type="button"
            variant="secondary"
            size="md"
            loading={isLoggingOut}
            loadingText="Cerrando sesión..."
            onClick={handleLogout}
            leftIcon={<LogOut className="h-4 w-4" aria-hidden />}
          >
            Cerrar sesión
          </Button>
        </div>
      </section>

      <ModalDialog
        open={disableModalOpen}
        onClose={handleCloseDisableModal}
        title="Desactivar verificación en dos pasos"
        description="Por tu seguridad, confirma esta acción ingresando tu código actual de 6 dígitos."
        size="sm"
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              disabled={isDisabling}
              onClick={handleCloseDisableModal}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form="disable-2fa-form"
              variant="danger"
              loading={isDisabling}
              loadingText="Desactivando..."
            >
              Confirmar desactivación
            </Button>
          </>
        }
      >
        <form
          id="disable-2fa-form"
          noValidate
          onSubmit={handleDisable2fa}
          className="space-y-4"
        >
          <OtpCodeInput
            value={disableCode}
            autoFocus
            disabled={isDisabling}
            onChange={(digits) => {
              setDisableCode(digits);
              if (disableError) setDisableError(null);
            }}
            onBlur={() => setDisableTouched(true)}
            error={disableFieldError}
            hint="Tu cuenta dejará de solicitar código TOTP en futuros inicios de sesión."
          />

          {disableError ? (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-[8px] border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>{disableError}</span>
            </div>
          ) : null}
        </form>
      </ModalDialog>
    </div>
  );
}
