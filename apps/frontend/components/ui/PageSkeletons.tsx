'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Wraps a page or view so navigation and initial mount briefly show a crisp
 * skeleton placeholder before revealing children. Uses an asynchronous timeout
 * keyed on `pathname` (no synchronous setState inside effects).
 */
export function PageSkeletonTransition({
  skeleton,
  children,
  durationMs = 220,
}: Readonly<{
  skeleton: React.ReactNode;
  children: React.ReactNode;
  durationMs?: number;
}>) {
  const pathname = usePathname();
  const [readyPath, setReadyPath] = useState<string | null>(null);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setReadyPath(pathname);
    }, durationMs);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [pathname, durationMs]);

  if (readyPath !== pathname) {
    return <>{skeleton}</>;
  }

  return <>{children}</>;
}

/**
 * Split-screen skeleton matching `AuthLayoutShell` (teal branding panel + form card).
 */
export function AuthSplitPageSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Cargando vista de autenticación"
      className="min-h-screen bg-[#f8fafc] lg:grid lg:grid-cols-2"
    >
      <aside className="hidden flex-col justify-between bg-gradient-to-br from-teal-700 via-teal-800 to-slate-900 p-10 text-white lg:flex xl:p-14">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 animate-pulse rounded-[10px] bg-white/20" />
          <div className="space-y-1.5">
            <div className="h-4 w-28 animate-pulse rounded bg-white/25" />
            <div className="h-3 w-40 animate-pulse rounded bg-white/15" />
          </div>
        </div>

        <div className="my-auto max-w-lg space-y-6 py-12">
          <div className="h-6 w-52 animate-pulse rounded-full bg-white/15" />
          <div className="space-y-3">
            <div className="h-9 w-full animate-pulse rounded-[8px] bg-white/20" />
            <div className="h-9 w-4/5 animate-pulse rounded-[8px] bg-white/20" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-full animate-pulse rounded bg-white/15" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-white/15" />
          </div>
          <div className="space-y-3 pt-2">
            {[0, 1, 2].map((item) => (
              <div key={item} className="flex items-center gap-2.5">
                <div className="h-4 w-4 shrink-0 animate-pulse rounded-full bg-emerald-300/40" />
                <div className="h-4 w-3/4 animate-pulse rounded bg-white/15" />
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-white/15 pt-6">
          <div className="h-3 w-44 animate-pulse rounded bg-white/15" />
          <div className="h-3 w-24 animate-pulse rounded bg-white/15" />
        </div>
      </aside>

      <main className="flex min-h-screen flex-col justify-between px-4 py-6 sm:px-8 lg:px-12 lg:py-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 lg:hidden">
            <div className="h-8 w-8 animate-pulse rounded-[8px] bg-teal-600/20" />
            <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
          </div>
          <div className="ml-auto h-7 w-28 animate-pulse rounded-[8px] bg-slate-200/80" />
        </div>

        <div className="mx-auto my-auto w-full max-w-md py-8">
          <div className="space-y-4 rounded-[12px] border border-slate-200 bg-white p-6 shadow-xs">
            <div className="h-6 w-44 animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-64 animate-pulse rounded bg-slate-100" />
            <div className="space-y-3 pt-2">
              <div className="h-10 w-full animate-pulse rounded-[8px] bg-slate-100" />
              <div className="h-10 w-full animate-pulse rounded-[8px] bg-slate-100" />
              <div className="h-10 w-full animate-pulse rounded-[8px] bg-slate-100" />
              <div className="h-11 w-full animate-pulse rounded-[8px] bg-teal-100" />
            </div>
          </div>
        </div>

        <div className="mx-auto h-3 w-56 animate-pulse rounded bg-slate-200/70" />
      </main>
    </div>
  );
}

/**
 * Authenticated portal shell skeleton matching `AppShell` (sidebar + sticky header + cards).
 */
export function PortalShellSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Cargando portal"
      className="flex min-h-screen bg-[#f8fafc]"
    >
      <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex h-16 items-center gap-2.5 border-b border-slate-200 px-3">
          <div className="h-8 w-8 shrink-0 animate-pulse rounded-[8px] bg-teal-600/20" />
          <div className="space-y-1.5">
            <div className="h-3.5 w-24 animate-pulse rounded bg-slate-200" />
            <div className="h-2.5 w-16 animate-pulse rounded bg-teal-100" />
          </div>
        </div>

        <div className="flex-1 space-y-2 px-3 py-4">
          {[0, 1, 2, 3, 4, 5].map((item) => (
            <div
              key={item}
              className="flex items-center gap-3 rounded-[8px] px-3 py-2.5"
            >
              <div className="h-5 w-5 shrink-0 animate-pulse rounded bg-slate-200/80" />
              <div className="h-4 flex-1 animate-pulse rounded bg-slate-100" />
            </div>
          ))}
        </div>

        <div className="border-t border-slate-200 p-3">
          <div className="h-8 w-full animate-pulse rounded-[8px] bg-slate-100" />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 animate-pulse rounded-[8px] bg-slate-100 lg:hidden" />
            <div className="h-4 w-40 animate-pulse rounded bg-slate-200/80" />
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden h-9 w-36 animate-pulse rounded-[8px] bg-teal-100 sm:block" />
            <div className="h-9 w-9 animate-pulse rounded-full bg-slate-100" />
            <div className="h-9 w-28 animate-pulse rounded-[8px] bg-slate-100" />
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-6xl space-y-6">
            <div className="space-y-2">
              <div className="h-8 w-64 animate-pulse rounded-[8px] bg-slate-200/80" />
              <div className="h-4 w-96 max-w-full animate-pulse rounded bg-slate-100" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((card) => (
                <div
                  key={card}
                  className="h-32 animate-pulse rounded-[12px] border border-slate-200 bg-white p-5"
                >
                  <div className="h-4 w-28 rounded bg-slate-200/70" />
                  <div className="mt-4 h-7 w-16 rounded bg-slate-200/90" />
                  <div className="mt-3 h-3 w-32 rounded bg-slate-100" />
                </div>
              ))}
            </div>

            <div className="space-y-3">
              {[0, 1].map((row) => (
                <div
                  key={row}
                  className="h-28 animate-pulse rounded-[12px] border border-slate-200 bg-white p-5"
                >
                  <div className="h-5 w-48 rounded bg-slate-200/80" />
                  <div className="mt-3 h-3.5 w-full rounded bg-slate-100" />
                  <div className="mt-2 h-3.5 w-2/3 rounded bg-slate-100" />
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

/**
 * Public directory/listing skeleton (header + filter bar + pulsing card grid).
 */
export function PublicPageSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Cargando página pública"
      className="mx-auto max-w-7xl space-y-6 px-4 py-10 sm:px-6 lg:px-8"
    >
      <div className="space-y-2">
        <div className="h-4 w-36 animate-pulse rounded bg-teal-100" />
        <div className="h-9 w-80 max-w-full animate-pulse rounded-[8px] bg-slate-200/80" />
        <div className="h-4 w-[32rem] max-w-full animate-pulse rounded bg-slate-100" />
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-[12px] border border-slate-200 bg-white p-4 shadow-xs">
        <div className="h-10 min-w-[180px] flex-1 animate-pulse rounded-[8px] bg-slate-100" />
        <div className="h-10 w-44 animate-pulse rounded-[8px] bg-slate-100" />
        <div className="h-10 w-40 animate-pulse rounded-[8px] bg-slate-100" />
        <div className="h-10 w-32 animate-pulse rounded-[8px] bg-teal-100" />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((card) => (
          <div
            key={card}
            className="flex flex-col justify-between rounded-[12px] border border-slate-200 bg-white p-5 shadow-xs"
          >
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-slate-200/80" />
                  <div className="space-y-2">
                    <div className="h-4 w-32 animate-pulse rounded bg-slate-200/80" />
                    <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
                  </div>
                </div>
                <div className="h-5 w-20 animate-pulse rounded-full bg-emerald-100/70" />
              </div>
              <div className="space-y-2">
                <div className="h-3.5 w-full animate-pulse rounded bg-slate-100" />
                <div className="h-3.5 w-5/6 animate-pulse rounded bg-slate-100" />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
              <div className="h-4 w-24 animate-pulse rounded bg-slate-200/70" />
              <div className="h-8 w-24 animate-pulse rounded-[8px] bg-teal-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Landing page skeleton (hero split + 4-specialty bento + metrics & steps).
 */
export function LandingPageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Cargando página principal">
      {/* Hero Split */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 md:py-20 lg:px-8 lg:py-24">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
            <div className="space-y-6 lg:col-span-7">
              <div className="h-7 w-72 animate-pulse rounded-full bg-emerald-100/70" />
              <div className="space-y-3">
                <div className="h-11 w-full animate-pulse rounded-[8px] bg-slate-200/80" />
                <div className="h-11 w-4/5 animate-pulse rounded-[8px] bg-slate-200/80" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-full max-w-2xl animate-pulse rounded bg-slate-100" />
                <div className="h-4 w-5/6 max-w-xl animate-pulse rounded bg-slate-100" />
              </div>
              <div className="h-14 w-full max-w-2xl animate-pulse rounded-full bg-slate-100" />
              <div className="flex items-center gap-4">
                <div className="h-4 w-48 animate-pulse rounded bg-teal-100" />
                <div className="h-4 w-32 animate-pulse rounded bg-slate-100" />
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="rounded-[16px] border border-slate-200 bg-[#f8fafc] p-5 sm:p-6">
                <div className="space-y-4 rounded-[12px] border border-slate-200 bg-white p-5 shadow-xs">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 animate-pulse rounded-full bg-teal-100" />
                      <div className="space-y-2">
                        <div className="h-4 w-24 animate-pulse rounded bg-slate-200/80" />
                        <div className="h-3 w-32 animate-pulse rounded bg-slate-100" />
                      </div>
                    </div>
                    <div className="h-6 w-20 animate-pulse rounded-full bg-emerald-100/70" />
                  </div>
                  <div className="h-16 animate-pulse rounded-[10px] bg-slate-100" />
                  <div className="space-y-2.5 border-t border-slate-100 pt-4">
                    <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
                    <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
                    <div className="h-4 w-5/6 animate-pulse rounded bg-slate-100" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4-Specialty Bento Grid */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-20 lg:px-8">
        <div className="max-w-2xl space-y-2">
          <div className="h-3.5 w-40 animate-pulse rounded bg-teal-100" />
          <div className="h-8 w-96 max-w-full animate-pulse rounded bg-slate-200/80" />
          <div className="h-4 w-80 max-w-full animate-pulse rounded bg-slate-100" />
        </div>

        <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-12">
          {[
            'md:col-span-2 lg:col-span-7',
            'md:col-span-1 lg:col-span-5',
            'md:col-span-1 lg:col-span-5',
            'md:col-span-2 lg:col-span-7',
          ].map((spanClass, idx) => (
            <div
              key={idx}
              className={`h-52 animate-pulse rounded-[12px] border border-slate-200 bg-white p-6 ${spanClass}`}
            >
              <div className="flex items-center justify-between">
                <div className="h-11 w-11 rounded-[10px] bg-teal-50" />
                <div className="h-5 w-24 rounded-full bg-slate-100" />
              </div>
              <div className="mt-5 h-5 w-48 rounded bg-slate-200/80" />
              <div className="mt-2 h-4 w-full rounded bg-slate-100" />
              <div className="mt-2 h-4 w-3/4 rounded bg-slate-100" />
            </div>
          ))}
        </div>
      </section>

      {/* Metrics & 3-Step Moderation */}
      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-20 lg:px-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[0, 1, 2].map((metric) => (
              <div
                key={metric}
                className="h-24 animate-pulse rounded-[12px] border border-slate-200 bg-[#f8fafc] p-5"
              >
                <div className="h-4 w-32 rounded bg-slate-200/70" />
                <div className="mt-3 h-7 w-20 rounded bg-slate-200/90" />
              </div>
            ))}
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
            {[0, 1, 2].map((step) => (
              <div
                key={step}
                className="h-44 animate-pulse rounded-[12px] border border-slate-200 bg-[#f8fafc] p-6"
              >
                <div className="h-10 w-10 rounded-[10px] bg-white" />
                <div className="mt-4 h-5 w-44 rounded bg-slate-200/80" />
                <div className="mt-2 h-3.5 w-full rounded bg-slate-200/60" />
                <div className="mt-2 h-3.5 w-4/5 rounded bg-slate-200/60" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

/**
 * Role selector skeleton matching `/register` (header + 2-column role option cards).
 */
export function RoleSelectorSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Cargando selector de cuenta"
      className="mx-auto w-full max-w-3xl space-y-8"
    >
      <div className="flex flex-col items-start justify-between gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center">
        <div className="space-y-2">
          <div className="h-4 w-36 animate-pulse rounded bg-teal-100" />
          <div className="h-8 w-64 animate-pulse rounded bg-slate-200/80" />
          <div className="h-4 w-80 max-w-full animate-pulse rounded bg-slate-100" />
        </div>
        <div className="h-4 w-36 animate-pulse rounded bg-slate-200/70" />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {[0, 1].map((card) => (
          <div
            key={card}
            className="flex flex-col justify-between space-y-5 rounded-[12px] border border-slate-200 bg-white p-6 shadow-xs"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-11 w-11 animate-pulse rounded-full bg-teal-50" />
                <div className="h-5 w-32 animate-pulse rounded-full bg-teal-50" />
              </div>
              <div className="h-6 w-48 animate-pulse rounded bg-slate-200/80" />
              <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
              <div className="h-4 w-5/6 animate-pulse rounded bg-slate-100" />
            </div>

            <div className="space-y-2.5 border-t border-slate-100 pt-4">
              {[0, 1, 2].map((line) => (
                <div key={line} className="flex items-center gap-2.5">
                  <div className="h-4 w-4 shrink-0 animate-pulse rounded-full bg-emerald-100" />
                  <div className="h-4 flex-1 animate-pulse rounded bg-slate-100" />
                </div>
              ))}
            </div>

            <div className="h-11 w-full animate-pulse rounded-[8px] bg-teal-100" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Form card skeleton for `CreateOfferView` and standalone forms.
 */
export function FormCardSkeleton({
  withPreview = false,
}: Readonly<{ withPreview?: boolean }>) {
  const formContent = (
    <div className="space-y-6">
      <div className="space-y-4 rounded-[12px] border border-slate-200 bg-white p-6">
        <div className="h-5 w-44 animate-pulse rounded bg-slate-200/80" />
        <div className="h-3.5 w-72 max-w-full animate-pulse rounded bg-slate-100" />
        <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2">
          <div className="h-10 animate-pulse rounded-[8px] bg-slate-100" />
          <div className="h-10 animate-pulse rounded-[8px] bg-slate-100" />
        </div>
        <div className="h-10 w-full animate-pulse rounded-[8px] bg-slate-100" />
        <div className="h-24 w-full animate-pulse rounded-[8px] bg-slate-100" />
      </div>

      <div className="space-y-4 rounded-[12px] border border-slate-200 bg-white p-6">
        <div className="h-5 w-40 animate-pulse rounded bg-slate-200/80" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="h-10 animate-pulse rounded-[8px] bg-slate-100" />
          <div className="h-10 animate-pulse rounded-[8px] bg-slate-100" />
        </div>
      </div>

      <div className="flex justify-end gap-3 rounded-[12px] border border-slate-200 bg-white px-6 py-4">
        <div className="h-10 w-24 animate-pulse rounded-[8px] bg-slate-100" />
        <div className="h-10 w-36 animate-pulse rounded-[8px] bg-teal-100" />
      </div>
    </div>
  );

  return (
    <div
      aria-busy="true"
      aria-label="Cargando formulario"
      className={withPreview ? 'mx-auto max-w-6xl space-y-6' : 'w-full space-y-6'}
    >
      <div className="space-y-2">
        <div className="h-4 w-32 animate-pulse rounded bg-slate-200/70" />
        <div className="h-8 w-64 animate-pulse rounded-[8px] bg-slate-200/80" />
        <div className="h-4 w-96 max-w-full animate-pulse rounded bg-slate-100" />
      </div>

      {withPreview ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
          <div className="lg:col-span-8">{formContent}</div>
          <aside className="space-y-4 lg:col-span-4">
            <div className="h-72 animate-pulse rounded-[12px] border border-slate-200 bg-white p-5">
              <div className="h-4 w-36 rounded bg-slate-200/80" />
              <div className="mt-4 h-5 w-28 rounded-full bg-teal-50" />
              <div className="mt-4 h-6 w-3/4 rounded bg-slate-200/80" />
              <div className="mt-3 h-4 w-full rounded bg-slate-100" />
              <div className="mt-2 h-4 w-5/6 rounded bg-slate-100" />
            </div>
          </aside>
        </div>
      ) : (
        formContent
      )}
    </div>
  );
}
