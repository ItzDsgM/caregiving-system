'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  Clock,
  HeartHandshake,
  MessageSquare,
  PlusCircle,
  Search,
  Users,
} from 'lucide-react';
import {
  contactRequestsApi,
  historyApi,
  jobOffersApi,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { CARE_SPECIALTY_LABELS } from '@/lib/constants';
import {
  formatCOP,
  formatDateRange,
  formatDurationEs,
  formatFullName,
  formatRelativeTime,
} from '@/lib/format';
import type {
  ClientHistoryItem,
  FormattedContactRequest,
  JobOfferApplicationItem,
  MyJobOfferItem,
} from '@/lib/types';
import { BadgeVerified } from '@/components/ui/BadgeVerified';
import { buttonVariants } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
  PageLoadingSkeleton,
  SectionErrorCard,
  resolveClientErrorMessage,
} from './ClientUiHelpers';

interface OfferPendingQueueItem {
  offer: MyJobOfferItem;
  pendingCount: number;
  latestApplicant: JobOfferApplicationItem | null;
}

interface DashboardState {
  offers: MyJobOfferItem[];
  pendingOfferQueue: OfferPendingQueueItem[];
  pendingApplicationsTotal: number;
  inquiries: FormattedContactRequest[];
  historyItems: ClientHistoryItem[];
}

export function ClientDashboardView() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      try {
        const [offersRes, inquiriesRes, historyRes] = await Promise.all([
          jobOffersApi.getMyOffers(),
          contactRequestsApi.getSent(),
          historyApi.getClientHistory({ status: 'ALL', limit: 50 }),
        ]);

        const openWithApps = offersRes
          .filter((offer) => offer.status === 'OPEN' && offer.applicationsCount > 0)
          .slice(0, 10);

        const appResults = await Promise.allSettled(
          openWithApps.map((offer) => jobOffersApi.getApplications(offer.id)),
        );

        const pendingQueue: OfferPendingQueueItem[] = [];
        let pendingTotal = 0;

        openWithApps.forEach((offer, idx) => {
          const result = appResults[idx];
          if (result && result.status === 'fulfilled') {
            const pendingApps = result.value.filter((app) => app.status === 'PENDING');
            if (pendingApps.length > 0) {
              pendingTotal += pendingApps.length;
              pendingQueue.push({
                offer,
                pendingCount: pendingApps.length,
                latestApplicant: pendingApps[0] ?? null,
              });
            }
          } else {
            pendingTotal += offer.applicationsCount;
            pendingQueue.push({
              offer,
              pendingCount: offer.applicationsCount,
              latestApplicant: null,
            });
          }
        });

        // Include any open offers beyond the 10-item lookup cap via applicationsCount fallback
        const remainingOpenWithApps = offersRes
          .filter((offer) => offer.status === 'OPEN' && offer.applicationsCount > 0)
          .slice(10);
        for (const offer of remainingOpenWithApps) {
          pendingTotal += offer.applicationsCount;
          pendingQueue.push({
            offer,
            pendingCount: offer.applicationsCount,
            latestApplicant: null,
          });
        }

        if (!cancelled) {
          setData({
            offers: offersRes,
            pendingOfferQueue: pendingQueue,
            pendingApplicationsTotal: pendingTotal,
            inquiries: inquiriesRes,
            historyItems: historyRes.data,
          });
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            resolveClientErrorMessage(
              err,
              'No pudimos cargar el resumen de tu portal.',
            ),
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [refreshTick]);

  const handleRetry = () => {
    setIsLoading(true);
    setError(null);
    setRefreshTick((prev) => prev + 1);
  };

  const derived = useMemo(() => {
    if (!data) {
      return null;
    }

    const activeOffersCount = data.offers.filter(
      (offer) => offer.status === 'OPEN',
    ).length;

    const pendingInquiriesCount = data.inquiries.filter(
      (inq) => inq.status === 'PENDING',
    ).length;

    const ongoingServices = data.historyItems.filter(
      (item) => item.timeframe.status === 'ONGOING',
    );
    const scheduledServices = data.historyItems.filter(
      (item) => item.timeframe.status === 'SCHEDULED',
    );
    const activeTimelineServices = [...ongoingServices, ...scheduledServices].slice(
      0,
      5,
    );

    const recentRespondedInquiries = [...data.inquiries]
      .filter((inq) => inq.status !== 'PENDING')
      .sort((a, b) => {
        const aTime = new Date(a.respondedAt || a.createdAt).getTime();
        const bTime = new Date(b.respondedAt || b.createdAt).getTime();
        return bTime - aTime;
      })
      .slice(0, 4);

    const pendingAppsHref =
      data.pendingOfferQueue.length === 1
        ? `/client/offers/${data.pendingOfferQueue[0].offer.id}/applications`
        : '/client/offers?status=OPEN';

    return {
      activeOffersCount,
      pendingApplicationsCount: data.pendingApplicationsTotal,
      pendingAppsHref,
      pendingInquiriesCount,
      ongoingCount: ongoingServices.length,
      activeTimelineServices,
      pendingOfferQueue: data.pendingOfferQueue,
      recentRespondedInquiries,
    };
  }, [data]);

  const greetingName = user?.firstName?.trim() || 'Familia';

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Row 1: Header (12 cols) */}
      <section className="col-span-12 rounded-[12px] border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">
              Portal del Cliente
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">
              Hola, {greetingName}
            </h1>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Administra tus ofertas publicadas, revisa postulantes verificados y haz seguimiento a tus servicios activos.
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-3">
            <Link
              href="/caregivers"
              className={buttonVariants({ variant: 'secondary', size: 'md' })}
            >
              <Search className="h-4 w-4" aria-hidden />
              Explorar Cuidadores
            </Link>
            <Link
              href="/client/offers/create"
              className={buttonVariants({ variant: 'primary', size: 'md' })}
            >
              <PlusCircle className="h-4 w-4" aria-hidden />
              Publicar Nueva Oferta
            </Link>
          </div>
        </div>
      </section>

      {isLoading ? (
        <div className="col-span-12">
          <PageLoadingSkeleton cards={4} />
        </div>
      ) : error ? (
        <div className="col-span-12">
          <SectionErrorCard
            title="No pudimos cargar tu resumen"
            message={error}
            onRetry={handleRetry}
          />
        </div>
      ) : derived ? (
        <>
          {/* Row 2: 4 equal KPI Cards (3 cols each on xl, 6 cols on sm, 12 on mobile) */}
          <section
            aria-label="Métricas principales"
            className="col-span-12 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
          >
            {/* KPI 1: Ofertas Activas */}
            <article className="flex flex-col justify-between rounded-[12px] border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Ofertas Activas
                </span>
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-teal-50 text-teal-700">
                  <Briefcase className="h-4 w-4" aria-hidden />
                </span>
              </div>
              <p className="mt-3 font-mono text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
                {derived.activeOffersCount}
              </p>
              <Link
                href="/client/offers?status=OPEN"
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 transition-colors hover:text-teal-800"
              >
                <span>Ver ofertas abiertas</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </article>

            {/* KPI 2: Postulaciones Pendientes (amber accent if > 0) */}
            <article
              className={`flex flex-col justify-between rounded-[12px] border p-5 ${
                derived.pendingApplicationsCount > 0
                  ? 'border-amber-300 bg-amber-50/40'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`text-xs font-semibold uppercase tracking-wide ${
                    derived.pendingApplicationsCount > 0
                      ? 'text-amber-800'
                      : 'text-slate-500'
                  }`}
                >
                  Postulaciones Pendientes
                </span>
                <span
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${
                    derived.pendingApplicationsCount > 0
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <Users className="h-4 w-4" aria-hidden />
                </span>
              </div>
              <p
                className={`mt-3 font-mono text-3xl font-bold tracking-tight tabular-nums ${
                  derived.pendingApplicationsCount > 0
                    ? 'text-amber-900'
                    : 'text-slate-900'
                }`}
              >
                {derived.pendingApplicationsCount}
              </p>
              <Link
                href={derived.pendingAppsHref}
                className={`mt-4 inline-flex items-center gap-1.5 text-xs font-semibold transition-colors ${
                  derived.pendingApplicationsCount > 0
                    ? 'text-amber-800 hover:text-amber-950'
                    : 'text-teal-700 hover:text-teal-800'
                }`}
              >
                <span>Revisar postulantes</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </article>

            {/* KPI 3: Solicitudes en Espera */}
            <article className="flex flex-col justify-between rounded-[12px] border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Solicitudes en Espera
                </span>
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                  <MessageSquare className="h-4 w-4" aria-hidden />
                </span>
              </div>
              <p className="mt-3 font-mono text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
                {derived.pendingInquiriesCount}
              </p>
              <Link
                href="/client/inquiries?status=PENDING"
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 transition-colors hover:text-teal-800"
              >
                <span>Ver solicitudes enviadas</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </article>

            {/* KPI 4: Cuidadores en Curso */}
            <article className="flex flex-col justify-between rounded-[12px] border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Cuidadores en Curso
                </span>
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                  <HeartHandshake className="h-4 w-4" aria-hidden />
                </span>
              </div>
              <p className="mt-3 font-mono text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
                {derived.ongoingCount}
              </p>
              <Link
                href="/client/history?status=ONGOING"
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 transition-colors hover:text-teal-800"
              >
                <span>Ver servicios activos</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </article>
          </section>

          {/* Row 3: Asymmetric 7/5 */}
          <section className="col-span-12 lg:col-span-7">
            <div className="flex h-full flex-col rounded-[12px] border border-slate-200 bg-white p-6">
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    Acción Requerida
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Postulaciones pendientes por evaluar y respuestas recientes a tus solicitudes.
                  </p>
                </div>
                <Link
                  href="/client/offers"
                  className="text-xs font-semibold text-teal-700 hover:text-teal-800"
                >
                  Ir a mis ofertas
                </Link>
              </div>

              {derived.pendingOfferQueue.length === 0 &&
              derived.recentRespondedInquiries.length === 0 ? (
                <div className="mt-5 flex-1">
                  <EmptyState
                    compact
                    icon={<CheckCircle2 className="h-6 w-6" aria-hidden />}
                    title="Todo al día por ahora"
                    description="No tienes postulaciones pendientes por revisar ni respuestas recientes sin leer."
                    action={
                      <>
                        <Link
                          href="/client/offers/create"
                          className={buttonVariants({ variant: 'primary', size: 'sm' })}
                        >
                          Publicar Nueva Oferta
                        </Link>
                        <Link
                          href="/caregivers"
                          className={buttonVariants({ variant: 'secondary', size: 'sm' })}
                        >
                          Explorar Cuidadores
                        </Link>
                      </>
                    }
                  />
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {derived.pendingOfferQueue.map(
                    ({ offer, pendingCount, latestApplicant }) => (
                      <div
                        key={offer.id}
                        className="flex flex-col gap-3 rounded-[12px] border border-amber-200 bg-amber-50/40 p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 font-mono text-xs font-semibold text-amber-800 tabular-nums">
                              <Clock className="h-3 w-3" aria-hidden />
                              {pendingCount}{' '}
                              {pendingCount === 1 ? 'pendiente' : 'pendientes'}
                            </span>
                            <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600 border border-slate-200">
                              {CARE_SPECIALTY_LABELS[offer.careType]}
                            </span>
                          </div>
                          <p className="mt-1.5 truncate text-sm font-semibold text-slate-900">
                            {offer.title}
                          </p>
                          {latestApplicant ? (
                            <p className="mt-0.5 text-xs text-slate-600">
                              Último postulante:{' '}
                              <span className="font-medium text-slate-800">
                                {formatFullName(
                                  latestApplicant.caregiver.firstName,
                                  latestApplicant.caregiver.lastName,
                                )}
                              </span>
                              {latestApplicant.proposedRate !== null ? (
                                <span className="font-mono tabular-nums text-slate-700">
                                  {' '}
                                  · {formatCOP(latestApplicant.proposedRate)}
                                </span>
                              ) : null}
                            </p>
                          ) : (
                            <p className="mt-0.5 text-xs text-slate-600">
                              {offer.locationCity} — {offer.locationZone}
                            </p>
                          )}
                        </div>

                        <Link
                          href={`/client/offers/${offer.id}/applications`}
                          className={buttonVariants({
                            variant: 'primary',
                            size: 'sm',
                            className: 'shrink-0',
                          })}
                        >
                          Revisar postulantes
                        </Link>
                      </div>
                    ),
                  )}

                  {derived.recentRespondedInquiries.map((inq) => (
                    <div
                      key={inq.id}
                      className="flex flex-col gap-3 rounded-[12px] border border-slate-200 bg-slate-50/70 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge
                            status={inq.status}
                            domain="contactRequest"
                          />
                          <span className="text-xs text-slate-500">
                            {formatRelativeTime(inq.respondedAt || inq.createdAt)}
                          </span>
                        </div>
                        <p className="mt-1.5 text-sm font-semibold text-slate-900">
                          {formatFullName(
                            inq.participant.firstName,
                            inq.participant.lastName,
                          )}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-slate-600">
                          {inq.status === 'ACCEPTED'
                            ? `Contacto desbloqueado${
                                inq.participant.phone
                                  ? ` · ${inq.participant.phone}`
                                  : ''
                              }`
                            : 'El cuidador respondió a tu solicitud de contacto.'}
                        </p>
                      </div>

                      <Link
                        href="/client/inquiries"
                        className={buttonVariants({
                          variant: 'secondary',
                          size: 'sm',
                          className: 'shrink-0',
                        })}
                      >
                        Ver solicitud
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="col-span-12 lg:col-span-5">
            <div className="flex h-full flex-col rounded-[12px] border border-slate-200 bg-white p-6">
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    Servicios en Curso
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Cuidadores activos y servicios próximos programados.
                  </p>
                </div>
                <Link
                  href="/client/history"
                  className="text-xs font-semibold text-teal-700 hover:text-teal-800"
                >
                  Historial completo
                </Link>
              </div>

              {derived.activeTimelineServices.length === 0 ? (
                <div className="mt-5 flex-1">
                  <EmptyState
                    compact
                    icon={<CalendarClock className="h-6 w-6" aria-hidden />}
                    title="Sin servicios activos"
                    description="Cuando aceptes la postulación de un cuidador, aparecerá aquí con su cronograma."
                    action={
                      <Link
                        href="/client/history"
                        className={buttonVariants({
                          variant: 'secondary',
                          size: 'sm',
                        })}
                      >
                        Ver historial de servicios
                      </Link>
                    }
                  />
                </div>
              ) : (
                <ol className="mt-5 space-y-4 border-l-2 border-slate-200 pl-4">
                  {derived.activeTimelineServices.map((item) => {
                    const isOngoing = item.timeframe.status === 'ONGOING';
                    const durationText = item.timeframe.durationDays
                      ? formatDurationEs(item.timeframe.durationDays)
                      : item.timeframe.durationFormatted;

                    return (
                      <li key={item.contractId} className="relative">
                        <span
                          aria-hidden
                          className={`absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-white ${
                            isOngoing ? 'bg-emerald-500' : 'bg-teal-500'
                          }`}
                        />
                        <div className="rounded-[12px] border border-slate-200 bg-slate-50/60 p-3.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <StatusBadge
                              status={item.timeframe.status}
                              domain="history"
                            />
                            <span className="font-mono text-xs font-semibold text-slate-700 tabular-nums">
                              {durationText}
                            </span>
                          </div>
                          <p className="mt-2 text-sm font-semibold text-slate-900">
                            {item.offerTitle}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                            <span className="font-medium text-slate-800">
                              {formatFullName(
                                item.caregiver.firstName,
                                item.caregiver.lastName,
                              )}
                            </span>
                            <BadgeVerified
                              verified={item.caregiver.isDocumentVerified}
                              hideWhenUnverified
                            />
                          </div>
                          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                            <span>
                              {formatDateRange(
                                item.timeframe.startDate,
                                item.timeframe.endDate,
                              )}
                            </span>
                            <span className="font-mono font-semibold text-teal-700 tabular-nums">
                              {formatCOP(item.agreedRate)}
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] text-slate-500">
                            {item.location.city} — {item.location.zone}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
