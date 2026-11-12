"use client";

import React, { useEffect, useState } from "react";
import { Briefcase, Lock, ShieldCheck, Users } from "lucide-react";
import { caregiversApi, jobOffersApi } from "@/lib/api";

interface LiveMetricsState {
  status: "loading" | "ready" | "offline";
  caregiversCount: number | null;
  jobOffersCount: number | null;
}

export function LandingLiveMetrics() {
  const [metrics, setMetrics] = useState<LiveMetricsState>({
    status: "loading",
    caregiversCount: null,
    jobOffersCount: null,
  });

  useEffect(() => {
    let active = true;

    async function loadMetrics() {
      const [caregiversRes, offersRes] = await Promise.allSettled([
        caregiversApi.search({ limit: 1 }),
        jobOffersApi.listPublic({ limit: 1 }),
      ]);

      if (!active) return;

      const caregiversCount =
        caregiversRes.status === "fulfilled"
          ? caregiversRes.value.meta.totalItems
          : null;
      const jobOffersCount =
        offersRes.status === "fulfilled"
          ? offersRes.value.meta.totalItems
          : null;

      setMetrics({
        status:
          caregiversCount !== null || jobOffersCount !== null
            ? "ready"
            : "offline",
        caregiversCount,
        jobOffersCount,
      });
    }

    void loadMetrics();

    return () => {
      active = false;
    };
  }, []);

  const isLoading = metrics.status === "loading";

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <div className="rounded-[12px] border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Cuidadores activos
          </span>
          <Users className="h-4 w-4 text-teal-600" aria-hidden />
        </div>
        <div className="mt-3">
          {isLoading ? (
            <div className="h-8 w-20 animate-pulse rounded bg-slate-200" />
          ) : (
            <p className="font-mono tabular-nums text-3xl font-bold tracking-tight text-slate-900">
              {metrics.caregiversCount !== null ? metrics.caregiversCount : "—"}
            </p>
          )}
          <p className="mt-1 text-xs text-slate-600">
            {metrics.caregiversCount !== null
              ? "Perfiles públicos disponibles"
              : "Catálogo en línea bajo demanda"}
          </p>
        </div>
      </div>

      <div className="rounded-[12px] border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Ofertas abiertas
          </span>
          <Briefcase className="h-4 w-4 text-teal-600" aria-hidden />
        </div>
        <div className="mt-3">
          {isLoading ? (
            <div className="h-8 w-20 animate-pulse rounded bg-slate-200" />
          ) : (
            <p className="font-mono tabular-nums text-3xl font-bold tracking-tight text-slate-900">
              {metrics.jobOffersCount !== null ? metrics.jobOffersCount : "—"}
            </p>
          )}
          <p className="mt-1 text-xs text-slate-600">
            {metrics.jobOffersCount !== null
              ? "Familias buscando apoyo hoy"
              : "Tablón actualizado en tiempo real"}
          </p>
        </div>
      </div>

      <div className="rounded-[12px] border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Filtros de identidad
          </span>
          <ShieldCheck className="h-4 w-4 text-emerald-600" aria-hidden />
        </div>
        <div className="mt-3">
          <p className="font-mono tabular-nums text-3xl font-bold tracking-tight text-slate-900">
            2/2
          </p>
          <p className="mt-1 text-xs text-slate-600">
            Cédula y antecedentes aprobados
          </p>
        </div>
      </div>

      <div className="rounded-[12px] border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Privacidad de contacto
          </span>
          <Lock className="h-4 w-4 text-teal-600" aria-hidden />
        </div>
        <div className="mt-3">
          <p className="font-mono tabular-nums text-3xl font-bold tracking-tight text-slate-900">
            100%
          </p>
          <p className="mt-1 text-xs text-slate-600">
            Teléfono oculto hasta aceptación
          </p>
        </div>
      </div>
    </div>
  );
}
