import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  HeartHandshake,
  ShieldCheck,
  Users,
} from 'lucide-react';
import {
  PageSkeletonTransition,
  RoleSelectorSkeleton,
} from '@/components/ui/PageSkeletons';

export const metadata: Metadata = {
  title: 'Crear cuenta',
  description:
    'Elige cómo deseas participar en CareConnect: como familia que busca cuidado o como cuidador profesional.',
};

interface RoleOptionCard {
  id: 'client' | 'caregiver';
  title: string;
  badge: string;
  description: string;
  highlights: string[];
  ctaLabel: string;
  href: string;
  ctaToneClass: string;
  Icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
}

const ROLE_CTA_BASE_CLASS =
  'inline-flex h-11 w-full items-center justify-center gap-2 rounded-[8px] px-5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white';

const ROLE_OPTIONS: RoleOptionCard[] = [
  {
    id: 'client',
    title: 'Familia / Cliente',
    badge: 'Para familias y hogares',
    description:
      'Encuentra acompañantes verificados para adultos mayores, cuidado infantil o apoyo especializado.',
    highlights: [
      'Publica ofertas detalladas con horarios y presupuesto en COP.',
      'Revisa perfiles con cédula y antecedentes aprobados.',
      'Mantén tu teléfono y correo protegidos hasta confirmar contacto.',
    ],
    ctaLabel: 'Continuar como Familia / Cliente',
    href: '/register/client',
    ctaToneClass:
      'border border-transparent bg-teal-600 text-white shadow-xs hover:bg-teal-700 active:bg-teal-800',
    Icon: Users,
  },
  {
    id: 'caregiver',
    title: 'Cuidador Profesional',
    badge: 'Insignia de verificación y gestión de tarifas',
    description:
      'Construye tu perfil profesional, valida tus documentos y postula directamente a ofertas reales.',
    highlights: [
      'Insignia de verificación y gestión de tarifas transparentes.',
      'Configura tu disponibilidad semanal por jornadas (M/T/N).',
      'Recibe solicitudes directas y postula a ofertas en tu ciudad.',
    ],
    ctaLabel: 'Continuar como Cuidador',
    href: '/register/caregiver',
    ctaToneClass:
      'border border-teal-600 bg-transparent text-teal-700 hover:bg-teal-50',
    Icon: ShieldCheck,
  },
];

export default function RegisterRoleSelectorPage() {
  return (
    <PageSkeletonTransition skeleton={<RoleSelectorSkeleton />}>
    <div className="mx-auto w-full max-w-3xl space-y-8">
      {/* Minimal header aligned with Design_rules A1 */}
      <div className="flex flex-col items-start justify-between gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-teal-700">
            <HeartHandshake className="h-4 w-4" aria-hidden />
            <span>Registro CareConnect</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Elige tu tipo de cuenta
          </h1>
          <p className="text-sm text-slate-600">
            Selecciona cómo deseas usar la plataforma para personalizar tu
            experiencia.
          </p>
        </div>

        <p className="shrink-0 text-sm text-slate-600">
          ¿Ya tienes cuenta?{' '}
          <Link
            href="/login"
            className="font-semibold text-teal-700 hover:underline"
          >
            Inicia sesión
          </Link>
        </p>
      </div>

      {/* Equal 2-column CSS Subgrid aligning headers, descriptions, checklists & CTAs */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {ROLE_OPTIONS.map((option) => {
          const Icon = option.Icon;

          return (
            <article
              key={option.id}
              className="cc-subgrid-card gap-y-4 rounded-[12px] border border-slate-200 bg-white p-6 shadow-xs transition-colors hover:border-teal-300"
            >
              {/* Row 1: Icon + Badge + Title */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-600 ring-1 ring-teal-100">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="rounded-full border border-teal-200 bg-teal-50/70 px-2.5 py-0.5 text-[11px] font-medium text-teal-800">
                    {option.badge}
                  </span>
                </div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900">
                  {option.title}
                </h2>
              </div>

              {/* Row 2: Description */}
              <p className="text-sm leading-6 text-slate-600">
                {option.description}
              </p>

              {/* Row 3: Value proposition checklist */}
              <ul className="space-y-2.5 border-t border-slate-100 pt-4">
                {option.highlights.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2.5 text-sm leading-5 text-slate-700"
                  >
                    <CheckCircle2
                      className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
                      aria-hidden
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              {/* Row 4: Bottom-aligned full-width CTA */}
              <div className="pt-2">
                <Link
                  href={option.href}
                  className={`${ROLE_CTA_BASE_CLASS} ${option.ctaToneClass}`}
                >
                  <span>{option.ctaLabel}</span>
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </div>
    </PageSkeletonTransition>
  );
}
