'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  History,
  MapPin,
  Star,
} from 'lucide-react';
import { historyApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  CARE_SPECIALTY_LABELS,
  CARE_SPECIALTY_OPTIONS,
} from '@/lib/constants';
import {
  formatCOP,
  formatDateRange,
  formatDurationEs,
  formatFullName,
  getInitials,
  parseSafeDate,
} from '@/lib/format';
import type {
  CareSpecialty,
  ClientHistoryItem,
  HistoryStatusFilter,
  PaginationMeta,
} from '@/lib/types';
import { BadgeVerified } from '@/components/ui/BadgeVerified';
import { Button, buttonVariants } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { RatingStars } from '@/components/ui/RatingStars';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { TabsBar, type TabOption } from '@/components/ui/TabsBar';
import {
  ClientPageHeader,
  CompactScheduleSummary,
  PageLoadingSkeleton,
  SectionErrorCard,
  resolveClientErrorMessage,
} from './ClientUiHelpers';
import { ReviewModalDialog } from './ReviewModalDialog';
import {
  getReviewedCaregiverRecord,
  useReviewedCaregivers,
} from './storage';

const VALID_HISTORY_STATUSES: ReadonlySet<string> = new Set([
  'ALL',
  'ONGOING',
  'COMPLETED',
  'SCHEDULED',
]);

const VALID_CARE_SPECIALTIES: ReadonlySet<string> = new Set([
  'ELDERLY_CARE',
  'COGNITIVE_DISABILITY',
  'PHYSICAL_DISABILITY',
  'CHILD_CARE',
]);

const MONTH_YEAR_FORMATTER = new Intl.DateTimeFormat('es-CO', {
  month: 'long',
  year: 'numeric',
});

function formatMonthGroupLabel(startDate: string): string {
  const parsed = parseSafeDate(startDate);
  if (!parsed) return 'Sin fecha';
  const raw = MONTH_YEAR_FORMATTER.format(parsed);
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

const HISTORY_TABS: Array<TabOption<HistoryStatusFilter>> = [
  { id: 'ALL', label: 'Todos' },
  { id: 'ONGOING', label: 'En curso' },
  { id: 'COMPLETED', label: 'Completados' },
  { id: 'SCHEDULED', label: 'Programados' },
];

export function ClientHistoryView() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const reviewedMap = useReviewedCaregivers();

  const statusParam = searchParams.get('status') || 'ALL';
  const statusFilter: HistoryStatusFilter = VALID_HISTORY_STATUSES.has(
    statusParam,
  )
    ? (statusParam as HistoryStatusFilter)
    : 'ALL';

  const careTypeParam = searchParams.get('careType') || '';
  const careTypeFilter: CareSpecialty | '' = VALID_CARE_SPECIALTIES.has(
    careTypeParam,
  )
    ? (careTypeParam as CareSpecialty)
    : '';

  const rawPage = Number(searchParams.get('page') || '1');
  const page = Number.isInteger(rawPage) && rawPage >= 1 ? rawPage : 1;

  const updateQueryParams = (updates: {
    status?: HistoryStatusFilter;
    careType?: CareSpecialty | '';
    page?: number;
  }) => {
    const nextStatus = updates.status ?? statusFilter;
    const nextCareType = updates.careType ?? careTypeFilter;
    const nextPage = updates.page ?? page;

    const params = new URLSearchParams();
    if (nextStatus !== 'ALL') params.set('status', nextStatus);
    if (nextCareType) params.set('careType', nextCareType);
    if (nextPage > 1) params.set('page', String(nextPage));

    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const [items, setItems] = useState<ClientHistoryItem[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({
    totalItems: 0,
    itemCount: 0,
    itemsPerPage: 10,
    totalPages: 1,
    currentPage: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const [reviewTarget, setReviewTarget] = useState<ClientHistoryItem | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      try {
        const res = await historyApi.getClientHistory({
          status: statusFilter,
          careType: careTypeFilter || undefined,
          page,
          limit: 10,
        });

        if (!cancelled) {
          setItems(res.data);
          setMeta(res.meta);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            resolveClientErrorMessage(
              err,
              'No pudimos cargar tu historial de contrataciones.',
            ),
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadHistory();
    return () => {
      cancelled = true;
    };
  }, [statusFilter, careTypeFilter, page, refreshTick]);

  const handleStatusChange = (nextStatus: HistoryStatusFilter) => {
    setIsLoading(true);
    updateQueryParams({ status: nextStatus, page: 1 });
  };

  const handleCareTypeChange = (nextCareType: CareSpecialty | '') => {
    setIsLoading(true);
    updateQueryParams({ careType: nextCareType, page: 1 });
  };

  const handlePageChange = (nextPage: number) => {
    setIsLoading(true);
    updateQueryParams({ page: nextPage });
  };

  const handleClearFilters = () => {
    setIsLoading(true);
    updateQueryParams({ status: 'ALL', careType: '', page: 1 });
  };

  const handleRetry = () => {
    setIsLoading(true);
    setError(null);
    setRefreshTick((prev) => prev + 1);
  };

  const groupedByMonth = useMemo(() => {
    const groups: Array<{
      key: string;
      label: string;
      entries: ClientHistoryItem[];
    }> = [];
    const groupMap = new Map<string, ClientHistoryItem[]>();

    for (const item of items) {
      const label = formatMonthGroupLabel(item.timeframe.startDate);
      const existing = groupMap.get(label);
      if (existing) {
        existing.push(item);
      } else {
        const arr = [item];
        groupMap.set(label, arr);
        groups.push({ key: label, label, entries: arr });
      }
    }

    return groups;
  }, [items]);

  const hasActiveFilters = statusFilter !== 'ALL' || careTypeFilter !== '';

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <ClientPageHeader
        title="Historial de Servicios y Contrataciones"
        description="Consulta el detalle de cuidadores contratados, duraciones calculadas, tarifas acordadas y califica los servicios finalizados."
        actions={
          <Link
            href="/client/offers"
            className={buttonVariants({ variant: 'secondary', size: 'md' })}
          >
            <Briefcase className="h-4 w-4" aria-hidden />
            Ver mis ofertas
          </Link>
        }
      />

      {/* Filter Bar */}
      <section className="rounded-[12px] border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 pt-2 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <TabsBar
            tabs={HISTORY_TABS}
            activeTab={statusFilter}
            onChange={handleStatusChange}
            ariaLabel="Filtrar historial por estado"
            className="border-b-0"
          />

          <div className="flex flex-wrap items-center gap-2.5 pb-3 sm:pb-0">
            <label htmlFor="history-caretype" className="sr-only">
              Filtrar por especialidad
            </label>
            <select
              id="history-caretype"
              value={careTypeFilter}
              onChange={(e) =>
                handleCareTypeChange(e.target.value as CareSpecialty | '')
              }
              className="h-9 rounded-[8px] border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
            >
              <option value="">Todas las especialidades</option>
              {CARE_SPECIALTY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {hasActiveFilters ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
              >
                Limpiar
              </Button>
            ) : null}
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {isLoading ? (
            <PageLoadingSkeleton cards={3} />
          ) : error ? (
            <SectionErrorCard
              title="No pudimos cargar tu historial"
              message={error}
              onRetry={handleRetry}
            />
          ) : items.length === 0 ? (
            <EmptyState
              icon={<History className="h-6 w-6" aria-hidden />}
              title={
                hasActiveFilters
                  ? 'No hay contrataciones con estos filtros'
                  : 'Aún no tienes servicios contratados'
              }
              description={
                hasActiveFilters
                  ? 'Prueba limpiando los filtros para ver todos tus contratos registrados.'
                  : 'Cuando aceptes la postulación de un cuidador en alguna de tus ofertas, su contrato aparecerá aquí.'
              }
              action={
                hasActiveFilters ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleClearFilters}
                  >
                    Limpiar filtros
                  </Button>
                ) : (
                  <Link
                    href="/client/offers/create"
                    className={buttonVariants({
                      variant: 'primary',
                      size: 'md',
                    })}
                  >
                    Publicar Nueva Oferta
                  </Link>
                )
              }
            />
          ) : (
            <div className="space-y-8">
              {groupedByMonth.map((group) => (
                <section key={group.key} className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
                      {group.label}
                    </h2>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-mono text-xs font-semibold text-slate-600 tabular-nums">
                      {group.entries.length}{' '}
                      {group.entries.length === 1 ? 'servicio' : 'servicios'}
                    </span>
                  </div>

                  <ol className="space-y-4 border-l-2 border-slate-200 pl-5">
                    {group.entries.map((item) => {
                      const caregiverName = formatFullName(
                        item.caregiver.firstName,
                        item.caregiver.lastName,
                      );
                      const isCompleted =
                        item.timeframe.status === 'COMPLETED';
                      const isOngoing = item.timeframe.status === 'ONGOING';
                      const durationText = item.timeframe.durationDays
                        ? formatDurationEs(item.timeframe.durationDays)
                        : item.timeframe.durationFormatted;

                      const storedReview = getReviewedCaregiverRecord(
                        reviewedMap,
                        user?.id,
                        item.caregiver.id,
                      );

                      const dotColorClass = isOngoing
                        ? 'bg-emerald-500'
                        : isCompleted
                          ? 'bg-slate-400'
                          : 'bg-teal-500';

                      return (
                        <li
                          key={item.contractId}
                          className="cc-virtual-item relative"
                        >
                          <span
                            aria-hidden
                            className={`absolute -left-[27px] top-6 h-3 w-3 rounded-full ring-4 ring-white ${dotColorClass}`}
                          />

                          <article className="rounded-[12px] border border-slate-200 bg-white p-5 transition-colors hover:border-slate-300">
                            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                              <div className="min-w-0 flex-1 space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <StatusBadge
                                    status={item.timeframe.status}
                                    domain="history"
                                    size="md"
                                  />
                                  <span className="rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-800">
                                    {CARE_SPECIALTY_LABELS[item.careType]}
                                  </span>
                                </div>

                                <h3 className="text-base font-semibold text-slate-900">
                                  {item.offerTitle}
                                </h3>

                                {/* Caregiver Profile Summary */}
                                <div className="flex flex-wrap items-center gap-3 pt-1">
                                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-600 text-xs font-bold text-white">
                                    {getInitials(
                                      item.caregiver.firstName,
                                      item.caregiver.lastName,
                                    )}
                                  </span>
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <Link
                                        href={`/caregivers/${item.caregiver.id}`}
                                        className="inline-flex items-center gap-1 text-sm font-semibold text-slate-900 hover:text-teal-700"
                                      >
                                        <span>{caregiverName}</span>
                                        <ExternalLink
                                          className="h-3.5 w-3.5 text-slate-400"
                                          aria-hidden
                                        />
                                      </Link>
                                      <BadgeVerified
                                        verified={
                                          item.caregiver.isDocumentVerified
                                        }
                                        hideWhenUnverified
                                      />
                                    </div>

                                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                                      <RatingStars
                                        rating={item.caregiver.ratingAverage}
                                        reviewCount={
                                          item.caregiver.totalReviews
                                        }
                                        size="sm"
                                      />
                                      <span className="tabular-nums">
                                        {item.caregiver.yearsOfExperience}{' '}
                                        {item.caregiver.yearsOfExperience === 1
                                          ? 'año'
                                          : 'años'}{' '}
                                        de exp.
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Contract Metrics */}
                              <div className="flex shrink-0 flex-col items-start gap-2 rounded-[10px] border border-slate-200 bg-slate-50/70 p-3.5 md:min-w-[210px] md:items-end">
                                <div className="text-left md:text-right">
                                  <span className="block text-[11px] font-medium uppercase tracking-wide text-slate-500">
                                    Tarifa acordada
                                  </span>
                                  <span className="font-mono text-base font-bold text-slate-900 tabular-nums">
                                    {formatCOP(item.agreedRate)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-slate-700">
                                  <Clock
                                    className="h-3.5 w-3.5 text-teal-700"
                                    aria-hidden
                                  />
                                  <span className="font-mono font-semibold tabular-nums">
                                    {durationText}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Location, Dates & Schedule */}
                            <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-600">
                                <span className="inline-flex items-center gap-1.5">
                                  <Calendar
                                    className="h-3.5 w-3.5 text-slate-400"
                                    aria-hidden
                                  />
                                  {formatDateRange(
                                    item.timeframe.startDate,
                                    item.timeframe.endDate,
                                  )}
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                  <MapPin
                                    className="h-3.5 w-3.5 text-slate-400"
                                    aria-hidden
                                  />
                                  {item.location.city} — {item.location.zone}
                                </span>
                              </div>

                              {/* Review Action for COMPLETED engagements */}
                              {isCompleted ? (
                                storedReview ? (
                                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                                    <CheckCircle2
                                      className="h-3.5 w-3.5"
                                      aria-hidden
                                    />
                                    <span>
                                      Reseña enviada ({storedReview.rating}/5)
                                    </span>
                                  </span>
                                ) : (
                                  <Button
                                    type="button"
                                    variant="primary"
                                    size="sm"
                                    onClick={() => setReviewTarget(item)}
                                    leftIcon={
                                      <Star
                                        className="h-3.5 w-3.5"
                                        aria-hidden
                                      />
                                    }
                                  >
                                    Calificar Servicio
                                  </Button>
                                )
                              ) : null}
                            </div>

                            {item.schedule && item.schedule.length > 0 ? (
                              <div className="mt-3">
                                <CompactScheduleSummary
                                  schedule={item.schedule}
                                  maxDays={7}
                                />
                              </div>
                            ) : null}
                          </article>
                        </li>
                      );
                    })}
                  </ol>
                </section>
              ))}

              <Pagination meta={meta} onPageChange={handlePageChange} />
            </div>
          )}
        </div>
      </section>

      {/* D7 Review Modal */}
      {reviewTarget ? (
        <ReviewModalDialog
          open={Boolean(reviewTarget)}
          onClose={() => setReviewTarget(null)}
          caregiverId={reviewTarget.caregiver.id}
          caregiverName={formatFullName(
            reviewTarget.caregiver.firstName,
            reviewTarget.caregiver.lastName,
          )}
          offerTitle={reviewTarget.offerTitle}
          onSubmitted={() => {
            setRefreshTick((prev) => prev + 1);
          }}
        />
      ) : null}
    </div>
  );
}
