'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Briefcase,
  CheckCircle2,
  Clock,
  FileCheck2,
  MapPin,
  Percent,
  RefreshCw,
  TrendingUp,
  Users,
} from 'lucide-react';
import { AdminKpiCard } from '@/components/admin/AdminKpiCard';
import { ZonesBarChart } from '@/components/admin/ZonesBarChart';
import { Button, buttonVariants } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { adminApi, ApiError, reportsApi } from '@/lib/api';
import { MODALITY_REPORT_LABELS } from '@/lib/constants';
import type {
  ClientModalityReportResponse,
  ExecutiveSummaryResponse,
  PendingDocumentItem,
  TopZonesReportResponse,
} from '@/lib/types';

interface DashboardSnapshot {
  summary: ExecutiveSummaryResponse | null;
  topZones: TopZonesReportResponse | null;
  modalityReport: ClientModalityReportResponse | null;
  pendingDocs: PendingDocumentItem[];
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5 animate-pulse" aria-busy="true">
      <div className="h-16 rounded-[12px] border border-slate-200 bg-white" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-32 rounded-[12px] border border-slate-200 bg-white"
          />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="h-80 rounded-[12px] border border-slate-200 bg-white lg:col-span-7" />
        <div className="h-80 rounded-[12px] border border-slate-200 bg-white lg:col-span-5" />
      </div>
    </div>
  );
}

/**
 * F1 Executive Dashboard view aligned with Datadog/Linear/Vercel precision.
 */
export function AdminDashboardView() {
  const [data, setData] = useState<DashboardSnapshot>({
    summary: null,
    topZones: null,
    modalityReport: null,
    pendingDocs: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchSnapshot = useCallback(async () => {
    const [summaryRes, zonesRes, modalityRes, docsRes] =
      await Promise.allSettled([
        reportsApi.getSummary(),
        reportsApi.getTopZones({ limit: 8 }),
        reportsApi.getClientModality(),
        adminApi.getPendingDocuments(),
      ]);

    const allFailed =
      summaryRes.status === 'rejected' &&
      zonesRes.status === 'rejected' &&
      modalityRes.status === 'rejected' &&
      docsRes.status === 'rejected';

    if (allFailed) {
      const firstErr = summaryRes.reason;
      const msg =
        firstErr instanceof ApiError
          ? firstErr.message
          : 'No pudimos cargar las métricas ejecutivas de la plataforma.';
      throw new Error(msg);
    }

    return {
      summary: summaryRes.status === 'fulfilled' ? summaryRes.value : null,
      topZones: zonesRes.status === 'fulfilled' ? zonesRes.value : null,
      modalityReport:
        modalityRes.status === 'fulfilled' ? modalityRes.value : null,
      pendingDocs: docsRes.status === 'fulfilled' ? docsRes.value : [],
    };
  }, []);

  useEffect(() => {
    let active = true;

    fetchSnapshot()
      .then((snapshot) => {
        if (!active) return;
        setData(snapshot);
        setErrorMessage(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setErrorMessage(
          err instanceof Error
            ? err.message
            : 'No pudimos cargar el panel ejecutivo.',
        );
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [fetchSnapshot]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setErrorMessage(null);
    try {
      const snapshot = await fetchSnapshot();
      setData(snapshot);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'No pudimos actualizar los indicadores.',
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (errorMessage && !data.summary && !data.modalityReport && !data.topZones) {
    return (
      <EmptyState
        icon={<AlertTriangle className="h-6 w-6 text-rose-600" aria-hidden />}
        title="No pudimos cargar el panel ejecutivo"
        description={errorMessage}
        action={
          <Button onClick={handleRefresh} loading={isRefreshing}>
            Reintentar carga
          </Button>
        }
      />
    );
  }

  const { summary, topZones, modalityReport, pendingDocs } = data;

  const totalOffers =
    summary?.totalJobOffers ?? modalityReport?.totalOffers ?? 0;
  const totalHired =
    summary?.totalHiredServices ?? modalityReport?.totalAcceptedServices ?? 0;

  // Compute global fulfillment rate cleanly from modality categories
  const categoryTotals = (modalityReport?.categories ?? []).reduce(
    (acc, cat) => ({
      offers: acc.offers + cat.totalOffers,
      accepted: acc.accepted + cat.acceptedOffers,
    }),
    { offers: 0, accepted: 0 },
  );

  const denominator =
    categoryTotals.offers > 0 ? categoryTotals.offers : totalOffers;
  const numerator =
    categoryTotals.offers > 0 ? categoryTotals.accepted : totalHired;
  const globalFulfillmentRate =
    denominator > 0 ? (numerator / denominator) * 100 : 0;

  const highlightedZone =
    summary?.topServedZone ?? topZones?.mostServedZone ?? null;
  const matchingZoneStats = highlightedZone
    ? (topZones?.zones ?? []).find(
        (z) =>
          z.city === highlightedZone.city && z.zone === highlightedZone.zone,
      )
    : undefined;

  const predominantRaw = summary?.predominantModality ?? null;
  const predominantLabel = predominantRaw
    ? (MODALITY_REPORT_LABELS[predominantRaw] ?? predominantRaw)
    : 'Sin ofertas registradas';

  const chartZones = topZones?.zones ?? summary?.topFiveZones ?? [];

  return (
    <div className="space-y-5">
      {/* Operational Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Panel Ejecutivo de Operaciones
          </h1>
          <p className="mt-0.5 text-sm text-slate-600">
            Monitoreo de demanda, cobertura territorial y moderación documental
            en tiempo real.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleRefresh}
            loading={isRefreshing}
            leftIcon={<RefreshCw className="h-3.5 w-3.5" aria-hidden />}
          >
            Actualizar
          </Button>
          <Link
            href="/admin/reports"
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            <BarChart3 className="h-3.5 w-3.5" aria-hidden />
            Reportes detallados
          </Link>
        </div>
      </div>

      {/* Level 1: Alert Banner for pending documents */}
      {pendingDocs.length > 0 ? (
        <section
          aria-label="Alerta de verificación documental"
          className="flex flex-col gap-3 rounded-[12px] border border-amber-300 bg-amber-50/90 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
              <AlertTriangle className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-semibold text-amber-950">
                Cola documental pendiente de dictamen:{' '}
                <span className="font-mono font-bold tabular-nums">
                  {pendingDocs.length}
                </span>{' '}
                {pendingDocs.length === 1 ? 'documento' : 'documentos'}
              </p>
              <p className="text-xs text-amber-800">
                La aprobación de Cédula y Antecedentes activa automáticamente la
                insignia de confianza del cuidador.
              </p>
            </div>
          </div>

          <Link
            href="/admin/documents"
            className={buttonVariants({
              variant: 'primary',
              size: 'sm',
              className: 'shrink-0 bg-amber-600 hover:bg-amber-700',
            })}
          >
            Revisar Cola Documental
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </section>
      ) : null}

      {/* Level 2: 4 KPI Cards */}
      <section
        aria-label="Indicadores clave de plataforma"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <AdminKpiCard
          label="Servicios Contratados"
          value={totalHired}
          subtitle="Postulaciones aceptadas en plataforma"
          tone="emerald"
          icon={<CheckCircle2 className="h-4 w-4" aria-hidden />}
          href="/admin/reports"
          actionLabel="Ver desglose"
        />
        <AdminKpiCard
          label="Ofertas Publicadas"
          value={totalOffers}
          subtitle={`Modalidad líder: ${predominantLabel}`}
          tone="teal"
          icon={<Briefcase className="h-4 w-4" aria-hidden />}
          href="/admin/reports"
          actionLabel="Explorar demanda"
        />
        <AdminKpiCard
          label="Tasa de Cumplimiento"
          value={`${globalFulfillmentRate.toFixed(1)}%`}
          subtitle={`${numerator} cubiertas de ${denominator} ofertas`}
          tone="slate"
          icon={<Percent className="h-4 w-4" aria-hidden />}
          href="/admin/reports"
          actionLabel="Analizar modalidades"
        />
        <AdminKpiCard
          label="Documentos Pendientes"
          value={pendingDocs.length}
          subtitle={
            pendingDocs.length > 0
              ? 'Requieren revisión de auditor'
              : 'Cola documental al día'
          }
          tone={pendingDocs.length > 0 ? 'amber' : 'emerald'}
          icon={
            pendingDocs.length > 0 ? (
              <Clock className="h-4 w-4" aria-hidden />
            ) : (
              <FileCheck2 className="h-4 w-4" aria-hidden />
            )
          }
          href="/admin/documents"
          actionLabel="Ir a moderación"
        />
      </section>

      {/* Level 3: Analytics 7/5 Grid */}
      <section
        aria-label="Analítica territorial y accesos rápidos"
        className="grid grid-cols-1 gap-5 lg:grid-cols-12"
      >
        {/* Left 7 cols: Top Zones Bar Chart */}
        <div className="flex flex-col justify-between rounded-[12px] border border-slate-200 bg-white p-5 shadow-2xs lg:col-span-7">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Zonas de Mayor Demanda y Cobertura
                </h2>
                <p className="text-xs text-slate-500">
                  Comparativo entre ofertas publicadas y servicios contratados
                  (Top {Math.max(chartZones.length, 8)} zonas)
                </p>
              </div>
              <Link
                href="/admin/reports"
                className="text-xs font-medium text-teal-700 hover:underline"
              >
                Ver tabla completa
              </Link>
            </div>

            <div className="mt-4">
              <ZonesBarChart zones={chartZones} />
            </div>
          </div>
        </div>

        {/* Right 5 cols: Top Served Zone + Predominant Modality + Quick Links */}
        <div className="flex flex-col gap-4 lg:col-span-5">
          {/* Highlighted Top Served Zone */}
          <div className="rounded-[12px] border border-teal-200 bg-gradient-to-br from-white to-teal-50/60 p-5 shadow-2xs">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="inline-flex items-center gap-1 rounded-full border border-teal-200 bg-white px-2.5 py-0.5 text-[11px] font-semibold text-teal-700">
                  <MapPin className="h-3 w-3" aria-hidden />
                  Zona mejor atendida
                </span>
                <h2 className="mt-2.5 text-lg font-bold tracking-tight text-slate-900">
                  {highlightedZone
                    ? `${highlightedZone.zone}, ${highlightedZone.city}`
                    : 'Sin zona destacada'}
                </h2>
              </div>
              <div className="text-right">
                <span className="block font-mono text-2xl font-semibold text-teal-700 tabular-nums">
                  {highlightedZone?.completedServices ?? 0}
                </span>
                <span className="text-[11px] font-medium text-slate-500">
                  servicios
                </span>
              </div>
            </div>

            {matchingZoneStats ? (
              <div className="mt-3 grid grid-cols-3 gap-2 border-t border-teal-200/60 pt-3 text-xs">
                <div>
                  <span className="block text-[11px] text-slate-500">Ofertas</span>
                  <span className="font-mono font-semibold text-slate-900 tabular-nums">
                    {matchingZoneStats.totalOffers}
                  </span>
                </div>
                <div>
                  <span className="block text-[11px] text-slate-500">
                    Cumplimiento
                  </span>
                  <span className="font-mono font-semibold text-teal-700 tabular-nums">
                    {matchingZoneStats.fulfillmentRate.toFixed(1)}%
                  </span>
                </div>
                <div>
                  <span className="block text-[11px] text-slate-500">
                    Cuota total
                  </span>
                  <span className="font-mono font-semibold text-slate-900 tabular-nums">
                    {matchingZoneStats.percentageOfTotalServed.toFixed(1)}%
                  </span>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-xs text-slate-600">
                Se actualiza automáticamente conforme se aceptan postulaciones en
                ofertas activas.
              </p>
            )}
          </div>

          {/* Predominant Modality Card */}
          <div className="rounded-[12px] border border-slate-200 bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-teal-600" aria-hidden />
                <h2 className="text-sm font-semibold text-slate-900">
                  Modalidad Predominante
                </h2>
              </div>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-semibold text-slate-800">
                {predominantLabel}
              </span>
            </div>

            <div className="mt-3.5 space-y-2.5">
              {(summary?.modalityBreakdown ?? []).map((item) => {
                const label =
                  MODALITY_REPORT_LABELS[item.category] ?? item.category;
                return (
                  <div key={item.category} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700">{label}</span>
                      <span className="font-mono text-slate-900 tabular-nums">
                        {item.totalOffers} ({item.sharePercentage.toFixed(1)}%)
                      </span>
                    </div>
                    <progress
                      value={item.sharePercentage}
                      max={100}
                      className="h-1.5 w-full overflow-hidden rounded-full"
                    />
                  </div>
                );
              })}
              {(!summary?.modalityBreakdown ||
                summary.modalityBreakdown.length === 0) && (
                <p className="text-xs text-slate-500">
                  Sin datos de modalidades disponibles todavía.
                </p>
              )}
            </div>
          </div>

          {/* Quick Operational Shortcuts */}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <Link
              href="/admin/users"
              className="group flex items-center justify-between rounded-[12px] border border-slate-200 bg-white px-4 py-3 transition-colors hover:border-teal-300 hover:bg-teal-50/40"
            >
              <div className="flex items-center gap-2.5">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] bg-slate-100 text-slate-700 group-hover:bg-teal-100 group-hover:text-teal-700">
                  <Users className="h-4 w-4" aria-hidden />
                </span>
                <div>
                  <p className="text-xs font-semibold text-slate-900">
                    Usuarios y Roles
                  </p>
                  <p className="text-[11px] text-slate-500">
                    RBAC y suspensiones
                  </p>
                </div>
              </div>
              <ArrowRight
                className="h-4 w-4 text-slate-400 group-hover:text-teal-700"
                aria-hidden
              />
            </Link>

            <Link
              href="/admin/reports"
              className="group flex items-center justify-between rounded-[12px] border border-slate-200 bg-white px-4 py-3 transition-colors hover:border-teal-300 hover:bg-teal-50/40"
            >
              <div className="flex items-center gap-2.5">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] bg-slate-100 text-slate-700 group-hover:bg-teal-100 group-hover:text-teal-700">
                  <BarChart3 className="h-4 w-4" aria-hidden />
                </span>
                <div>
                  <p className="text-xs font-semibold text-slate-900">
                    Reportes CSV
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Modalidades y zonas
                  </p>
                </div>
              </div>
              <ArrowRight
                className="h-4 w-4 text-slate-400 group-hover:text-teal-700"
                aria-hidden
              />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
