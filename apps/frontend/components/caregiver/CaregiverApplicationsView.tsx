'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Info,
  MapPin,
  Search,
  Send,
} from 'lucide-react';
import { buttonVariants } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { TabsBar, type TabOption } from '@/components/ui/TabsBar';
import { ApiError, applicationsApi, extractErrorMessage } from '@/lib/api';
import { CARE_SPECIALTY_LABELS } from '@/lib/constants';
import {
  formatCOP,
  formatCOPRange,
  formatDate,
  formatDateRange,
  formatRelativeTime,
} from '@/lib/format';
import type { ApplicationStatus, MyApplicationItem } from '@/lib/types';
import {
  CaregiverErrorBanner,
  CaregiverSectionSkeleton,
} from './CaregiverPortalFeedback';

type ApplicationTabFilter = 'ALL' | ApplicationStatus;

export function CaregiverApplicationsView() {
  const [applications, setApplications] = useState<MyApplicationItem[]>([]);
  const [activeTab, setActiveTab] = useState<ApplicationTabFilter>('ALL');
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  const triggerReload = useCallback(() => {
    setIsLoading(true);
    setLoadError(null);
    setReloadTick((prev) => prev + 1);
  }, []);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const res = await applicationsApi.getMyApplications();
        if (!active) return;
        setApplications(res);
        setLoadError(null);
      } catch (err) {
        if (!active) return;
        const msg =
          err instanceof ApiError
            ? err.message || extractErrorMessage(err.rawMessage, err.statusCode)
            : 'No pudimos cargar tus postulaciones.';
        setLoadError(msg);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [reloadTick]);

  const counts = useMemo(() => {
    let pending = 0;
    let accepted = 0;
    let rejected = 0;
    for (const app of applications) {
      if (app.status === 'PENDING') pending += 1;
      else if (app.status === 'ACCEPTED') accepted += 1;
      else if (app.status === 'REJECTED') rejected += 1;
    }
    return {
      ALL: applications.length,
      PENDING: pending,
      ACCEPTED: accepted,
      REJECTED: rejected,
    };
  }, [applications]);

  const tabs: ReadonlyArray<TabOption<ApplicationTabFilter>> = useMemo(
    () => [
      { id: 'ALL', label: 'Todas', count: counts.ALL },
      { id: 'PENDING', label: 'En revisión', count: counts.PENDING },
      { id: 'ACCEPTED', label: 'Aceptadas', count: counts.ACCEPTED },
      { id: 'REJECTED', label: 'Rechazadas', count: counts.REJECTED },
    ],
    [counts],
  );

  const filteredApplications = useMemo(() => {
    if (activeTab === 'ALL') return applications;
    return applications.filter((app) => app.status === activeTab);
  }, [applications, activeTab]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (isLoading) {
    return <CaregiverSectionSkeleton rows={3} />;
  }

  if (loadError) {
    return (
      <CaregiverErrorBanner message={loadError} onRetry={triggerReload} />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Mis Postulaciones
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Haz seguimiento al estado de las ofertas laborales a las que te has
            postulado.
          </p>
        </div>
        <Link
          href="/job-offers"
          className={buttonVariants({ variant: 'primary', size: 'md' })}
        >
          <Search className="h-4 w-4" aria-hidden />
          Explorar ofertas abiertas
        </Link>
      </div>

      {/* TabsBar */}
      <div className="rounded-[12px] border border-slate-200 bg-white px-4 sm:px-6">
        <TabsBar
          tabs={tabs}
          activeTab={activeTab}
          onChange={setActiveTab}
          ariaLabel="Filtrar postulaciones por estado"
        />
      </div>

      {/* List */}
      <div
        id={`tabpanel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`tab-${activeTab}`}
      >
        {filteredApplications.length === 0 ? (
          <EmptyState
            icon={<Send className="h-6 w-6" aria-hidden />}
            title={
              activeTab === 'ALL'
                ? 'Aún no te has postulado a ninguna oferta'
                : `No tienes postulaciones en estado ${activeTab}`
            }
            description="Explora las ofertas publicadas por familias en tu ciudad y envía tu propuesta con tu tarifa por hora."
            action={
              activeTab === 'ALL' ? (
                <Link
                  href="/job-offers"
                  className={buttonVariants({ variant: 'primary', size: 'md' })}
                >
                  Buscar Ofertas de Trabajo
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveTab('ALL')}
                  className={buttonVariants({
                    variant: 'secondary',
                    size: 'md',
                  })}
                >
                  Ver todas las postulaciones
                </button>
              )
            }
          />
        ) : (
          <div className="space-y-4">
            {filteredApplications.map((app) => {
              const offer = app.jobOffer;
              const isAccepted = app.status === 'ACCEPTED';
              const isExpanded = Boolean(expandedIds[app.id]);
              const isLongCoverLetter =
                (app.coverLetter?.length ?? 0) > 190 ||
                (app.coverLetter?.split('\n').length ?? 0) > 3;

              return (
                <article
                  key={app.id}
                  className={`cc-virtual-item rounded-[12px] border bg-white p-5 sm:p-6 ${
                    isAccepted
                      ? 'border-emerald-300 ring-1 ring-emerald-200/70'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-800">
                          {CARE_SPECIALTY_LABELS[offer.careType]}
                        </span>
                        <StatusBadge
                          status={app.status}
                          domain="application"
                          size="md"
                        />
                        {offer.status !== 'OPEN' ? (
                          <StatusBadge
                            status={offer.status}
                            domain="jobOffer"
                            size="sm"
                          />
                        ) : null}
                      </div>

                      <h2 className="mt-2.5 text-lg font-semibold text-slate-900">
                        <Link
                          href={`/job-offers/${offer.id}`}
                          className="inline-flex items-center gap-1.5 hover:text-teal-700"
                        >
                          <span>{offer.title}</span>
                          <ArrowUpRight
                            className="h-4 w-4 shrink-0 text-slate-400"
                            aria-hidden
                          />
                        </Link>
                      </h2>

                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-600">
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin
                            className="h-3.5 w-3.5 text-slate-400"
                            aria-hidden
                          />
                          {offer.locationCity} · {offer.locationZone}
                        </span>
                        <span className="inline-flex items-center gap-1.5 font-mono tabular-nums">
                          <Calendar
                            className="h-3.5 w-3.5 text-slate-400"
                            aria-hidden
                          />
                          {formatDateRange(offer.startDate, offer.endDate)}
                        </span>
                        <span className="text-slate-500">
                          Postulado {formatRelativeTime(app.appliedAt)} (
                          {formatDate(app.appliedAt)})
                        </span>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-row gap-4 rounded-[8px] border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 sm:flex-col sm:gap-1 sm:text-right">
                      <div>
                        <span className="block text-[11px] font-medium uppercase tracking-wide text-slate-500">
                          Tu tarifa propuesta
                        </span>
                        <span className="font-mono text-base font-bold text-slate-900 tabular-nums">
                          {app.proposedRate
                            ? formatCOP(app.proposedRate)
                            : 'Por acordar'}
                        </span>
                      </div>
                      <div className="border-l border-slate-200 pl-4 sm:border-l-0 sm:pl-0">
                        <span className="block text-[11px] text-slate-500">
                          Presupuesto oferta
                        </span>
                        <span className="font-mono text-xs font-medium text-slate-700 tabular-nums">
                          {formatCOPRange(offer.budgetMin, offer.budgetMax)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Cover Letter */}
                  <div className="mt-4 rounded-[8px] border border-slate-200 bg-slate-50/60 p-3.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Carta de presentación enviada
                    </p>
                    <p
                      className={`mt-1.5 whitespace-pre-line text-sm leading-6 text-slate-700 ${
                        isLongCoverLetter && !isExpanded ? 'line-clamp-3' : ''
                      }`}
                    >
                      {app.coverLetter}
                    </p>
                    {isLongCoverLetter ? (
                      <button
                        type="button"
                        aria-expanded={isExpanded}
                        onClick={() => toggleExpand(app.id)}
                        className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-800 cursor-pointer"
                      >
                        {isExpanded ? (
                          <>
                            Ocultar carta completa
                            <ChevronUp className="h-3.5 w-3.5" aria-hidden />
                          </>
                        ) : (
                          <>
                            Ver carta completa
                            <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                          </>
                        )}
                      </button>
                    ) : null}
                  </div>

                  {/* Accepted Confirmation Card */}
                  {isAccepted ? (
                    <div className="mt-4 rounded-[12px] border border-emerald-200 bg-emerald-50/80 p-4 sm:p-5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-start gap-3">
                          <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                            <CheckCircle2 className="h-5 w-5" aria-hidden />
                          </span>
                          <div className="space-y-1.5">
                            <h3 className="text-sm font-bold text-emerald-950">
                              ¡Fuiste contratado! Tu postulación fue aceptada
                            </h3>
                            <p className="text-xs font-medium text-emerald-900">
                              {offer.title} · {offer.locationCity} (
                              {offer.locationZone}) ·{' '}
                              <span className="font-mono tabular-nums">
                                {formatDateRange(offer.startDate, offer.endDate)}
                              </span>{' '}
                              · Tarifa acordada:{' '}
                              <span className="font-mono font-semibold tabular-nums">
                                {formatCOP(app.proposedRate ?? offer.budgetMax)}
                              </span>
                            </p>
                            <div className="flex items-start gap-2 rounded-[8px] border border-emerald-200/80 bg-white/80 px-3 py-2 text-xs leading-5 text-slate-700">
                              <Info
                                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-700"
                                aria-hidden
                              />
                              <span>
                                La familia desbloqueó tus datos de contacto al
                                aceptar esta postulación para coordinar el
                                inicio del servicio. La coordinación mutua
                                directa por teléfono, correo y WhatsApp también
                                se habilita al aceptar solicitudes directas.
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-end">
                          <Link
                            href="/caregiver/history"
                            className={buttonVariants({
                              variant: 'primary',
                              size: 'sm',
                            })}
                          >
                            Ver en mi historial
                          </Link>
                          <Link
                            href="/caregiver/inquiries"
                            className={buttonVariants({
                              variant: 'secondary',
                              size: 'sm',
                            })}
                          >
                            Ir a solicitudes
                          </Link>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
