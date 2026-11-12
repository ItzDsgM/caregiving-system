"use client";

import React, { useCallback, useEffect, useId, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  Filter,
  RotateCcw,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ModalDialog } from "@/components/ui/ModalDialog";
import { Pagination } from "@/components/ui/Pagination";
import { caregiversApi } from "@/lib/api";
import {
  CARE_SPECIALTY_LABELS,
  CARE_SPECIALTY_OPTIONS,
  CAREGIVER_SORT_OPTIONS,
  COLOMBIAN_CITIES,
} from "@/lib/constants";
import { formatCOP } from "@/lib/format";
import type {
  CaregiverSortBy,
  CareSpecialty,
  PaginationMeta,
  PublicCaregiverSummary,
} from "@/lib/types";
import { CaregiverCard } from "./CaregiverCard";

const PAGE_LIMIT = 12;
const VALID_SPECIALTIES = new Set<string>(
  CARE_SPECIALTY_OPTIONS.map((opt) => opt.value),
);
const VALID_SORT_VALUES = new Set<string>(
  CAREGIVER_SORT_OPTIONS.map((opt) => opt.value),
);

interface DirectoryFilters {
  city: string;
  specialty: CareSpecialty | "";
  minPrice: string;
  maxPrice: string;
  minRating: "" | "4" | "4.5";
  onlyVerified: boolean;
  sortBy: CaregiverSortBy;
  page: number;
}

function parsePositiveParam(raw: string | null): string {
  if (!raw) return "";
  const num = Number(raw);
  if (!Number.isFinite(num) || num <= 0) return "";
  return String(Math.round(num));
}

function parseFiltersFromSearchParams(
  searchParams: ReturnType<typeof useSearchParams>,
): DirectoryFilters {
  const rawSpecialty = searchParams.get("specialty") ?? "";
  const specialty = VALID_SPECIALTIES.has(rawSpecialty)
    ? (rawSpecialty as CareSpecialty)
    : "";

  const rawRating = searchParams.get("minRating");
  const minRating: "" | "4" | "4.5" =
    rawRating === "4.5" ? "4.5" : rawRating === "4" ? "4" : "";

  const rawSort = searchParams.get("sortBy") ?? "";
  const sortBy: CaregiverSortBy = VALID_SORT_VALUES.has(rawSort)
    ? (rawSort as CaregiverSortBy)
    : "rating_desc";

  const rawPage = Number(searchParams.get("page"));
  const page =
    Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1;

  return {
    city: (searchParams.get("city") ?? "").trim(),
    specialty,
    minPrice: parsePositiveParam(searchParams.get("minPrice")),
    maxPrice: parsePositiveParam(searchParams.get("maxPrice")),
    minRating,
    onlyVerified: searchParams.get("onlyVerified") === "true",
    sortBy,
    page,
  };
}

function buildSearchParamsFromFilters(filters: DirectoryFilters): string {
  const params = new URLSearchParams();
  if (filters.city.trim()) params.set("city", filters.city.trim());
  if (filters.specialty) params.set("specialty", filters.specialty);
  const minPriceNum = Number(filters.minPrice);
  if (filters.minPrice && Number.isFinite(minPriceNum) && minPriceNum > 0) {
    params.set("minPrice", String(Math.round(minPriceNum)));
  }
  const maxPriceNum = Number(filters.maxPrice);
  if (filters.maxPrice && Number.isFinite(maxPriceNum) && maxPriceNum > 0) {
    params.set("maxPrice", String(Math.round(maxPriceNum)));
  }
  if (filters.minRating === "4" || filters.minRating === "4.5") {
    params.set("minRating", filters.minRating);
  }
  if (filters.onlyVerified) {
    params.set("onlyVerified", "true");
  }
  if (filters.sortBy && filters.sortBy !== "rating_desc") {
    params.set("sortBy", filters.sortBy);
  }
  if (filters.page > 1) {
    params.set("page", String(filters.page));
  }
  return params.toString();
}

interface FilterFormProps {
  initialFilters: DirectoryFilters;
  onApply: (next: DirectoryFilters) => void;
  onReset: () => void;
  submitLabel?: string;
}

function CaregiverFilterForm({
  initialFilters,
  onApply,
  onReset,
  submitLabel = "Aplicar filtros",
}: Readonly<FilterFormProps>) {
  const [city, setCity] = useState(initialFilters.city);
  const [specialty, setSpecialty] = useState<CareSpecialty | "">(
    initialFilters.specialty,
  );
  const [minPrice, setMinPrice] = useState(initialFilters.minPrice);
  const [maxPrice, setMaxPrice] = useState(initialFilters.maxPrice);
  const [minRating, setMinRating] = useState<"" | "4" | "4.5">(
    initialFilters.minRating,
  );
  const [onlyVerified, setOnlyVerified] = useState(initialFilters.onlyVerified);
  const [priceTouched, setPriceTouched] = useState(false);

  const cityInputId = useId();
  const cityListId = useId();
  const minPriceId = useId();
  const maxPriceId = useId();
  const maxSliderId = useId();
  const verifiedSwitchId = useId();
  const specialtyGroupName = useId();
  const ratingGroupName = useId();

  const priceValidationError = useMemo(() => {
    const minNum = minPrice ? Number(minPrice) : null;
    const maxNum = maxPrice ? Number(maxPrice) : null;
    if (minNum !== null && (!Number.isFinite(minNum) || minNum <= 0)) {
      return "La tarifa mínima debe ser mayor a $0.";
    }
    if (maxNum !== null && (!Number.isFinite(maxNum) || maxNum <= 0)) {
      return "La tarifa máxima debe ser mayor a $0.";
    }
    if (minNum !== null && maxNum !== null && maxNum < minNum) {
      return "La tarifa máxima no puede ser menor a la mínima.";
    }
    return null;
  }, [minPrice, maxPrice]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPriceTouched(true);
    if (priceValidationError) {
      return;
    }
    onApply({
      city: city.trim(),
      specialty,
      minPrice: minPrice.trim(),
      maxPrice: maxPrice.trim(),
      minRating,
      onlyVerified,
      sortBy: initialFilters.sortBy,
      page: 1,
    });
  };

  const sliderValue = useMemo(() => {
    const num = Number(maxPrice);
    if (Number.isFinite(num) && num >= 15000 && num <= 150000) {
      return num;
    }
    return 150000;
  }, [maxPrice]);

  return (
    <search aria-label="Filtros de búsqueda de cuidadores">
      <form noValidate onSubmit={handleSubmit} className="space-y-6">
        {/* Ciudad */}
        <div className="space-y-1.5">
          <label
            htmlFor={cityInputId}
            className="block text-xs font-semibold uppercase tracking-wide text-slate-700"
          >
            Ciudad
          </label>
          <input
            id={cityInputId}
            type="text"
            list={cityListId}
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Ej. Bogotá, Medellín..."
            className="h-10 w-full rounded-[8px] border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
          />
          <datalist id={cityListId}>
            {COLOMBIAN_CITIES.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </div>

        {/* Especialidad (Single selection matching SearchCaregiversDto) */}
        <fieldset className="space-y-2">
          <legend className="text-xs font-semibold uppercase tracking-wide text-slate-700">
            Especialidad
          </legend>
          <div className="space-y-1.5">
            <label className="flex cursor-pointer items-center gap-2.5 rounded-[8px] px-2 py-1.5 text-sm text-slate-700 transition-colors hover:bg-slate-50">
              <input
                type="radio"
                name={specialtyGroupName}
                value=""
                checked={specialty === ""}
                onChange={() => setSpecialty("")}
                className="h-4 w-4 cursor-pointer"
              />
              <span>Todas las especialidades</span>
            </label>
            {CARE_SPECIALTY_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex cursor-pointer items-center gap-2.5 rounded-[8px] px-2 py-1.5 text-sm text-slate-700 transition-colors hover:bg-slate-50"
              >
                <input
                  type="radio"
                  name={specialtyGroupName}
                  value={opt.value}
                  checked={specialty === opt.value}
                  onChange={() => setSpecialty(opt.value)}
                  className="h-4 w-4 cursor-pointer"
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* Tarifa por hora (COP) */}
        <fieldset className="space-y-2.5">
          <legend className="text-xs font-semibold uppercase tracking-wide text-slate-700">
            Tarifa por hora (COP)
          </legend>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label
                htmlFor={minPriceId}
                className="block text-[11px] font-medium text-slate-600"
              >
                Mínima
              </label>
              <input
                id={minPriceId}
                type="number"
                min={1}
                step={1000}
                inputMode="numeric"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                onBlur={() => setPriceTouched(true)}
                aria-invalid={
                  priceTouched && priceValidationError ? true : undefined
                }
                placeholder="15000"
                className="mt-1 h-9 w-full rounded-[8px] border border-slate-300 bg-white px-2.5 font-mono tabular-nums text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
              />
            </div>
            <div>
              <label
                htmlFor={maxPriceId}
                className="block text-[11px] font-medium text-slate-600"
              >
                Máxima
              </label>
              <input
                id={maxPriceId}
                type="number"
                min={1}
                step={1000}
                inputMode="numeric"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                onBlur={() => setPriceTouched(true)}
                aria-invalid={
                  priceTouched && priceValidationError ? true : undefined
                }
                placeholder="80000"
                className="mt-1 h-9 w-full rounded-[8px] border border-slate-300 bg-white px-2.5 font-mono tabular-nums text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <label htmlFor={maxSliderId}>Tope rápido</label>
              <span className="font-mono tabular-nums font-medium text-slate-700">
                {maxPrice ? formatCOP(maxPrice) : "Sin límite"}
              </span>
            </div>
            <input
              id={maxSliderId}
              type="range"
              min={15000}
              max={150000}
              step={5000}
              value={sliderValue}
              onChange={(e) => {
                const val = Number(e.target.value);
                setMaxPrice(val >= 150000 ? "" : String(val));
              }}
              className="w-full cursor-pointer"
            />
          </div>

          {priceTouched && priceValidationError ? (
            <p role="alert" className="text-xs font-medium text-rose-600">
              {priceValidationError}
            </p>
          ) : null}
        </fieldset>

        {/* Calificación mínima (> 0 only) */}
        <fieldset className="space-y-2">
          <legend className="text-xs font-semibold uppercase tracking-wide text-slate-700">
            Calificación mínima
          </legend>
          <div className="space-y-1.5">
            {[
              { value: "" as const, label: "Todas las calificaciones" },
              { value: "4" as const, label: "4.0+ estrellas" },
              { value: "4.5" as const, label: "4.5+ estrellas" },
            ].map((option) => (
              <label
                key={option.label}
                className="flex cursor-pointer items-center gap-2.5 rounded-[8px] px-2 py-1.5 text-sm text-slate-700 transition-colors hover:bg-slate-50"
              >
                <input
                  type="radio"
                  name={ratingGroupName}
                  value={option.value}
                  checked={minRating === option.value}
                  onChange={() => setMinRating(option.value)}
                  className="h-4 w-4 cursor-pointer"
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* Solo verificados */}
        <div className="rounded-[10px] border border-slate-200 bg-slate-50/70 p-3">
          <label
            htmlFor={verifiedSwitchId}
            className="flex cursor-pointer items-start gap-3"
          >
            <input
              id={verifiedSwitchId}
              type="checkbox"
              role="switch"
              aria-checked={onlyVerified}
              checked={onlyVerified}
              onChange={(e) => setOnlyVerified(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer"
            />
            <div>
              <span className="block text-sm font-medium text-slate-900">
                Solo verificados
              </span>
              <span className="block text-xs text-slate-600">
                Cédula y antecedentes aprobados
              </span>
            </div>
          </label>
        </div>

        <div className="flex flex-col gap-2 pt-1">
          <Button type="submit" variant="primary" fullWidth>
            {submitLabel}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            fullWidth
            onClick={onReset}
            leftIcon={<RotateCcw className="h-3.5 w-3.5" aria-hidden />}
          >
            Limpiar filtros
          </Button>
        </div>
      </form>
    </search>
  );
}

export function CaregiversDirectoryView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = useMemo(
    () => parseFiltersFromSearchParams(searchParams),
    [searchParams],
  );
  const searchKey = useMemo(
    () => buildSearchParamsFromFilters(filters),
    [filters],
  );

  const [items, setItems] = useState<PublicCaregiverSummary[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({
    totalItems: 0,
    itemCount: 0,
    itemsPerPage: PAGE_LIMIT,
    totalPages: 1,
    currentPage: filters.page,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    return () => {
      setIsMobileFilterOpen(false);
    };
  }, []);

  const sortSelectId = useId();

  const navigateWithFilters = useCallback(
    (next: DirectoryFilters) => {
      const qs = buildSearchParamsFromFilters(next);
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  const handleResetFilters = useCallback(() => {
    setIsMobileFilterOpen(false);
    router.push(pathname, { scroll: false });
  }, [pathname, router]);

  useEffect(() => {
    let active = true;

    async function fetchCaregivers() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const response = await caregiversApi.search({
          city: filters.city || undefined,
          specialty: filters.specialty || undefined,
          minPrice: filters.minPrice ? Number(filters.minPrice) : undefined,
          maxPrice: filters.maxPrice ? Number(filters.maxPrice) : undefined,
          minRating: filters.minRating ? Number(filters.minRating) : undefined,
          onlyVerified: filters.onlyVerified || undefined,
          sortBy: filters.sortBy,
          page: filters.page,
          limit: PAGE_LIMIT,
        });
        if (!active) return;
        setItems(response.data);
        setMeta(response.meta);
      } catch (err) {
        if (!active) return;
        const msg =
          err instanceof Error
            ? err.message
            : "No pudimos cargar el directorio de cuidadores.";
        setErrorMessage(msg);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void fetchCaregivers();

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
    if (filters.specialty) {
      chips.push({
        key: "specialty",
        label: `Especialidad: ${CARE_SPECIALTY_LABELS[filters.specialty]}`,
        onRemove: () =>
          navigateWithFilters({ ...filters, specialty: "", page: 1 }),
      });
    }
    if (filters.minPrice || filters.maxPrice) {
      const rangeLabel =
        filters.minPrice && filters.maxPrice
          ? `${formatCOP(filters.minPrice)} – ${formatCOP(filters.maxPrice)}`
          : filters.minPrice
            ? `Desde ${formatCOP(filters.minPrice)}`
            : `Hasta ${formatCOP(filters.maxPrice)}`;
      chips.push({
        key: "price",
        label: `Tarifa: ${rangeLabel}`,
        onRemove: () =>
          navigateWithFilters({
            ...filters,
            minPrice: "",
            maxPrice: "",
            page: 1,
          }),
      });
    }
    if (filters.minRating) {
      chips.push({
        key: "minRating",
        label: `Calificación: ${filters.minRating}+ ★`,
        onRemove: () =>
          navigateWithFilters({ ...filters, minRating: "", page: 1 }),
      });
    }
    if (filters.onlyVerified) {
      chips.push({
        key: "onlyVerified",
        label: "Solo verificados",
        onRemove: () =>
          navigateWithFilters({ ...filters, onlyVerified: false, page: 1 }),
      });
    }

    return chips;
  }, [filters, navigateWithFilters]);

  const activeFilterCount = activeChips.length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      {/* Page Title */}
      <div className="mb-6 flex flex-col gap-2 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">
            Catálogo Público CareConnect
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Directorio de Cuidadores
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Explora perfiles por ciudad, especialidad, tarifa y verificación
            documental.
          </p>
        </div>

        {/* Mobile/Tablet Quick Filter Bar */}
        <div className="flex flex-wrap items-center gap-2 lg:hidden">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsMobileFilterOpen(true)}
            leftIcon={<SlidersHorizontal className="h-4 w-4" aria-hidden />}
          >
            <span>Filtros</span>
            {activeFilterCount > 0 ? (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-teal-600 px-1.5 font-mono tabular-nums text-[11px] font-semibold text-white">
                {activeFilterCount}
              </span>
            ) : null}
          </Button>
          <button
            type="button"
            onClick={() =>
              navigateWithFilters({
                ...filters,
                onlyVerified: !filters.onlyVerified,
                page: 1,
              })
            }
            className={`inline-flex h-8 items-center rounded-full border px-3 text-xs font-medium transition-colors cursor-pointer ${
              filters.onlyVerified
                ? "border-teal-600 bg-teal-50 text-teal-800"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            Solo verificados
          </button>
          <button
            type="button"
            onClick={() =>
              navigateWithFilters({
                ...filters,
                minRating: filters.minRating === "4" ? "" : "4",
                page: 1,
              })
            }
            className={`inline-flex h-8 items-center rounded-full border px-3 text-xs font-medium transition-colors cursor-pointer ${
              filters.minRating === "4"
                ? "border-teal-600 bg-teal-50 text-teal-800"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            4+ ★
          </button>
        </div>
      </div>

      {/* Master-Filter Split Layout */}
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
        {/* Desktop Left Sticky Sidebar */}
        <aside className="hidden rounded-[12px] border border-slate-200 bg-white p-5 shadow-xs lg:sticky lg:top-20 lg:block">
          <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Filter className="h-4 w-4 text-teal-600" aria-hidden />
            <h2 className="text-sm font-semibold text-slate-900">
              Filtrar cuidadores
            </h2>
          </div>
          <CaregiverFilterForm
            key={`desktop-${searchKey}`}
            initialFilters={filters}
            onApply={(next) => navigateWithFilters(next)}
            onReset={handleResetFilters}
          />
        </aside>

        {/* Main Results Area */}
        <div className="min-w-0 space-y-5">
          {/* Results Header + Sort */}
          <div className="flex flex-col gap-3 rounded-[12px] border border-slate-200 bg-white px-4 py-3.5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono tabular-nums text-lg font-bold text-slate-900">
                {isLoading ? "—" : meta.totalItems}
              </span>
              <span className="text-sm text-slate-600">
                {meta.totalItems === 1
                  ? "cuidador encontrado"
                  : "cuidadores encontrados"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <label
                htmlFor={sortSelectId}
                className="text-xs font-medium text-slate-600 whitespace-nowrap"
              >
                Ordenar por:
              </label>
              <select
                id={sortSelectId}
                value={filters.sortBy}
                onChange={(e) =>
                  navigateWithFilters({
                    ...filters,
                    sortBy: e.target.value as CaregiverSortBy,
                    page: 1,
                  })
                }
                className="h-9 rounded-[8px] border border-slate-300 bg-white px-2.5 text-sm font-medium text-slate-800 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20 cursor-pointer"
              >
                {CAREGIVER_SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Removable Active Filter Chips */}
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

          {/* Error State */}
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
                    No pudimos consultar el directorio
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

          {/* Loading Skeletons */}
          {isLoading ? (
            <div className="cc-subgrid-grid">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-72 animate-pulse rounded-[12px] border border-slate-200 bg-white p-5"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-full bg-slate-200" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-32 rounded bg-slate-200" />
                      <div className="h-3 w-24 rounded bg-slate-100" />
                    </div>
                  </div>
                  <div className="mt-5 h-10 rounded bg-slate-100" />
                  <div className="mt-4 h-16 rounded bg-slate-100" />
                  <div className="mt-5 h-10 rounded bg-slate-200" />
                </div>
              ))}
            </div>
          ) : !errorMessage && items.length === 0 ? (
            <EmptyState
              title="No encontramos cuidadores con esos criterios"
              description="Prueba ampliando el rango de tarifa, seleccionando otra ciudad o quitando algunos filtros activos."
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
              <div className="cc-subgrid-grid">
                {items.map((caregiver) => (
                  <CaregiverCard key={caregiver.id} caregiver={caregiver} />
                ))}
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

      {/* Mobile Filter Drawer Dialog */}
      <ModalDialog
        open={isMobileFilterOpen}
        onClose={() => setIsMobileFilterOpen(false)}
        title="Filtrar cuidadores"
        description="Ajusta ciudad, especialidad, tarifa y calificación mínima."
        size="sm"
      >
        <CaregiverFilterForm
          key={`mobile-${searchKey}`}
          initialFilters={filters}
          onApply={(next) => {
            setIsMobileFilterOpen(false);
            navigateWithFilters(next);
          }}
          onReset={handleResetFilters}
          submitLabel="Ver resultados"
        />
      </ModalDialog>
    </div>
  );
}
