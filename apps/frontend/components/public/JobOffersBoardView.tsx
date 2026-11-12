"use client";

import React, { useCallback, useEffect, useId, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  Clock,
  MapPin,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { jobOffersApi } from "@/lib/api";
import {
  CARE_SPECIALTY_LABELS,
  CARE_SPECIALTY_OPTIONS,
  COLOMBIAN_CITIES,
} from "@/lib/constants";
import {
  formatCOP,
  formatCOPRange,
  formatDateRange,
  formatRelativeTime,
} from "@/lib/format";
import type { CareSpecialty, JobOffer, PaginationMeta } from "@/lib/types";
import { summarizeAvailability } from "./scheduleSummary";

const PAGE_LIMIT = 10;
const VALID_CARE_TYPES = new Set<string>(
  CARE_SPECIALTY_OPTIONS.map((opt) => opt.value),
);

interface OfferFilters {
  city: string;
  careType: CareSpecialty | "";
  minBudget: string;
  maxBudget: string;
  page: number;
}

function parsePositiveBudget(raw: string | null): string {
  if (!raw) return "";
  const num = Number(raw);
  if (!Number.isFinite(num) || num <= 0) return "";
  return String(Math.round(num));
}

function parseOfferFilters(
  searchParams: ReturnType<typeof useSearchParams>,
): OfferFilters {
  const rawCareType = searchParams.get("careType") ?? "";
  const careType = VALID_CARE_TYPES.has(rawCareType)
    ? (rawCareType as CareSpecialty)
    : "";
  const rawPage = Number(searchParams.get("page"));
  const page =
    Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1;

  return {
    city: (searchParams.get("city") ?? "").trim(),
    careType,
    minBudget: parsePositiveBudget(searchParams.get("minBudget")),
    maxBudget: parsePositiveBudget(searchParams.get("maxBudget")),
    page,
  };
}

function buildOfferQuery(filters: OfferFilters): string {
  const params = new URLSearchParams();
  if (filters.city.trim()) params.set("city", filters.city.trim());
  if (filters.careType) params.set("careType", filters.careType);
  const minNum = Number(filters.minBudget);
  if (filters.minBudget && Number.isFinite(minNum) && minNum > 0) {
    params.set("minBudget", String(Math.round(minNum)));
  }
  const maxNum = Number(filters.maxBudget);
  if (filters.maxBudget && Number.isFinite(maxNum) && maxNum > 0) {
    params.set("maxBudget", String(Math.round(maxNum)));
  }
  if (filters.page > 1) params.set("page", String(filters.page));
  return params.toString();
}

interface TopFilterBarProps {
  initialFilters: OfferFilters;
  onApply: (next: OfferFilters) => void;
  onReset: () => void;
}

function JobOffersFilterBar({
  initialFilters,
  onApply,
  onReset,
}: Readonly<TopFilterBarProps>) {
  const [city, setCity] = useState(initialFilters.city);
  const [careType, setCareType] = useState<CareSpecialty | "">(
    initialFilters.careType,
  );
  const [minBudget, setMinBudget] = useState(initialFilters.minBudget);
  const [maxBudget, setMaxBudget] = useState(initialFilters.maxBudget);
  const [budgetTouched, setBudgetTouched] = useState(false);

  const cityId = useId();
  const cityListId = useId();
  const careTypeId = useId();
  const minBudgetId = useId();
  const maxBudgetId = useId();

  const budgetError = useMemo(() => {
    const minNum = minBudget ? Number(minBudget) : null;
    const maxNum = maxBudget ? Number(maxBudget) : null;
    if (minNum !== null && (!Number.isFinite(minNum) || minNum <= 0)) {
      return "El presupuesto mínimo debe ser mayor a $0.";
    }
    if (maxNum !== null && (!Number.isFinite(maxNum) || maxNum <= 0)) {
      return "El presupuesto máximo debe ser mayor a $0.";
    }
    if (minNum !== null && maxNum !== null && maxNum < minNum) {
      return "El presupuesto máximo debe ser mayor o igual al mínimo.";
    }
    return null;
  }, [minBudget, maxBudget]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBudgetTouched(true);
    if (budgetError) return;
    onApply({
      city: city.trim(),
      careType,
      minBudget: minBudget.trim(),
      maxBudget: maxBudget.trim(),
      page: 1,
    });
  };

  return (
    <search aria-label="Filtrar ofertas de cuidado">
      <form
        noValidate
        onSubmit={handleSubmit}
        className="rounded-[12px] border border-slate-200 bg-white p-4 shadow-xs sm:p-5"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-3">
            <label
              htmlFor={cityId}
              className="block text-xs font-semibold uppercase tracking-wide text-slate-600"
            >
              Ciudad
            </label>
            <input
              id={cityId}
              type="text"
              list={cityListId}
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Ej. Bogotá, Cali..."
              className="mt-1.5 h-10 w-full rounded-[8px] border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
            />
            <datalist id={cityListId}>
              {COLOMBIAN_CITIES.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          </div>

          <div className="lg:col-span-3">
            <label
              htmlFor={careTypeId}
              className="block text-xs font-semibold uppercase tracking-wide text-slate-600"
            >
              Modalidad de cuidado
            </label>
            <select
              id={careTypeId}
              value={careType}
              onChange={(e) => setCareType(e.target.value as CareSpecialty | "")}
              className="mt-1.5 h-10 w-full rounded-[8px] border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20 cursor-pointer"
            >
              <option value="">Todas las modalidades</option>
              {CARE_SPECIALTY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2">
            <label
              htmlFor={minBudgetId}
              className="block text-xs font-semibold uppercase tracking-wide text-slate-600"
            >
              Presupuesto mín.
            </label>
            <input
              id={minBudgetId}
              type="number"
              min={1}
              step={10000}
              inputMode="numeric"
              value={minBudget}
              onChange={(e) => setMinBudget(e.target.value)}
              onBlur={() => setBudgetTouched(true)}
              aria-invalid={budgetTouched && budgetError ? true : undefined}
              placeholder="500000"
              className="mt-1.5 h-10 w-full rounded-[8px] border border-slate-300 bg-white px-3 font-mono tabular-nums text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
            />
          </div>

          <div className="lg:col-span-2">
            <label
              htmlFor={maxBudgetId}
              className="block text-xs font-semibold uppercase tracking-wide text-slate-600"
            >
              Presupuesto máx.
            </label>
            <input
              id={maxBudgetId}
              type="number"
              min={1}
              step={10000}
              inputMode="numeric"
              value={maxBudget}
              onChange={(e) => setMaxBudget(e.target.value)}
              onBlur={() => setBudgetTouched(true)}
              aria-invalid={budgetTouched && budgetError ? true : undefined}
              placeholder="2500000"
              className="mt-1.5 h-10 w-full rounded-[8px] border border-slate-300 bg-white px-3 font-mono tabular-nums text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
            />
          </div>

          <div className="flex items-center gap-2 sm:col-span-2 lg:col-span-2">
            <Button
              type="submit"
              variant="primary"
              fullWidth
              leftIcon={<Search className="h-4 w-4" aria-hidden />}
            >
              Buscar
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              onClick={onReset}
              aria-label="Limpiar filtros"
              title="Limpiar filtros"
            >
              <RotateCcw className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </div>

        {budgetTouched && budgetError ? (
          <p role="alert" className="mt-2.5 text-xs font-medium text-rose-600">
            {budgetError}
          </p>
        ) : null}
      </form>
    </search>
  );
}

export function JobOffersBoardView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = useMemo(
    () => parseOfferFilters(searchParams),
    [searchParams],
  );
  const searchKey = useMemo(() => buildOfferQuery(filters), [filters]);

  const [offers, setOffers] = useState<JobOffer[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({
    totalItems: 0,
    itemCount: 0,
    itemsPerPage: PAGE_LIMIT,
    totalPages: 1,
    currentPage: filters.page,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  const navigateWithFilters = useCallback(
    (next: OfferFilters) => {
      const qs = buildOfferQuery(next);
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  const handleResetFilters = useCallback(() => {
    router.push(pathname, { scroll: false });
  }, [pathname, router]);

  useEffect(() => {
    let active = true;

    async function fetchOffers() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const res = await jobOffersApi.listPublic({
          city: filters.city || undefined,
          careType: filters.careType || undefined,
          minBudget: filters.minBudget ? Number(filters.minBudget) : undefined,
          maxBudget: filters.maxBudget ? Number(filters.maxBudget) : undefined,
          page: filters.page,
          limit: PAGE_LIMIT,
        });
        if (!active) return;
        setOffers(res.data);
        setMeta(res.meta);
      } catch (err) {
        if (!active) return;
        const msg =
          err instanceof Error
            ? err.message
            : "No pudimos cargar las ofertas de cuidado.";
        setErrorMessage(msg);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void fetchOffers();

    return () => {
      active = false;
    };
  }, [filters, reloadTick]);

  const activeChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; onRemove: () => void }> =
      [];

    if (filters.city) {
      chips.push({
        key: "city",
        label: `Ciudad: ${filters.city}`,
        onRemove: () => navigateWithFilters({ ...filters, city: "", page: 1 }),
      });
    }
    if (filters.careType) {
      chips.push({
        key: "careType",
        label: `Modalidad: ${CARE_SPECIALTY_LABELS[filters.careType]}`,
        onRemove: () =>
          navigateWithFilters({ ...filters, careType: "", page: 1 }),
      });
    }
    if (filters.minBudget || filters.maxBudget) {
      const label =
        filters.minBudget && filters.maxBudget
          ? `${formatCOP(filters.minBudget)} – ${formatCOP(filters.maxBudget)}`
          : filters.minBudget
            ? `Desde ${formatCOP(filters.minBudget)}`
            : `Hasta ${formatCOP(filters.maxBudget)}`;
      chips.push({
        key: "budget",
        label: `Presupuesto: ${label}`,
        onRemove: () =>
          navigateWithFilters({
            ...filters,
            minBudget: "",
            maxBudget: "",
            page: 1,
          }),
      });
    }

    return chips;
  }, [filters, navigateWithFilters]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      {/* Header */}
      <div className="mb-6 border-b border-slate-200 pb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">
          Bolsa Pública de Empleo
        </p>
        <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Ofertas de Cuidado Disponibles
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Requerimientos abiertos publicados por familias en Colombia. Revisa
              turnos, fechas y rango presupuestal antes de postular.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-[10px] border border-slate-200 bg-white px-3.5 py-2 shadow-xs">
            <span className="font-mono tabular-nums text-lg font-bold text-slate-900">
              {isLoading ? "—" : meta.totalItems}
            </span>
            <span className="text-xs font-medium text-slate-600">
              {meta.totalItems === 1 ? "oferta abierta" : "ofertas abiertas"}
            </span>
          </div>
        </div>
      </div>

      {/* Horizontal Filter Bar */}
      <div className="space-y-4">
        <JobOffersFilterBar
          key={searchKey}
          initialFilters={filters}
          onApply={(next) => navigateWithFilters(next)}
          onReset={handleResetFilters}
        />

        {activeChips.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-500">
              Filtros activos:
            </span>
            {activeChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={chip.onRemove}
                className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-medium text-teal-800 transition-colors hover:bg-teal-100 cursor-pointer"
              >
                <span>{chip.label}</span>
                <X className="h-3.5 w-3.5" aria-hidden />
                <span className="sr-only">Quitar filtro {chip.label}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-2 py-1 text-xs font-medium text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline cursor-pointer"
            >
              Limpiar todos
            </button>
          </div>
        ) : null}
      </div>

      {/* List Content */}
      <div className="mt-6 space-y-4">
        {errorMessage ? (
          <div
            role="alert"
            className="flex flex-col items-start justify-between gap-3 rounded-[12px] border border-rose-200 bg-rose-50 p-5 sm:flex-row sm:items-center"
          >
            <div className="flex items-start gap-3">
              <AlertCircle
                className="mt-0.5 h-5 w-5 shrink-0 text-rose-600"
                aria-hidden
              />
              <div>
                <p className="text-sm font-semibold text-rose-900">
                  No pudimos cargar las ofertas disponibles
                </p>
                <p className="mt-0.5 text-sm text-rose-700">{errorMessage}</p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setReloadTick((n) => n + 1)}
            >
              Reintentar
            </Button>
          </div>
        ) : null}

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-44 animate-pulse rounded-[12px] border border-slate-200 bg-white p-6"
              >
                <div className="h-5 w-64 rounded bg-slate-200" />
                <div className="mt-3 h-4 w-48 rounded bg-slate-100" />
                <div className="mt-4 h-12 rounded bg-slate-100" />
              </div>
            ))}
          </div>
        ) : !errorMessage && offers.length === 0 ? (
          <EmptyState
            title="No hay ofertas abiertas con esos filtros"
            description="Ajusta la ciudad, modalidad o presupuesto para descubrir más oportunidades publicadas por familias."
            action={
              <Button
                variant="primary"
                onClick={handleResetFilters}
                leftIcon={<RotateCcw className="h-4 w-4" aria-hidden />}
              >
                Limpiar filtros
              </Button>
            }
          />
        ) : (
          <>
            <div className="space-y-4">
              {offers.map((offer) => {
                const scheduleSummary = summarizeAvailability(
                  offer.requiredSchedule,
                );

                return (
                  <article
                    key={offer.id}
                    className="cc-virtual-item rounded-[12px] border border-slate-200 bg-white p-5 shadow-xs transition-all hover:border-teal-300 hover:shadow-md sm:p-6"
                  >
                    <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0 flex-1 space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge
                            status={offer.status}
                            domain="jobOffer"
                          />
                          <span className="inline-flex items-center rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-800">
                            {CARE_SPECIALTY_LABELS[offer.careType] ??
                              offer.careType}
                          </span>
                          <span className="text-xs text-slate-500">
                            Publicada {formatRelativeTime(offer.createdAt)}
                          </span>
                        </div>

                        <div>
                          <h2 className="text-lg font-bold tracking-tight text-slate-900">
                            <Link
                              href={`/job-offers/${offer.id}`}
                              className="transition-colors hover:text-teal-700"
                            >
                              {offer.title}
                            </Link>
                          </h2>
                          <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-slate-600">
                            {offer.description}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-600">
                          <span className="inline-flex items-center gap-1.5 font-medium text-slate-800">
                            <MapPin
                              className="h-3.5 w-3.5 text-teal-600"
                              aria-hidden
                            />
                            {offer.locationCity} · {offer.locationZone}
                          </span>

                          <span className="inline-flex items-center gap-1.5 font-mono tabular-nums">
                            <Calendar
                              className="h-3.5 w-3.5 text-teal-600"
                              aria-hidden
                            />
                            {formatDateRange(offer.startDate, offer.endDate)}
                          </span>

                          <span className="inline-flex items-center gap-1.5">
                            <Clock
                              className="h-3.5 w-3.5 text-teal-600"
                              aria-hidden
                            />
                            <span>{scheduleSummary.daysLabel}</span>
                            <span className="inline-flex items-center gap-1">
                              {scheduleSummary.shiftTags
                                .filter((t) => t.active)
                                .map((tag) => (
                                  <span
                                    key={tag.shift}
                                    className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-700"
                                  >
                                    {tag.label}
                                  </span>
                                ))}
                            </span>
                          </span>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-col items-start justify-between gap-3 border-t border-slate-100 pt-4 md:w-60 md:items-end md:border-t-0 md:border-l md:pt-0 md:pl-6">
                        <div className="md:text-right">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                            Presupuesto ofrecido
                          </p>
                          <p className="mt-1 font-mono tabular-nums text-base font-bold text-slate-900">
                            {formatCOPRange(offer.budgetMin, offer.budgetMax)}
                          </p>
                        </div>

                        <Link
                          href={`/job-offers/${offer.id}`}
                          className={buttonVariants({
                            variant: "primary",
                            size: "md",
                            fullWidth: true,
                          })}
                        >
                          Ver Oferta y Postular
                          <ArrowRight className="h-4 w-4" aria-hidden />
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            <Pagination
              meta={meta}
              onPageChange={(nextPage) =>
                navigateWithFilters({ ...filters, page: nextPage })
              }
            />
          </>
        )}
      </div>
    </div>
  );
}
