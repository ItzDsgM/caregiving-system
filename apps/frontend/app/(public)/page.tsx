import React from 'react';
import Link from 'next/link';
import { ArrowRight, Search, ShieldCheck } from 'lucide-react';

export default function PublicHomePlaceholderPage() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="rounded-[12px] border border-slate-200 bg-white p-8 shadow-xs sm:p-12">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
          Cuidadores verificados en Colombia
        </div>
        <h1 className="mt-4 max-w-2xl text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Cuidado confiable y humano para quienes más importan.
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
          Encuentra cuidadores especializados en adulto mayor, cuidado infantil
          y asistencia especializada, con perfiles verificados y comunicación
          protegida.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href="/caregivers"
            className="inline-flex h-11 items-center gap-2 rounded-[8px] bg-teal-600 px-5 text-sm font-medium text-white transition-colors hover:bg-teal-700"
          >
            <Search className="h-4 w-4" aria-hidden />
            Explorar cuidadores
          </Link>
          <Link
            href="/job-offers"
            className="inline-flex h-11 items-center gap-2 rounded-[8px] border border-slate-200 bg-white px-5 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-50"
          >
            Ver ofertas disponibles
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
