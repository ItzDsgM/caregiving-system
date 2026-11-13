import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  Accessibility,
  ArrowRight,
  Baby,
  Brain,
  CheckCircle2,
  FileCheck2,
  HeartHandshake,
  Lock,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { HeroSearchPill } from "@/components/public/HeroSearchPill";
import { LandingLiveMetrics } from "@/components/public/LandingLiveMetrics";
import { BadgeVerified } from "@/components/ui/BadgeVerified";
import {
  LandingPageSkeleton,
  PageSkeletonTransition,
} from "@/components/ui/PageSkeletons";
import { RatingStars } from "@/components/ui/RatingStars";
import {
  CARE_SPECIALTY_DESCRIPTIONS,
  CARE_SPECIALTY_LABELS,
} from "@/lib/constants";
import type { CareSpecialty } from "@/lib/types";

export const metadata: Metadata = {
  title: "CareConnect | Cuidadores Verificados en Colombia",
  description:
    "Encuentra cuidadores verificados con cédula y antecedentes judiciales revisados para adultos mayores, cuidado infantil y asistencia especializada.",
};

const SPECIALTY_CARDS: Array<{
  specialty: CareSpecialty;
  badge: string;
  spanClass: string;
  Icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
}> = [
  {
    specialty: "ELDERLY_CARE",
    badge: "Mayor demanda",
    spanClass: "md:col-span-2 lg:col-span-7",
    Icon: HeartHandshake,
  },
  {
    specialty: "CHILD_CARE",
    badge: "En el hogar",
    spanClass: "md:col-span-1 lg:col-span-5",
    Icon: Baby,
  },
  {
    specialty: "COGNITIVE_DISABILITY",
    badge: "Apoyo terapéutico",
    spanClass: "md:col-span-1 lg:col-span-5",
    Icon: Brain,
  },
  {
    specialty: "PHYSICAL_DISABILITY",
    badge: "Asistencia clínica",
    spanClass: "md:col-span-2 lg:col-span-7",
    Icon: Accessibility,
  },
];

const MODERATION_STEPS = [
  {
    step: "01",
    title: "Carga de documentos obligatorios",
    description:
      "Cada cuidador adjunta su Cédula de Ciudadanía y Certificado de Antecedentes Judiciales vigentes desde su portal.",
    Icon: FileCheck2,
  },
  {
    step: "02",
    title: "Revisión manual de moderación",
    description:
      "Nuestro equipo valida legibilidad y autenticidad antes de activar la insignia Verificado en el catálogo público.",
    Icon: UserCheck,
  },
  {
    step: "03",
    title: "Contacto protegido hasta aceptar",
    description:
      "Teléfono, correo y WhatsApp permanecen ocultos hasta que exista aceptación mutua de solicitud o postulación.",
    Icon: Lock,
  },
];

const TRUST_TESTIMONIALS = [
  {
    id: "t-1",
    family: "Familia Restrepo",
    city: "Bogotá",
    specialty: "ELDERLY_CARE" as CareSpecialty,
    rating: 5,
    quote:
      "Poder revisar los antecedentes aprobados y las reseñas verificadas antes de solicitar contacto nos dio total tranquilidad para el cuidado de mi padre.",
  },
  {
    id: "t-2",
    family: "Carolina M.",
    city: "Medellín",
    specialty: "CHILD_CARE" as CareSpecialty,
    rating: 5,
    quote:
      "Publicamos la oferta con los turnos exactos de la semana y en menos de dos días recibimos postulaciones claras con tarifas transparentes.",
  },
  {
    id: "t-3",
    family: "Andrés V.",
    city: "Cali",
    specialty: "PHYSICAL_DISABILITY" as CareSpecialty,
    rating: 5,
    quote:
      "La privacidad de nuestro teléfono hasta confirmar la entrevista evitó llamadas inesperadas y facilitó elegir al profesional adecuado.",
  },
];

export default function LandingPage() {
  return (
    <PageSkeletonTransition skeleton={<LandingPageSkeleton />}>
    <div>
      {/* 1. Hero Split */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 md:py-20 lg:px-8 lg:py-24">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
            <div className="space-y-6 lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1 text-xs font-semibold text-emerald-800">
                <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden />
                <span>Verificación documental de cédula y antecedentes</span>
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl lg:leading-[1.12]">
                Cuidado humano y verificado para quienes más importan.
              </h1>

              <p className="max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                Conectamos familias en Colombia con cuidadores evaluados para
                adulto mayor, cuidado infantil y asistencia especializada, con
                tarifas transparentes y datos de contacto protegidos.
              </p>

              <div className="pt-1">
                <HeroSearchPill />
              </div>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-1 text-sm text-slate-600">
                <Link
                  href="/job-offers"
                  className="inline-flex items-center gap-1.5 font-semibold text-teal-700 transition-colors hover:text-teal-800"
                >
                  ¿Eres cuidador? Ver ofertas abiertas
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
                <span className="hidden text-slate-300 sm:inline">|</span>
                <Link
                  href="/register"
                  className="font-medium text-slate-700 underline-offset-4 hover:text-slate-900 hover:underline"
                >
                  Crear cuenta gratuita
                </Link>
              </div>
            </div>

            {/* Right Verification Trust Card Highlight */}
            <div className="lg:col-span-5">
              <div className="rounded-[16px] border border-slate-200 bg-[#f8fafc] p-5 shadow-sm sm:p-6">
                <div className="rounded-[12px] border border-slate-200 bg-white p-5 shadow-xs">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-sm font-bold text-teal-700 ring-1 ring-teal-200">
                        MG
                      </span>
                      <div>
                        <p className="text-base font-semibold text-slate-900">
                          María G.
                        </p>
                        <p className="text-xs text-slate-500">
                          Bogotá · Adulto Mayor
                        </p>
                      </div>
                    </div>
                    <BadgeVerified verified size="md" />
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 rounded-[10px] border border-slate-100 bg-slate-50 p-3">
                    <div>
                      <p className="text-[11px] font-medium text-slate-500">
                        Calificación
                      </p>
                      <div className="mt-1">
                        <RatingStars rating={4.9} reviewCount={24} size="sm" />
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] font-medium text-slate-500">
                        Tarifa referencial
                      </p>
                      <p className="mt-0.5 font-mono tabular-nums text-sm font-bold text-slate-900">
                        $ 32.000 / h
                      </p>
                    </div>
                  </div>

                  <ul className="mt-4 space-y-2.5 border-t border-slate-100 pt-4 text-sm">
                    <li className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-slate-700">
                        <CheckCircle2
                          className="h-4 w-4 shrink-0 text-emerald-600"
                          aria-hidden
                        />
                        Cédula de Ciudadanía (ID)
                      </span>
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        Aprobada
                      </span>
                    </li>
                    <li className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-slate-700">
                        <CheckCircle2
                          className="h-4 w-4 shrink-0 text-emerald-600"
                          aria-hidden
                        />
                        Antecedentes Judiciales
                      </span>
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        Aprobados
                      </span>
                    </li>
                    <li className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-slate-700">
                        <Lock
                          className="h-4 w-4 shrink-0 text-teal-600"
                          aria-hidden
                        />
                        Teléfono y correo directo
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                        Protegidos
                      </span>
                    </li>
                  </ul>
                </div>

                <p className="mt-3 text-center text-xs text-slate-500">
                  Ejemplo ilustrativo del estándar de privacidad y verificación
                  documental en CareConnect.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. 4-Specialty Bento Grid */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-20 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">
            Especialidades de cuidado
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Encuentra el acompañamiento exacto para tu familia
          </h2>
          <p className="mt-2 text-base text-slate-600">
            Filtra directamente el directorio público según el tipo de atención
            que necesitas en casa.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-12">
          {SPECIALTY_CARDS.map(({ specialty, badge, spanClass, Icon }) => (
            <Link
              key={specialty}
              href={`/caregivers?specialty=${specialty}`}
              className={`group flex flex-col justify-between rounded-[12px] border border-slate-200 bg-white p-6 shadow-xs transition-all hover:border-teal-400 hover:shadow-md ${spanClass}`}
            >
              <div>
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-[10px] bg-teal-50 text-teal-700 ring-1 ring-teal-200/80 transition-colors group-hover:bg-teal-600 group-hover:text-white">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                    {badge}
                  </span>
                </div>
                <h3 className="mt-5 text-lg font-bold tracking-tight text-slate-900 group-hover:text-teal-700">
                  {CARE_SPECIALTY_LABELS[specialty]}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {CARE_SPECIALTY_DESCRIPTIONS[specialty]}
                </p>
              </div>

              <div className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-teal-700">
                <span>Explorar cuidadores</span>
                <ArrowRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 3. Live Metrics & 3-Step Moderation (#como-funciona anchor) */}
      <section
        id="como-funciona"
        className="scroll-mt-20 border-y border-slate-200 bg-white"
      >
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-20 lg:px-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">
                Cómo funciona CareConnect
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Moderación documental y trazabilidad en cada paso
              </h2>
              <p className="mt-2 text-base text-slate-600">
                Combinamos revisión humana de documentos con privacidad
                progresiva de datos personales.
              </p>
            </div>
            <Link
              href="/caregivers?onlyVerified=true"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] border border-teal-600 bg-transparent px-4 text-sm font-medium text-teal-700 transition-colors hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            >
              Ver cuidadores verificados
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>

          <div className="mt-8">
            <LandingLiveMetrics />
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
            {MODERATION_STEPS.map(({ step, title, description, Icon }) => (
              <div
                key={step}
                className="rounded-[12px] border border-slate-200 bg-[#f8fafc] p-6"
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] border border-teal-200 bg-white text-teal-700">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="font-mono tabular-nums text-xs font-bold text-teal-700">
                    PASO {step}
                  </span>
                </div>
                <h3 className="mt-4 text-base font-bold text-slate-900">
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. 3 Recent Testimonials / Trust Cards */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-20 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">
            Confianza comprobada
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Experiencias de familias en nuestra red
          </h2>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          {TRUST_TESTIMONIALS.map((item) => (
            <article
              key={item.id}
              className="flex flex-col justify-between rounded-[12px] border border-slate-200 bg-white p-6 shadow-xs"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <RatingStars rating={item.rating} showNumeric size="sm" />
                  <span className="rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-[11px] font-medium text-teal-800">
                    {CARE_SPECIALTY_LABELS[item.specialty]}
                  </span>
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-700">
                  &ldquo;{item.quote}&rdquo;
                </p>
              </div>

              <div className="mt-5 border-t border-slate-100 pt-4">
                <p className="text-sm font-semibold text-slate-900">
                  {item.family}
                </p>
                <p className="text-xs text-slate-500">{item.city}, Colombia</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* 5. Final CTA Banner */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 md:pb-24 lg:px-8">
        <div className="rounded-[16px] border border-teal-200 bg-teal-700 px-6 py-10 text-white shadow-sm sm:px-10 md:py-12">
          <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Empieza hoy con respaldo y tranquilidad
              </h2>
              <p className="mt-2 text-sm leading-6 text-teal-50 sm:text-base">
                Crea tu cuenta como familia para publicar ofertas o contactar
                cuidadores, o regístrate como profesional para postular y
                verificar tu perfil.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/register"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] bg-white px-5 text-sm font-semibold text-teal-800 shadow-xs transition-colors hover:bg-teal-50"
              >
                Registrarme ahora
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                href="/caregivers"
                className="inline-flex h-11 items-center justify-center rounded-[8px] border border-teal-300 bg-teal-800/40 px-5 text-sm font-medium text-white transition-colors hover:bg-teal-800/70"
              >
                Explorar cuidadores
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
    </PageSkeletonTransition>
  );
}
