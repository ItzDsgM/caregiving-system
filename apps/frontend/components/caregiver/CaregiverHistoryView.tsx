'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  CalendarCheck2,
  CheckCircle2,
  History,
  PlayCircle,
  Search,
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ApiError, extractErrorMessage, historyApi } from '@/lib/api';
import {
  CARE_SPECIALTY_LABELS,
  CARE_SPECIALTY_OPTIONS,
  HISTORY_STATUS_LABELS,
} from '@/lib/constants';
import { formatCOP, formatDateRange, formatFullName } from '@/lib/format';
import type {
  CaregiverHistoryItem,
  CareSpecialty,
  HistoryStatusFilter,
  PaginationMeta,
} from '@/lib/types';
import {
  CaregiverErrorBanner,
  CaregiverSectionSkeleton,
} from './CaregiverPortalFeedback';

const STATUS_FILTER_OPTIONS: HistoryStatusFilter[] = [
  'ALL',
  'ONGOING',
  'COMPLETED',
  'SCHEDULED',
];

const DEFAULT_META: PaginationMeta = {
  totalItems: 0,
  itemCount: 0,
  itemsPerPage: 10,
  totalPages: 1,
  currentPage: 1,
};

interface HistorySummaryMetrics {
  accumulatedDays: number;
  completedCount: number;
  ongoingCount: number;
}

export function CaregiverHistoryView() {
  const [items, setItems] = useState<CaregiverHistoryItem[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(DEFAULT_META);
  const [summary, setSummary] = useState<HistorySummaryMetrics>({
    accumulatedDays: 0,
    completedCount: 0,
    ongoingCount: 0,
  });

  const [statusFilter, setStatusFilter] = useState<HistoryStatusFilter>('ALL');
  const [careTypeFilter, setCareTypeFilter] = useState<CareSpecialty | ''>('');
  const [page, setPage] = useState(1);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  const triggerReload = useCallback(() => {
    setIsLoading(true);
    setLoadError(null);
    setReloadTick((prev) => prev + 1);
  }, []);

  // Fetch executive summary metrics across all statuses once (or on manual reload)
  useEffect(() => {
    let active = true;

    async function loadSummary() {
      try {
        const firstPage = await historyApi.getCaregiverHistory({
          status: 'ALL',
          page: 1,
          limit: 50,
        });
        let allRecords = [...firstPage.data];
        if (firstPage.meta.totalPages > 1) {
          const restPages = await Promise.all(
            Array.from(
              { length: firstPage.meta.totalPages - 1 },
              (_, idx) =>
                historyApi.getCaregiverHistory({
                  status: 'ALL',
                  page: idx + 2,
                  limit: 50,
                }),
            ),
          );
          for (const pageRes of restPages) {
            allRecords = allRecords.concat(pageRes.data);
          }
        }

        if (!active) return;

        let accumulatedDays = 0;
        let completedCount = 0;
        let ongoingCount = 0;
        for (const item of allRecords) {
          accumulatedDays += Number(item.timeframe?.durationDays || 0);
          if (item.timeframe?.status === 'COMPLETED') completedCount += 1;
          else if (item.timeframe?.status === 'ONGOING') ongoingCount += 1;
        }

        setSummary({ accumulatedDays, completedCount, ongoingCount });
      } catch {
        // Summary stays gracefully at 0 if history request fails (main loader surfaces error)
      }
    }

    void loadSummary();

    return () => {
      active = false;
    };
  }, [reloadTick]);

  // Fetch filtered paginated table data
  useEffect(() => {
    let active = true;

    async function loadHistoryTable() {
      try {
        const res = await historyApi.getCaregiverHistory({
          status: statusFilter,
          careType: careTypeFilter || undefined,
          page,
          limit: 10,
        });
        if (!active) return;
        setItems(res.data);
        setMeta(res.meta);
        setLoadError(null);
      } catch (err) {
        if (!active) return;
        const msg =
          err instanceof ApiError
            ? err.message || extractErrorMessage(err.rawMessage, err.statusCode)
            : 'No pudimos cargar tu historial de servicios.';
        setLoadError(msg);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void loadHistoryTable();

    return () => {
      active = false;
    };
  }, [statusFilter, careTypeFilter, page, reloadTick]);

  const handleStatusChange = (nextStatus: HistoryStatusFilter) => {
    if (nextStatus === statusFilter) return;
    setStatusFilter(nextStatus);
    setPage(1);
    setIsLoading(true);
  };

  const handleCareTypeChange = (nextCareType: CareSpecialty | '') => {
    if (nextCareType === careTypeFilter) return;
    setCareTypeFilter(nextCareType);
    setPage(1);
    setIsLoading(true);
  };

  const handleClearFilters = () => {
    if (statusFilter === 'ALL' && careTypeFilter === '' && page === 1) return;
    setStatusFilter('ALL');
    setCareTypeFilter('');
    setPage(1);
    setIsLoading(true);
  };

  const hasActiveFilters = statusFilter !== 'ALL' || careTypeFilter !== '';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Historial de Servicios Prestados
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Registro cronológico de tus contrataciones aceptadas, duraciones y
            tarifas acordadas.
          </p>
        </div>
        <Link
          href="/job-offers"
          className={buttonVariants({ variant: 'primary', size: 'md' })}
        >
          <Search className="h-4 w-4" aria-hidden />
          Buscar Ofertas
        </Link>
      </div>

      {/* Executive Summary Header Metrics in Geist Mono */}
      <section
        aria-label="Resumen ejecutivo de servicios"
        className="grid grid-cols-1 gap-4 sm:grid-cols-3"
      >
        <article className="rounded-[12px] border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Días acumulados
            </span>
            <CalendarCheck2
              className="h-4 w-4 text-teal-600"
              aria-hidden
            />
          </div>
          <p className="mt-3 font-mono text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
            {summary.accumulatedDays}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Duración total registrada en contratos
          </p>
        </article>

        <article className="rounded-[12px] border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Servicios Completados
            </span>
            <CheckCircle2
              className="h-4 w-4 text-emerald-600"
              aria-hidden
            />
          </div>
          <p className="mt-3 font-mono text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
            {summary.completedCount}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Servicios finalizados satisfactoriamente
          </p>
        </article>

        <article className="rounded-[12px] border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              En Curso
            </span>
            <PlayCircle className="h-4 w-4 text-emerald-600" aria-hidden />
          </div>
          <p className="mt-3 font-mono text-3xl font-bold tracking-tight text-emerald-700 tabular-nums">
            {summary.ongoingCount}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Contratos activos en ejecución hoy
          </p>
        </article>
      </section>

      {/* Filter Bar */}
      <section
        aria-label="Filtros del historial"
        className="flex flex-col gap-3 rounded-[12px] border border-slate-200 bg-white p-4 lg:flex-row lg:items-center lg:justify-between"
      >
        <div
          role="group"
          aria-label="Filtrar por estado del servicio"
          className="flex flex-wrap items-center gap-2"
        >
          {STATUS_FILTER_OPTIONS.map((option) => {
            const active = statusFilter === option;
            return (
              <button
                key={option}
                type="button"
                aria-pressed={active}
                onClick={() => handleStatusChange(option)}
                className={`rounded-[8px] border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                  active
                    ? 'border-teal-600 bg-teal-600 text-white'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-teal-300 hover:bg-teal-50/60 hover:text-teal-800'
                }`}
              >
                {HISTORY_STATUS_LABELS[option]}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <label
            htmlFor="historyCareTypeFilter"
            className="text-xs font-medium text-slate-600"
          >
            Especialidad:
          </label>
          <select
            id="historyCareTypeFilter"
            value={careTypeFilter}
            onChange={(e) =>
              handleCareTypeChange(e.target.value as CareSpecialty | '')
            }
            className="rounded-[8px] border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
          >
            <option value="">Todas las especialidades</option>
            {CARE_SPECIALTY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {hasActiveFilters ? (
            <Button variant="ghost" size="sm" onClick={handleClearFilters}>
              Limpiar
            </Button>
          ) : null}
        </div>
      </section>

      {/* Content */}
      {isLoading ? (
        <CaregiverSectionSkeleton rows={3} />
      ) : loadError ? (
        <CaregiverErrorBanner message={loadError} onRetry={triggerReload} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<History className="h-6 w-6" aria-hidden />}
          title={
            hasActiveFilters
              ? 'No hay servicios que coincidan con tus filtros'
              : 'Aún no tienes servicios en tu historial'
          }
          description="Cuando una familia acepte tu postulación a una oferta de trabajo, el contrato aparecerá aquí con sus fechas y duración."
          action={
            hasActiveFilters ? (
              <Button variant="secondary" onClick={handleClearFilters}>
                Limpiar filtros
              </Button>
            ) : (
              <Link
                href="/job-offers"
                className={buttonVariants({ variant: 'primary', size: 'md' })}
              >
                Explorar ofertas abiertas
              </Link>
            )
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="cc-table-container rounded-[12px] border border-slate-200 bg-white">
            <table className="cc-responsive-table text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <th scope="col" className="px-4 py-3">
                    Servicio
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Familia / Ubicación
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Modalidad
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Fechas
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Duración
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Tarifa acordada
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => {
                  const clientName = formatFullName(
                    item.client.firstName,
                    item.client.lastName,
                    'Familia',
                  );

                  return (
                    <tr
                      key={item.contractId}
                      className="transition-colors hover:bg-slate-50/70"
                    >
                      <td
                        data-label="Servicio"
                        className="px-4 py-3.5 font-medium text-slate-900"
                      >
                        <Link
                          href={`/job-offers/${item.jobOfferId}`}
                          className="inline-flex items-center gap-1 hover:text-teal-700"
                        >
                          <span>{item.offerTitle}</span>
                          <ArrowUpRight
                            className="h-3.5 w-3.5 shrink-0 text-slate-400"
                            aria-hidden
                          />
                        </Link>
                      </td>

                      <td
                        data-label="Familia / Ubicación"
                        className="px-4 py-3.5 text-slate-700"
                      >
                        <div className="font-medium text-slate-900">
                          {clientName}
                        </div>
                        <div className="text-xs text-slate-500">
                          {item.client.city} · {item.client.zone}
                        </div>
                      </td>

                      <td
                        data-label="Modalidad"
                        className="px-4 py-3.5 text-slate-700"
                      >
                        <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                          {CARE_SPECIALTY_LABELS[item.careType]}
                        </span>
                      </td>

                      <td
                        data-label="Fechas"
                        className="px-4 py-3.5 font-mono text-xs text-slate-700 tabular-nums"
                      >
                        {formatDateRange(
                          item.timeframe.startDate,
                          item.timeframe.endDate,
                        )}
                      </td>

                      <td
                        data-label="Duración"
                        className="px-4 py-3.5 font-mono text-xs font-semibold text-slate-900 tabular-nums"
                      >
                        {item.timeframe.durationFormatted}
                      </td>

                      <td
                        data-label="Tarifa acordada"
                        className="px-4 py-3.5 font-mono text-sm font-semibold text-slate-900 tabular-nums"
                      >
                        {formatCOP(item.agreedRate)}
                      </td>

                      <td data-label="Estado" className="px-4 py-3.5">
                        <StatusBadge
                          status={item.timeframe.status}
                          domain="history"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <Pagination
            meta={meta}
            onPageChange={(nextPage) => {
              if (nextPage === page) return;
              setPage(nextPage);
              setIsLoading(true);
            }}
          />
        </div>
      )}
    </div>
  );
}
