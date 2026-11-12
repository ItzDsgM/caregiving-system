'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  Download,
  Filter,
  MapPin,
  RotateCcw,
} from 'lucide-react';
import {
  MarketShareDonutChart,
  ModalityComparisonChart,
} from '@/components/admin/ModalityCharts';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/ToastRegion';
import { ApiError, reportsApi } from '@/lib/api';
import {
  CARE_SPECIALTY_LABELS,
  COLOMBIAN_CITIES,
  MODALITY_REPORT_LABELS,
} from '@/lib/constants';
import { downloadCsv, formatCOPRange } from '@/lib/format';
import type {
  ClientModalityReportResponse,
  FilterModalityReportParams,
  FilterZoneReportParams,
  ModalityCategoryReport,
  TopZonesReportResponse,
} from '@/lib/types';

function getCategoryDisplayName(cat: ModalityCategoryReport): string {
  return (
    MODALITY_REPORT_LABELS[cat.category] ??
    MODALITY_REPORT_LABELS[cat.label] ??
    cat.label
  );
}

function ReportsSkeleton() {
  return (
    <div className="space-y-5 animate-pulse" aria-busy="true">
      <div className="h-20 rounded-[12px] border border-slate-200 bg-white" />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="h-72 rounded-[12px] border border-slate-200 bg-white lg:col-span-6" />
        <div className="h-72 rounded-[12px] border border-slate-200 bg-white lg:col-span-6" />
      </div>
      <div className="h-64 rounded-[12px] border border-slate-200 bg-white" />
    </div>
  );
}

/**
 * F4 Care Modalities & Top Zones Analytical Report (Datadog / Vercel Analytics).
 */
export function AdminReportsView() {
  const toast = useToast();

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [city, setCity] = useState('');
  const [filterError, setFilterError] = useState<string | null>(null);

  const [modalityReport, setModalityReport] =
    useState<ClientModalityReportResponse | null>(null);
  const [topZonesReport, setTopZonesReport] =
    useState<TopZonesReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFiltering, setIsFiltering] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchReports = useCallback(
    async (filters: { startDate: string; endDate: string; city: string }) => {
      const startIso = filters.startDate
        ? `${filters.startDate}T00:00:00.000Z`
        : undefined;
      const endIso = filters.endDate
        ? `${filters.endDate}T23:59:59.999Z`
        : undefined;
      const trimmedCity = filters.city.trim() || undefined;

      const modalityParams: FilterModalityReportParams = {
        ...(startIso ? { startDate: startIso } : {}),
        ...(endIso ? { endDate: endIso } : {}),
        ...(trimmedCity ? { city: trimmedCity } : {}),
      };

      const zoneParams: FilterZoneReportParams = {
        ...(startIso ? { startDate: startIso } : {}),
        ...(endIso ? { endDate: endIso } : {}),
        ...(trimmedCity ? { city: trimmedCity } : {}),
        limit: 15,
      };

      const [modalityRes, zonesRes] = await Promise.all([
        reportsApi.getClientModality(modalityParams),
        reportsApi.getTopZones(zoneParams),
      ]);

      return { modalityRes, zonesRes };
    },
    [],
  );

  useEffect(() => {
    let active = true;

    fetchReports({ startDate: '', endDate: '', city: '' })
      .then(({ modalityRes, zonesRes }) => {
        if (!active) return;
        setModalityReport(modalityRes);
        setTopZonesReport(zonesRes);
        setLoadError(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        const msg =
          err instanceof ApiError
            ? err.message
            : 'No pudimos cargar los reportes de modalidades y zonas.';
        setLoadError(msg);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [fetchReports]);

  const applyFilters = async (next: {
    startDate: string;
    endDate: string;
    city: string;
  }) => {
    if (next.startDate && next.endDate && next.startDate > next.endDate) {
      setFilterError(
        'La fecha inicial no puede ser posterior a la fecha final.',
      );
      return;
    }

    setFilterError(null);
    setIsFiltering(true);
    setLoadError(null);

    try {
      const { modalityRes, zonesRes } = await fetchReports(next);
      setModalityReport(modalityRes);
      setTopZonesReport(zonesRes);
    } catch (err: unknown) {
      toast.apiError(err, 'No pudimos aplicar los filtros al reporte.');
    } finally {
      setIsFiltering(false);
    }
  };

  const handleFilterSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void applyFilters({ startDate, endDate, city });
  };

  const handleResetFilters = () => {
    setStartDate('');
    setEndDate('');
    setCity('');
    setFilterError(null);
    void applyFilters({ startDate: '', endDate: '', city: '' });
  };

  const handleExportModalityCsv = () => {
    if (!modalityReport) return;

    const headers = [
      'Tipo Registro',
      'Categoría / Modalidad',
      'Total Ofertas',
      'Ofertas Cubiertas',
      'Tasa de Cumplimiento (%)',
      'Presupuesto Promedio Min (COP)',
      'Presupuesto Promedio Max (COP)',
      'Participación de Mercado (%)',
      'Cuidadores Calificados',
      'Ciudad Filtro',
      'Fecha Inicio',
      'Fecha Fin',
    ];

    const cityLabel = city.trim() || 'Todas';
    const startLabel = startDate || 'Histórico';
    const endLabel = endDate || 'Actual';

    const rows: Array<Array<string | number>> = [];

    for (const cat of modalityReport.categories) {
      rows.push([
        'Modalidad',
        getCategoryDisplayName(cat),
        cat.totalOffers,
        cat.acceptedOffers,
        cat.fulfillmentRate.toFixed(2),
        cat.averageBudgetMin,
        cat.averageBudgetMax,
        cat.marketSharePercentage.toFixed(2),
        cat.availableCaregiversCount,
        cityLabel,
        startLabel,
        endLabel,
      ]);

      if (cat.subcategories?.length) {
        for (const sub of cat.subcategories) {
          const subRate =
            sub.totalOffers > 0
              ? ((sub.acceptedOffers / sub.totalOffers) * 100).toFixed(2)
              : '0.00';
          rows.push([
            'Subcategoría',
            CARE_SPECIALTY_LABELS[sub.careType] ?? sub.careType,
            sub.totalOffers,
            sub.acceptedOffers,
            subRate,
            '',
            '',
            '',
            '',
            cityLabel,
            startLabel,
            endLabel,
          ]);
        }
      }
    }

    const totalOffers = modalityReport.totalOffers;
    const totalAccepted = modalityReport.totalAcceptedServices;
    const globalRate =
      totalOffers > 0 ? ((totalAccepted / totalOffers) * 100).toFixed(2) : '0.00';

    rows.push([
      'Resumen Global',
      'Total Plataforma',
      totalOffers,
      totalAccepted,
      globalRate,
      '',
      '',
      '100.00',
      modalityReport.categories.reduce(
        (sum, c) => sum + c.availableCaregiversCount,
        0,
      ),
      cityLabel,
      startLabel,
      endLabel,
    ]);

    downloadCsv('careconnect-reporte-modalidades.csv', headers, rows);
    toast.success(
      'CSV exportado',
      'Se descargó el reporte de modalidades y resumen global.',
    );
  };

  const handleExportZonesCsv = () => {
    if (!topZonesReport) return;

    const headers = [
      'Ranking',
      'Ciudad',
      'Zona',
      'Total Ofertas',
      'Servicios Completados',
      'Tasa de Cumplimiento (%)',
      'Cuota Territorial (%)',
    ];

    const rows = topZonesReport.zones.map((z) => [
      z.rank,
      z.city,
      z.zone,
      z.totalOffers,
      z.completedServices,
      z.fulfillmentRate.toFixed(2),
      z.percentageOfTotalServed.toFixed(2),
    ]);

    downloadCsv('careconnect-top-zonas.csv', headers, rows);
    toast.success('CSV exportado', 'Se descargó el ranking de zonas.');
  };

  if (isLoading) {
    return <ReportsSkeleton />;
  }

  if (loadError && !modalityReport && !topZonesReport) {
    return (
      <EmptyState
        icon={<AlertCircle className="h-6 w-6 text-rose-600" aria-hidden />}
        title="No pudimos cargar los reportes"
        description={loadError}
        action={
          <Button onClick={handleResetFilters} loading={isFiltering}>
            Reintentar
          </Button>
        }
      />
    );
  }

  const categories = modalityReport?.categories ?? [];
  const totalOffers = modalityReport?.totalOffers ?? 0;
  const totalAccepted = modalityReport?.totalAcceptedServices ?? 0;
  const globalFulfillment =
    totalOffers > 0 ? (totalAccepted / totalOffers) * 100 : 0;

  const zones = topZonesReport?.zones ?? [];
  const mostServedZone = topZonesReport?.mostServedZone ?? null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          Reportes de Modalidades y Cobertura
        </h1>
        <p className="mt-0.5 text-sm text-slate-600">
          Analítica detallada de oferta, demanda cubierta, presupuestos
          promedio y zonas mejor atendidas.
        </p>
      </div>

      {/* Global Sticky Filter & Export Toolbar */}
      <form
        onSubmit={handleFilterSubmit}
        aria-label="Filtros globales del reporte"
        className="sticky top-16 z-20 rounded-[12px] border border-slate-200 bg-white/95 p-3.5 shadow-xs backdrop-blur-sm"
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12 md:items-end">
          <div className="md:col-span-3">
            <label
              htmlFor="report-start-date"
              className="block text-[11px] font-semibold uppercase tracking-wide text-slate-600"
            >
              Desde
            </label>
            <input
              id="report-start-date"
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                if (filterError) setFilterError(null);
              }}
              className="mt-1 h-9 w-full rounded-[8px] border border-slate-300 bg-white px-2.5 font-mono text-xs text-slate-900 focus:border-teal-600 focus:outline-none"
            />
          </div>

          <div className="md:col-span-3">
            <label
              htmlFor="report-end-date"
              className="block text-[11px] font-semibold uppercase tracking-wide text-slate-600"
            >
              Hasta
            </label>
            <input
              id="report-end-date"
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                if (filterError) setFilterError(null);
              }}
              className="mt-1 h-9 w-full rounded-[8px] border border-slate-300 bg-white px-2.5 font-mono text-xs text-slate-900 focus:border-teal-600 focus:outline-none"
            />
          </div>

          <div className="md:col-span-3">
            <label
              htmlFor="report-city"
              className="block text-[11px] font-semibold uppercase tracking-wide text-slate-600"
            >
              Ciudad
            </label>
            <input
              id="report-city"
              type="text"
              list="cc-report-cities"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Todas las ciudades"
              className="mt-1 h-9 w-full rounded-[8px] border border-slate-300 bg-white px-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none"
            />
            <datalist id="cc-report-cities">
              {COLOMBIAN_CITIES.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 md:col-span-3">
            <Button
              type="submit"
              variant="secondary"
              size="sm"
              loading={isFiltering}
              leftIcon={<Filter className="h-3.5 w-3.5" aria-hidden />}
            >
              Filtrar
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              disabled={isFiltering}
              leftIcon={<RotateCcw className="h-3.5 w-3.5" aria-hidden />}
            >
              Limpiar
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleExportModalityCsv}
              disabled={!modalityReport}
              leftIcon={<Download className="h-3.5 w-3.5" aria-hidden />}
            >
              Exportar CSV
            </Button>
          </div>
        </div>

        {filterError ? (
          <p className="mt-2 text-xs font-medium text-rose-600">{filterError}</p>
        ) : null}
      </form>

      {/* Summary Strip */}
      <section
        aria-label="Resumen del período filtrado"
        className="grid grid-cols-2 gap-3 lg:grid-cols-4"
      >
        <div className="rounded-[12px] border border-slate-200 bg-white px-4 py-3 shadow-2xs">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Total Ofertas
          </span>
          <p className="mt-1 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {totalOffers}
          </p>
        </div>

        <div className="rounded-[12px] border border-slate-200 bg-white px-4 py-3 shadow-2xs">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Ofertas Cubiertas
          </span>
          <p className="mt-1 font-mono text-2xl font-semibold text-teal-700 tabular-nums">
            {totalAccepted}
          </p>
        </div>

        <div className="rounded-[12px] border border-slate-200 bg-white px-4 py-3 shadow-2xs">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Cumplimiento Global
          </span>
          <p className="mt-1 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {globalFulfillment.toFixed(1)}%
          </p>
        </div>

        <div className="rounded-[12px] border border-slate-200 bg-white px-4 py-3 shadow-2xs">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Zona Líder
          </span>
          <p className="mt-1 truncate text-sm font-semibold text-slate-900">
            {mostServedZone
              ? `${mostServedZone.zone}, ${mostServedZone.city}`
              : 'Sin registros'}
          </p>
          <p className="font-mono text-xs text-teal-700 tabular-nums">
            {mostServedZone?.completedServices ?? 0} servicios
          </p>
        </div>
      </section>

      {/* Charts Row (6/6) */}
      <section
        aria-label="Gráficos comparativos por modalidad"
        className="grid grid-cols-1 gap-5 lg:grid-cols-12"
      >
        <div className="rounded-[12px] border border-slate-200 bg-white p-5 shadow-2xs lg:col-span-6">
          <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Oferta vs. Demanda Cubierta por Modalidad
              </h2>
              <p className="text-xs text-slate-500">
                Total de ofertas publicadas frente a postulaciones aceptadas
              </p>
            </div>
            <BarChart3 className="h-4 w-4 text-teal-600" aria-hidden />
          </div>

          <ModalityComparisonChart categories={categories} />
        </div>

        <div className="rounded-[12px] border border-slate-200 bg-white p-5 shadow-2xs lg:col-span-6">
          <div className="mb-3 border-b border-slate-100 pb-2.5">
            <h2 className="text-sm font-semibold text-slate-900">
              Participación de Mercado (Market Share)
            </h2>
            <p className="text-xs text-slate-500">
              Distribución porcentual del volumen de ofertas por categoría
            </p>
          </div>

          <MarketShareDonutChart
            categories={categories}
            totalOffers={totalOffers}
            totalAcceptedServices={totalAccepted}
          />
        </div>
      </section>

      {/* Modality Breakdown Table */}
      <section
        aria-label="Tabla analítica por modalidad"
        className="rounded-[12px] border border-slate-200 bg-white shadow-2xs"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-5 py-3.5">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Desglose Analítico por Modalidad de Cuidado
            </h2>
            <p className="text-xs text-slate-500">
              Incluye subcategorías de discapacidad cognitiva y física,
              cumplimiento y oferta de cuidadores.
            </p>
          </div>
          <span className="font-mono text-xs text-slate-500 tabular-nums">
            {categories.length} modalidades
          </span>
        </div>

        <div className="cc-table-container">
          <table className="cc-responsive-table text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <th scope="col" className="px-4 py-3">
                  Modalidad
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Total Ofertas
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Ofertas Cubiertas
                </th>
                <th scope="col" className="px-4 py-3">
                  Cumplimiento
                </th>
                <th scope="col" className="px-4 py-3">
                  Presupuesto Promedio
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Participación
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Cuidadores
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {categories.map((cat) => {
                const label = getCategoryDisplayName(cat);
                const hasBudget =
                  cat.totalOffers > 0 ||
                  cat.averageBudgetMin > 0 ||
                  cat.averageBudgetMax > 0;

                return (
                  <tr
                    key={cat.category}
                    className="transition-colors hover:bg-slate-50/70"
                  >
                    <td data-label="Modalidad" className="px-4 py-3">
                      <div>
                        <p className="font-semibold text-slate-900">{label}</p>
                        <p className="font-mono text-[11px] text-slate-400">
                          {cat.category}
                        </p>
                        {cat.subcategories && cat.subcategories.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {cat.subcategories.map((sub) => (
                              <span
                                key={sub.careType}
                                className="inline-flex items-center gap-1.5 rounded-[6px] border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-700"
                              >
                                <span className="font-medium">
                                  {CARE_SPECIALTY_LABELS[sub.careType] ??
                                    sub.careType}
                                  :
                                </span>
                                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                                  {sub.acceptedOffers}/{sub.totalOffers}
                                </span>
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </td>

                    <td
                      data-label="Total Ofertas"
                      className="px-4 py-3 text-right font-mono font-semibold text-slate-900 tabular-nums"
                    >
                      {cat.totalOffers}
                    </td>

                    <td
                      data-label="Ofertas Cubiertas"
                      className="px-4 py-3 text-right font-mono font-semibold text-teal-700 tabular-nums"
                    >
                      {cat.acceptedOffers}
                    </td>

                    <td data-label="Cumplimiento" className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2.5 md:justify-start">
                        <progress
                          value={cat.fulfillmentRate}
                          max={100}
                          aria-label={`Cumplimiento de ${label}`}
                          className="h-2 w-24 overflow-hidden rounded-full"
                        />
                        <span className="w-12 text-right font-mono font-semibold text-slate-900 tabular-nums">
                          {cat.fulfillmentRate.toFixed(1)}%
                        </span>
                      </div>
                    </td>

                    <td
                      data-label="Presupuesto Promedio"
                      className="px-4 py-3 font-mono text-slate-700 tabular-nums"
                    >
                      {hasBudget
                        ? formatCOPRange(
                            cat.averageBudgetMin,
                            cat.averageBudgetMax,
                          )
                        : 'Sin ofertas'}
                    </td>

                    <td
                      data-label="Participación"
                      className="px-4 py-3 text-right font-mono font-semibold text-slate-900 tabular-nums"
                    >
                      {cat.marketSharePercentage.toFixed(1)}%
                    </td>

                    <td
                      data-label="Cuidadores"
                      className="px-4 py-3 text-right font-mono font-semibold text-slate-900 tabular-nums"
                    >
                      {cat.availableCaregiversCount}
                    </td>
                  </tr>
                );
              })}
            </tbody>

            <tfoot className="border-t-2 border-slate-200 bg-slate-50/80 font-semibold text-slate-900">
              <tr>
                <td data-label="Total" className="px-4 py-2.5 text-xs">
                  Total Plataforma
                </td>
                <td
                  data-label="Total Ofertas"
                  className="px-4 py-2.5 text-right font-mono tabular-nums"
                >
                  {totalOffers}
                </td>
                <td
                  data-label="Ofertas Cubiertas"
                  className="px-4 py-2.5 text-right font-mono text-teal-700 tabular-nums"
                >
                  {totalAccepted}
                </td>
                <td
                  data-label="Cumplimiento"
                  className="px-4 py-2.5 font-mono tabular-nums"
                >
                  {globalFulfillment.toFixed(1)}%
                </td>
                <td data-label="Presupuesto" className="px-4 py-2.5 text-slate-400">
                  —
                </td>
                <td
                  data-label="Participación"
                  className="px-4 py-2.5 text-right font-mono tabular-nums"
                >
                  {totalOffers > 0 ? '100.0%' : '0.0%'}
                </td>
                <td
                  data-label="Cuidadores"
                  className="px-4 py-2.5 text-right font-mono tabular-nums"
                >
                  {categories.reduce(
                    (sum, c) => sum + c.availableCaregiversCount,
                    0,
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* Top Zones Summary Table */}
      <section
        aria-label="Resumen de zonas con mayor demanda"
        className="rounded-[12px] border border-slate-200 bg-white shadow-2xs"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-3.5">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Ranking de Zonas Mejor Atendidas
            </h2>
            <p className="text-xs text-slate-500">
              Servicios completados totales en filtros:{' '}
              <span className="font-mono font-semibold text-slate-800 tabular-nums">
                {topZonesReport?.totalCompletedServices ?? 0}
              </span>
              {mostServedZone ? (
                <>
                  {' · '}
                  <span className="inline-flex items-center gap-1 font-medium text-teal-700">
                    <MapPin className="h-3 w-3" aria-hidden />
                    Top: {mostServedZone.zone} ({mostServedZone.city})
                  </span>
                </>
              ) : null}
            </p>
          </div>

          {zones.length > 0 ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleExportZonesCsv}
              leftIcon={<Download className="h-3.5 w-3.5" aria-hidden />}
            >
              Exportar Zonas CSV
            </Button>
          ) : null}
        </div>

        {zones.length === 0 ? (
          <div className="p-6">
            <EmptyState
              compact
              icon={<MapPin className="h-5 w-5" aria-hidden />}
              title="Sin zonas registradas para este filtro"
              description="No existen ofertas o contrataciones en las fechas o ciudad seleccionadas."
            />
          </div>
        ) : (
          <div className="cc-table-container">
            <table className="cc-responsive-table text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <th scope="col" className="px-4 py-3">
                    #
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Ciudad y Zona
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Total Ofertas
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Servicios Completados
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Cumplimiento
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Cuota Territorial
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {zones.map((zone) => (
                  <tr
                    key={`${zone.city}-${zone.zone}-${zone.rank}`}
                    className="transition-colors hover:bg-slate-50/70"
                  >
                    <td
                      data-label="#"
                      className="px-4 py-2.5 font-mono font-semibold text-slate-500 tabular-nums"
                    >
                      #{zone.rank}
                    </td>
                    <td data-label="Ciudad y Zona" className="px-4 py-2.5">
                      <span className="font-semibold text-slate-900">
                        {zone.zone}
                      </span>
                      <span className="ml-1.5 text-slate-500">
                        · {zone.city}
                      </span>
                    </td>
                    <td
                      data-label="Total Ofertas"
                      className="px-4 py-2.5 text-right font-mono font-semibold text-slate-900 tabular-nums"
                    >
                      {zone.totalOffers}
                    </td>
                    <td
                      data-label="Servicios Completados"
                      className="px-4 py-2.5 text-right font-mono font-semibold text-teal-700 tabular-nums"
                    >
                      {zone.completedServices}
                    </td>
                    <td data-label="Cumplimiento" className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-2.5 md:justify-start">
                        <progress
                          value={zone.fulfillmentRate}
                          max={100}
                          aria-label={`Cumplimiento en ${zone.zone}`}
                          className="h-2 w-20 overflow-hidden rounded-full"
                        />
                        <span className="w-12 text-right font-mono font-semibold text-slate-900 tabular-nums">
                          {zone.fulfillmentRate.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td
                      data-label="Cuota Territorial"
                      className="px-4 py-2.5 text-right font-mono text-slate-700 tabular-nums"
                    >
                      {zone.percentageOfTotalServed.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
