'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  Clock,
  FileCheck2,
  Inbox,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserCog,
} from 'lucide-react';
import { BadgeVerified } from '@/components/ui/BadgeVerified';
import { Button, buttonVariants } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { RatingStars } from '@/components/ui/RatingStars';
import { SchedulePicker } from '@/components/ui/SchedulePicker';
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
  ApiError,
  applicationsApi,
  caregiversApi,
  contactRequestsApi,
  extractErrorMessage,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  formatCOP,
  formatFullName,
  formatRelativeTime,
  toNumeric,
} from '@/lib/format';
import type {
  CaregiverProfile,
  FormattedContactRequest,
  MyApplicationItem,
  RespondContactRequestResponse,
} from '@/lib/types';
import {
  CaregiverErrorBanner,
  CaregiverSectionSkeleton,
} from './CaregiverPortalFeedback';
import { RespondInquiryModal } from './RespondInquiryModal';
import {
  applyInquiryResponseUpdate,
  getProfileMissingFields,
  getVerificationProgress,
  sortInquiriesByPriority,
  type RequiredDocChecklistStatus,
} from './caregiverUtils';

const CHECKLIST_STATUS_COPY: Record<
  RequiredDocChecklistStatus,
  { label: string; className: string }
> = {
  APPROVED: {
    label: 'Aprobado',
    className: 'border-emerald-200 bg-emerald-100/80 text-emerald-800',
  },
  PENDING: {
    label: 'En revisión',
    className: 'border-amber-200 bg-amber-100/80 text-amber-800',
  },
  REJECTED: {
    label: 'Rechazado',
    className: 'border-rose-200 bg-rose-100/80 text-rose-800',
  },
  MISSING: {
    label: 'Falta subir',
    className: 'border-slate-200 bg-white/80 text-slate-700',
  },
};

export function CaregiverDashboardView() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<CaregiverProfile | null>(null);
  const [inquiries, setInquiries] = useState<FormattedContactRequest[]>([]);
  const [applications, setApplications] = useState<MyApplicationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  const [modalInquiry, setModalInquiry] =
    useState<FormattedContactRequest | null>(null);
  const [modalAction, setModalAction] = useState<
    'ACCEPTED' | 'REJECTED' | null
  >(null);

  const triggerReload = useCallback(() => {
    setIsLoading(true);
    setErrorMessage(null);
    setReloadTick((prev) => prev + 1);
  }, []);

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      try {
        const [profileRes, inquiriesRes, applicationsRes] = await Promise.all([
          caregiversApi.getMe(),
          contactRequestsApi.getReceived(),
          applicationsApi.getMyApplications(),
        ]);

        if (!active) return;
        setProfile(profileRes);
        setInquiries(sortInquiriesByPriority(inquiriesRes));
        setApplications(applicationsRes);
        setErrorMessage(null);
      } catch (err) {
        if (!active) return;
        const msg =
          err instanceof ApiError
            ? err.message || extractErrorMessage(err.rawMessage, err.statusCode)
            : 'No pudimos cargar el resumen de tu portal.';
        setErrorMessage(msg);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void loadDashboard();

    return () => {
      active = false;
    };
  }, [reloadTick]);

  const verification = useMemo(
    () => getVerificationProgress(profile),
    [profile],
  );
  const missingFields = useMemo(
    () => getProfileMissingFields(profile),
    [profile],
  );

  const pendingInquiries = useMemo(
    () => inquiries.filter((item) => item.status === 'PENDING'),
    [inquiries],
  );
  const acceptedInquiriesCount = useMemo(
    () => inquiries.filter((item) => item.status === 'ACCEPTED').length,
    [inquiries],
  );

  const activeApplicationsCount = useMemo(
    () =>
      applications.filter(
        (app) => app.status === 'PENDING' || app.status === 'ACCEPTED',
      ).length,
    [applications],
  );
  const pendingAppsCount = useMemo(
    () => applications.filter((app) => app.status === 'PENDING').length,
    [applications],
  );
  const acceptedAppsCount = useMemo(
    () => applications.filter((app) => app.status === 'ACCEPTED').length,
    [applications],
  );

  const totalAvailabilityBlocks = useMemo(
    () =>
      (profile?.availability ?? []).reduce(
        (sum, slot) => sum + (slot.shifts?.length ?? 0),
        0,
      ),
    [profile],
  );

  const triageInquiries = useMemo(() => inquiries.slice(0, 4), [inquiries]);

  const handleInquiryResponded = useCallback(
    (inquiryId: string, response: RespondContactRequestResponse) => {
      setInquiries((prev) =>
        sortInquiriesByPriority(
          applyInquiryResponseUpdate(prev, inquiryId, response),
        ),
      );
    },
    [],
  );

  if (isLoading) {
    return <CaregiverSectionSkeleton rows={3} />;
  }

  if (errorMessage || !profile) {
    return (
      <CaregiverErrorBanner
        message={errorMessage ?? 'Perfil de cuidador no disponible.'}
        onRetry={triggerReload}
      />
    );
  }

  const ratingValue = toNumeric(profile.ratingAverage, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Hola, {user?.firstName ?? 'Cuidador'}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Supervisa tu estado de verificación, solicitudes de familias y
            disponibilidad semanal.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/caregiver/profile"
            className={buttonVariants({ variant: 'secondary', size: 'md' })}
          >
            <UserCog className="h-4 w-4" aria-hidden />
            Editar perfil
          </Link>
          <Link
            href="/job-offers"
            className={buttonVariants({ variant: 'primary', size: 'md' })}
          >
            <Search className="h-4 w-4" aria-hidden />
            Buscar Ofertas de Trabajo
          </Link>
        </div>
      </div>

      {missingFields.length > 0 ? (
        <div className="flex flex-col gap-3 rounded-[12px] border border-teal-200 bg-teal-50/70 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2.5">
            <Sparkles
              className="mt-0.5 h-4 w-4 shrink-0 text-teal-700"
              aria-hidden
            />
            <p className="text-sm text-teal-950">
              Completa tu perfil para recibir más contactos:{' '}
              <span className="font-medium">
                falta {missingFields.join(', ')}.
              </span>
            </p>
          </div>
          <Link
            href="/caregiver/profile"
            className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-teal-800 hover:text-teal-950"
          >
            Completar ahora
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      ) : null}

      {/* 12-Col Bento Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Top 12-col Trust Status Banner */}
        <section
          aria-label="Estado de verificación de confianza"
          className="lg:col-span-12"
        >
          {profile.isDocumentVerified ? (
            <div className="flex flex-col gap-4 rounded-[12px] border border-emerald-200 bg-emerald-50/80 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div className="flex items-start gap-4">
                <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <ShieldCheck className="h-6 w-6" aria-hidden />
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <BadgeVerified
                      verified={true}
                      size="md"
                      label="Insignia Activa"
                    />
                    <span className="font-mono text-xs font-semibold text-emerald-800 tabular-nums">
                      2/2 obligatorios aprobados
                    </span>
                  </div>
                  <h2 className="mt-2 text-base font-semibold text-emerald-950">
                    Perfil verificado y visible en el catálogo público
                  </h2>
                  <p className="mt-1 text-sm text-emerald-900/85">
                    Tu cédula de ciudadanía y antecedentes judiciales fueron
                    validados. Las familias pueden encontrarte y verificar tu
                    insignia de confianza.
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2.5">
                <Link
                  href={`/caregivers/${profile.id}`}
                  className={buttonVariants({
                    variant: 'secondary',
                    size: 'sm',
                  })}
                >
                  Ver ficha pública
                </Link>
                <Link
                  href="/caregiver/documents"
                  className={buttonVariants({ variant: 'outline', size: 'sm' })}
                >
                  <FileCheck2 className="h-4 w-4" aria-hidden />
                  Mis documentos
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-5 rounded-[12px] border border-amber-200 bg-amber-50/85 p-5 lg:flex-row lg:items-center lg:justify-between sm:p-6">
              <div className="flex items-start gap-4">
                <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                  <ShieldAlert className="h-6 w-6" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <BadgeVerified
                      status={
                        verification.rejectedRequiredCount > 0
                          ? 'REJECTED'
                          : 'PENDING'
                      }
                      size="md"
                      label="Verificación Pendiente"
                    />
                    <span className="font-mono text-xs font-semibold text-amber-900 tabular-nums">
                      {verification.approvedRequiredCount}/
                      {verification.totalRequiredCount} aprobados
                    </span>
                  </div>
                  <h2 className="mt-2 text-base font-semibold text-amber-950">
                    Activa tu insignia de confianza subiendo tus 2 documentos
                    obligatorios
                  </h2>
                  <p className="mt-1 text-sm text-amber-900/85">
                    Necesitas aprobación de tu Cédula de Ciudadanía y
                    Certificado de Antecedentes Judiciales para destacar como
                    cuidador verificado.
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <progress
                      aria-label="Progreso de verificación documental"
                      value={verification.approvedRequiredCount}
                      max={verification.totalRequiredCount}
                      className="h-2 w-40 overflow-hidden rounded-full"
                    />
                    <div className="flex flex-wrap gap-2">
                      {(['ID_CARD', 'CRIMINAL_RECORD'] as const).map(
                        (docType) => {
                          const docState =
                            verification.requiredStatuses[docType];
                          const badge = CHECKLIST_STATUS_COPY[docState];
                          return (
                            <span
                              key={docType}
                              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${badge.className}`}
                            >
                              <span>
                                {docType === 'ID_CARD'
                                  ? 'Cédula'
                                  : 'Antecedentes'}
                                :
                              </span>
                              <span className="font-semibold">
                                {badge.label}
                              </span>
                            </span>
                          );
                        },
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="shrink-0">
                <Link
                  href="/caregiver/documents"
                  className={buttonVariants({
                    variant: 'primary',
                    size: 'md',
                  })}
                >
                  <FileCheck2 className="h-4 w-4" aria-hidden />
                  Completar Documentación
                </Link>
              </div>
            </div>
          )}
        </section>

        {/* Row of 3 KPI Cards (4 cols each) */}
        <article className="flex flex-col justify-between rounded-[12px] border border-slate-200 bg-white p-5 lg:col-span-4">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Calificación promedio
              </span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-xs font-medium text-slate-700 tabular-nums">
                {formatCOP(profile.hourlyRate, 'Tarifa pendiente')}/h
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-3">
              <span className="font-mono text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
                {profile.totalReviews > 0 ? ratingValue.toFixed(1) : '—'}
              </span>
              <RatingStars
                rating={ratingValue}
                reviewCount={profile.totalReviews}
                showNumeric={false}
                size="md"
              />
            </div>
            <p className="mt-1.5 font-mono text-xs text-slate-600 tabular-nums">
              {profile.totalReviews}{' '}
              {profile.totalReviews === 1
                ? 'reseña verificada'
                : 'reseñas verificadas'}
            </p>
          </div>
          <div className="mt-4 border-t border-slate-100 pt-3">
            <Link
              href="/caregiver/profile"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-800"
            >
              Gestionar tarifa y perfil
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
        </article>

        <article className="flex flex-col justify-between rounded-[12px] border border-slate-200 bg-white p-5 lg:col-span-4">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Solicitudes entrantes pendientes
              </span>
              {pendingInquiries.length > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                  <Clock className="h-3 w-3" aria-hidden />
                  Requiere respuesta
                </span>
              ) : null}
            </div>
            <div className="mt-3 flex items-baseline gap-2.5">
              <span
                className={`font-mono text-3xl font-bold tracking-tight tabular-nums ${
                  pendingInquiries.length > 0
                    ? 'text-amber-600'
                    : 'text-slate-900'
                }`}
              >
                {pendingInquiries.length}
              </span>
              <span className="text-sm text-slate-600">por responder</span>
            </div>
            <p className="mt-1.5 font-mono text-xs text-slate-600 tabular-nums">
              {acceptedInquiriesCount} aceptadas · {inquiries.length} totales
            </p>
          </div>
          <div className="mt-4 border-t border-slate-100 pt-3">
            <Link
              href="/caregiver/inquiries"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-800"
            >
              Ir a solicitudes recibidas
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
        </article>

        <article className="flex flex-col justify-between rounded-[12px] border border-slate-200 bg-white p-5 lg:col-span-4">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Postulaciones activas
              </span>
              <Briefcase className="h-4 w-4 text-teal-600" aria-hidden />
            </div>
            <div className="mt-3 flex items-baseline gap-2.5">
              <span className="font-mono text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
                {activeApplicationsCount}
              </span>
              <span className="text-sm text-slate-600">
                en curso o aceptadas
              </span>
            </div>
            <p className="mt-1.5 font-mono text-xs text-slate-600 tabular-nums">
              {pendingAppsCount} en revisión · {acceptedAppsCount} contratadas
            </p>
          </div>
          <div className="mt-4 border-t border-slate-100 pt-3">
            <Link
              href="/caregiver/applications"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-800"
            >
              Ver mis postulaciones
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
        </article>

        {/* Main 7/5 Row */}
        <section
          aria-labelledby="dashboard-inquiries-heading"
          className="rounded-[12px] border border-slate-200 bg-white p-5 sm:p-6 lg:col-span-7"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] bg-teal-50 text-teal-700">
                <Inbox className="h-4 w-4" aria-hidden />
              </span>
              <div>
                <h2
                  id="dashboard-inquiries-heading"
                  className="text-base font-semibold text-slate-900"
                >
                  Solicitudes Entrantes
                </h2>
                <p className="text-xs text-slate-500">
                  Priorizamos las consultas pendientes para que respondas
                  rápido.
                </p>
              </div>
            </div>
            <Link
              href="/caregiver/inquiries"
              className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-800"
            >
              Ver todas ({inquiries.length})
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>

          {triageInquiries.length === 0 ? (
            <div className="mt-5">
              <EmptyState
                compact
                title="Aún no tienes solicitudes directas"
                description="Cuando una familia solicite contactarte desde el catálogo, aparecerá aquí para que puedas aceptarla o rechazarla."
                action={
                  <Link
                    href="/job-offers"
                    className={buttonVariants({
                      variant: 'outline',
                      size: 'sm',
                    })}
                  >
                    Explorar ofertas abiertas
                  </Link>
                }
              />
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-slate-100">
              {triageInquiries.map((inquiry) => {
                const clientName = formatFullName(
                  inquiry.participant.firstName,
                  inquiry.participant.lastName,
                  'Familia',
                );

                return (
                  <li key={inquiry.id} className="py-4 first:pt-1 last:pb-1">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900">
                            {clientName}
                          </span>
                          <StatusBadge
                            status={inquiry.status}
                            domain="contactRequest"
                          />
                          <span className="text-xs text-slate-500">
                            {formatRelativeTime(inquiry.createdAt)}
                          </span>
                        </div>
                        <p className="mt-1.5 line-clamp-2 text-sm leading-5 text-slate-600">
                          {inquiry.initialMessage}
                        </p>
                        {inquiry.status === 'ACCEPTED' &&
                        (inquiry.participant.phone ||
                          inquiry.participant.email) ? (
                          <div className="mt-2 inline-flex flex-wrap items-center gap-2 rounded-[8px] border border-emerald-200 bg-emerald-50/70 px-2.5 py-1 text-xs font-medium text-emerald-900">
                            <CheckCircle2
                              className="h-3.5 w-3.5 text-emerald-600"
                              aria-hidden
                            />
                            <span className="font-mono tabular-nums">
                              {inquiry.participant.phone ??
                                inquiry.participant.email}
                            </span>
                          </div>
                        ) : null}
                      </div>

                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        {inquiry.status === 'PENDING' ? (
                          <>
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => {
                                setModalInquiry(inquiry);
                                setModalAction('ACCEPTED');
                              }}
                            >
                              Aceptar
                            </Button>
                            <Button
                              size="sm"
                              variant="danger-outline"
                              onClick={() => {
                                setModalInquiry(inquiry);
                                setModalAction('REJECTED');
                              }}
                            >
                              Rechazar
                            </Button>
                          </>
                        ) : (
                          <Link
                            href="/caregiver/inquiries"
                            className={buttonVariants({
                              variant: 'secondary',
                              size: 'sm',
                            })}
                          >
                            Ver detalle
                          </Link>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section
          aria-labelledby="dashboard-availability-heading"
          className="flex flex-col justify-between rounded-[12px] border border-slate-200 bg-white p-5 sm:p-6 lg:col-span-5"
        >
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] bg-teal-50 text-teal-700">
                  <CalendarClock className="h-4 w-4" aria-hidden />
                </span>
                <div>
                  <h2
                    id="dashboard-availability-heading"
                    className="text-base font-semibold text-slate-900"
                  >
                    Mi Disponibilidad Semanal
                  </h2>
                  <p className="font-mono text-xs text-slate-500 tabular-nums">
                    {totalAvailabilityBlocks}{' '}
                    {totalAvailabilityBlocks === 1
                      ? 'turno activo'
                      : 'turnos activos'}
                  </p>
                </div>
              </div>
              <Link
                href="/caregiver/history"
                className="text-xs font-medium text-slate-500 hover:text-teal-700"
              >
                Historial
              </Link>
            </div>

            {totalAvailabilityBlocks === 0 ? (
              <div className="rounded-[8px] border border-amber-200 bg-amber-50/70 p-3 text-xs leading-5 text-amber-900">
                Aún no has marcado tus turnos disponibles. Configura tu horario
                para aparecer mejor posicionado ante las familias.
              </div>
            ) : null}

            <SchedulePicker
              value={profile.availability ?? []}
              readOnly
              compact
            />
          </div>

          <div className="mt-5 space-y-2.5 border-t border-slate-100 pt-4">
            <Link
              href="/caregiver/profile?tab=availability"
              className={buttonVariants({
                variant: 'secondary',
                fullWidth: true,
              })}
            >
              Actualizar Disponibilidad
            </Link>
            <Link
              href="/job-offers"
              className={buttonVariants({
                variant: 'primary',
                fullWidth: true,
              })}
            >
              <Search className="h-4 w-4" aria-hidden />
              Buscar Ofertas de Trabajo
            </Link>
          </div>
        </section>
      </div>

      <RespondInquiryModal
        inquiry={modalInquiry}
        action={modalAction}
        onClose={() => {
          setModalInquiry(null);
          setModalAction(null);
        }}
        onResponded={handleInquiryResponded}
      />
    </div>
  );
}
