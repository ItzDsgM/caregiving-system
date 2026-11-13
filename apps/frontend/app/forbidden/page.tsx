import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Home, ShieldAlert } from 'lucide-react';
import { AuthFormSkeleton } from '@/components/auth/AuthFormSkeleton';
import { PageSkeletonTransition } from '@/components/ui/PageSkeletons';

export default function ForbiddenPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8fafc] px-4 py-12">
      <div className="w-full max-w-md">
        <PageSkeletonTransition skeleton={<AuthFormSkeleton />}>
          <div className="rounded-[12px] border border-slate-200 bg-white p-8 text-center shadow-xs">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-600">
              <ShieldAlert className="h-7 w-7" aria-hidden />
            </div>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-rose-600 tabular-nums">
              Error 403
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              Acceso no autorizado
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              No tienes permisos para acceder a esta sección con tu rol actual.
              Vuelve al inicio o inicia sesión con una cuenta autorizada.
            </p>

            <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
              <Link
                href="/"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] bg-teal-600 px-4 text-sm font-medium text-white transition-colors hover:bg-teal-700"
              >
                <Home className="h-4 w-4" aria-hidden />
                Ir al inicio
              </Link>
              <Link
                href="/login"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden />
                Cambiar de cuenta
              </Link>
            </div>
          </div>
        </PageSkeletonTransition>
      </div>
    </main>
  );
}
