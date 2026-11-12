'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  HeartHandshake,
  Lock,
  ShieldCheck,
} from 'lucide-react';

interface SplitMessaging {
  badge: string;
  headline: string;
  subtitle: string;
  points: string[];
}

function getSplitMessaging(pathname: string): SplitMessaging {
  if (pathname.startsWith('/register/caregiver')) {
    return {
      badge: 'Red de Cuidadores Profesionales',
      headline: 'Construye confianza real con familias que necesitan tu experiencia.',
      subtitle:
        'Completa tu perfil profesional, valida tus documentos de identidad y antecedentes, y postula directamente a ofertas en tu ciudad.',
      points: [
        'Insignia de Verificación al aprobar cédula y antecedentes.',
        'Calendario flexible por jornadas de mañana, tarde y noche.',
        'Tus datos personales permanecen protegidos hasta aceptar el contacto.',
      ],
    };
  }

  if (pathname.startsWith('/register/client')) {
    return {
      badge: 'Cuidado Familiar Seguro',
      headline: 'Encuentra acompañamiento confiable para quienes más quieres.',
      subtitle:
        'Publica ofertas detalladas, revisa perfiles verificados con tarifas transparentes en COP y coordina entrevistas sin intermediarios.',
      points: [
        'Perfiles auditados y reseñas de servicios completados.',
        'Filtros por especialidad: adulto mayor, infancia y discapacidad.',
        'Control total sobre cuándo compartir tu teléfono y correo.',
      ],
    };
  }

  return {
    badge: 'Acceso Seguro CareConnect',
    headline: 'Cuidado humano respaldado por verificación y precisión.',
    subtitle:
      'Gestiona ofertas, postulaciones, historial de servicios y verificación documental desde un solo espacio claro y ordenado.',
    points: [
      'Cuidadores con revisión de identidad y antecedentes.',
      'Protección de datos personales hasta aceptación mutua.',
      'Soporte para autenticación en dos pasos (2FA).',
    ],
  };
}

export function AuthLayoutShell({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();

  const useSplitLayout =
    pathname === '/login' ||
    pathname.startsWith('/register/client') ||
    pathname.startsWith('/register/caregiver');

  if (useSplitLayout) {
    const messaging = getSplitMessaging(pathname);

    return (
      <div className="min-h-screen bg-[#f8fafc] lg:grid lg:grid-cols-2">
        <aside className="hidden flex-col justify-between bg-gradient-to-br from-teal-700 via-teal-800 to-slate-900 p-10 text-white lg:flex xl:p-14">
          <div className="flex items-center justify-between">
            <Link href="/" className="inline-flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] bg-white/15 text-white ring-1 ring-white/25">
                <HeartHandshake className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <span className="block text-lg font-bold tracking-tight">
                  CareConnect
                </span>
                <span className="block text-xs text-teal-100">
                  Cuidado y asistencia verificada
                </span>
              </div>
            </Link>
          </div>

          <div className="my-auto max-w-lg space-y-6 py-12">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-teal-100 ring-1 ring-white/20">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
              {messaging.badge}
            </span>
            <h1 className="text-3xl font-bold leading-tight tracking-tight xl:text-4xl">
              {messaging.headline}
            </h1>
            <p className="text-base leading-7 text-teal-50/90">
              {messaging.subtitle}
            </p>
            <ul className="space-y-3 pt-2">
              {messaging.points.map((point) => (
                <li
                  key={point}
                  className="flex items-start gap-2.5 text-sm leading-6 text-teal-50"
                >
                  <CheckCircle2
                    className="mt-1 h-4 w-4 shrink-0 text-emerald-300"
                    aria-hidden
                  />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center justify-between border-t border-white/15 pt-6 text-xs text-teal-100/80">
            <span className="inline-flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5" aria-hidden />
              Privacidad protegida desde el registro
            </span>
            <span>© 2026 CareConnect</span>
          </div>
        </aside>

        <main className="flex min-h-screen flex-col justify-between px-4 py-6 sm:px-8 lg:px-12 lg:py-10">
          <div className="flex items-center justify-between">
            <Link href="/" className="inline-flex items-center gap-2 lg:hidden">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] bg-teal-600 text-white">
                <HeartHandshake className="h-4 w-4" aria-hidden />
              </span>
              <span className="text-sm font-bold text-slate-900">
                CareConnect
              </span>
            </Link>
            <Link
              href="/"
              className="ml-auto inline-flex items-center gap-1.5 rounded-[8px] px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-200/60 hover:text-slate-900"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
              Volver al inicio
            </Link>
          </div>

          <div className="mx-auto my-auto w-full max-w-md py-8">{children}</div>

          <p className="text-center text-xs text-slate-500">
            ¿Necesitas explorar primero?{' '}
            <Link
              href="/caregivers"
              className="font-medium text-teal-700 hover:underline"
            >
              Ver directorio público
            </Link>
          </p>
        </main>
      </div>
    );
  }

  const isWideChooser = pathname === '/register';

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc] px-4 py-6 sm:px-6 lg:px-8">
      <header className="mx-auto flex w-full max-w-4xl items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] bg-teal-600 text-white">
            <HeartHandshake className="h-5 w-5" aria-hidden />
          </span>
          <span className="text-base font-bold tracking-tight text-slate-900">
            CareConnect
          </span>
        </Link>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-200/70 hover:text-slate-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Volver al inicio
        </Link>
      </header>

      <main
        className={`mx-auto my-auto w-full py-10 ${
          isWideChooser ? 'max-w-3xl' : 'max-w-md'
        }`}
      >
        {children}
      </main>

      <footer className="mx-auto w-full max-w-4xl text-center text-xs text-slate-500">
        © 2026 CareConnect · Plataforma de Cuidado y Asistencia
      </footer>
    </div>
  );
}
