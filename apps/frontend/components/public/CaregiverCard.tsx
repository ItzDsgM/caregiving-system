import React from "react";
import Link from "next/link";
import { ArrowRight, Briefcase, MapPin } from "lucide-react";
import { BadgeVerified } from "@/components/ui/BadgeVerified";
import { buttonVariants } from "@/components/ui/Button";
import { RatingStars } from "@/components/ui/RatingStars";
import { CARE_SPECIALTY_LABELS } from "@/lib/constants";
import { formatCOP, formatMaskedName, getInitials } from "@/lib/format";
import type { PublicCaregiverSummary } from "@/lib/types";
import { summarizeAvailability } from "./scheduleSummary";

export interface CaregiverCardProps {
  caregiver: PublicCaregiverSummary;
}

export function CaregiverCard({ caregiver }: Readonly<CaregiverCardProps>) {
  const maskedName = formatMaskedName(caregiver.firstName, caregiver.lastName);
  const initials = getInitials(caregiver.firstName, caregiver.lastName);
  const visibleSpecialties = caregiver.specialties.slice(0, 3);
  const extraSpecialtiesCount = Math.max(0, caregiver.specialties.length - 3);
  const scheduleSummary = summarizeAvailability(caregiver.availability);

  return (
    <article className="cc-subgrid-card rounded-[12px] border border-slate-200 bg-white p-5 shadow-xs transition-all hover:border-teal-300 hover:shadow-md">
      {/* Subgrid Row 1: Identity, Location & Verification */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-teal-50 text-sm font-bold text-teal-700 ring-1 ring-teal-200">
            {initials}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold tracking-tight text-slate-900">
              {maskedName}
            </h2>
            <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-600">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
              <span className="truncate">
                {caregiver.city || "Cobertura nacional"}
                {caregiver.neighborhoods?.length
                  ? ` · ${caregiver.neighborhoods[0]}`
                  : ""}
              </span>
            </p>
          </div>
        </div>

        <BadgeVerified
          verified={caregiver.isDocumentVerified}
          hideWhenUnverified
          className="shrink-0"
        />
      </div>

      {/* Subgrid Row 2: Rating, Experience & Hourly Rate */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-y border-slate-100 py-3">
        <div className="space-y-1">
          <RatingStars
            rating={caregiver.ratingAverage}
            reviewCount={caregiver.totalReviews}
            size="sm"
          />
          <p className="flex items-center gap-1 text-xs text-slate-600">
            <Briefcase className="h-3.5 w-3.5 text-slate-400" aria-hidden />
            <span className="font-mono tabular-nums font-medium text-slate-800">
              {caregiver.yearsOfExperience}
            </span>{" "}
            {caregiver.yearsOfExperience === 1 ? "año exp." : "años exp."}
          </p>
        </div>

        <div className="text-right">
          <p className="font-mono tabular-nums text-base font-bold text-slate-900">
            {formatCOP(caregiver.hourlyRate)}
          </p>
          <p className="text-[11px] font-medium text-slate-500">por hora</p>
        </div>
      </div>

      {/* Subgrid Row 3: Bio Excerpt, Specialties & Compact M/T/N Availability */}
      <div className="mt-3 flex flex-col justify-between gap-3">
        <p className="line-clamp-2 text-sm leading-5 text-slate-600">
          {caregiver.bio?.trim() ||
            "Cuidador profesional con enfoque humano y seguimiento continuo en el hogar."}
        </p>

        <div className="space-y-2.5">
          {visibleSpecialties.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {visibleSpecialties.map((specialty) => (
                <span
                  key={specialty}
                  className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-700"
                >
                  {CARE_SPECIALTY_LABELS[specialty] ?? specialty}
                </span>
              ))}
              {extraSpecialtiesCount > 0 ? (
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono tabular-nums text-[11px] font-medium text-slate-600">
                  +{extraSpecialtiesCount}
                </span>
              ) : null}
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-2 rounded-[8px] border border-slate-100 bg-slate-50/80 px-2.5 py-1.5">
            <span className="truncate text-xs text-slate-600">
              {scheduleSummary.daysLabel}
            </span>
            <div
              className="flex items-center gap-1"
              aria-label="Turnos disponibles: Mañana, Tarde, Noche"
            >
              {scheduleSummary.shiftTags.map((tag) => (
                <span
                  key={tag.shift}
                  title={`${tag.label}: ${tag.active ? "Disponible" : "No disponible"}`}
                  className={`inline-flex h-5 w-5 items-center justify-center rounded-[6px] font-mono text-[10px] font-semibold ${
                    tag.active
                      ? "border border-teal-200 bg-teal-50 text-teal-800"
                      : "border border-slate-200 bg-white text-slate-300"
                  }`}
                >
                  {tag.short}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Subgrid Row 4: Aligned Footer Action */}
      <div className="mt-4 pt-3 border-t border-slate-100">
        <Link
          href={`/caregivers/${caregiver.id}`}
          className={buttonVariants({
            variant: "primary",
            size: "md",
            fullWidth: true,
          })}
        >
          Ver Perfil Completo
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </article>
  );
}
