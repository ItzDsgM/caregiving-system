"use client";

import React, { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Search, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CARE_SPECIALTY_OPTIONS, COLOMBIAN_CITIES } from "@/lib/constants";
import type { CareSpecialty } from "@/lib/types";

export function HeroSearchPill() {
  const router = useRouter();
  const [city, setCity] = useState("");
  const [specialty, setSpecialty] = useState<CareSpecialty | "">("");
  const cityListId = useId();
  const cityInputId = useId();
  const specialtySelectId = useId();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (city.trim()) {
      params.set("city", city.trim());
    }
    if (specialty) {
      params.set("specialty", specialty);
    }
    const qs = params.toString();
    router.push(qs ? `/caregivers?${qs}` : "/caregivers");
  };

  return (
    <search aria-label="Búsqueda rápida de cuidadores">
      <form
        onSubmit={handleSubmit}
        className="rounded-[16px] border border-slate-200 bg-white p-2 shadow-sm transition-shadow focus-within:border-teal-400 focus-within:shadow-md md:rounded-full md:pl-4"
      >
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-0">
          <div className="flex flex-1 items-center gap-2.5 rounded-[10px] px-3 py-2 md:rounded-none md:border-r md:border-slate-200 md:py-1.5 md:pr-4 md:pl-1">
            <MapPin className="h-4 w-4 shrink-0 text-teal-600" aria-hidden />
            <div className="min-w-0 flex-1">
              <label
                htmlFor={cityInputId}
                className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500"
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
                className="w-full bg-transparent text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
              <datalist id={cityListId}>
                {COLOMBIAN_CITIES.map((cityOption) => (
                  <option key={cityOption} value={cityOption} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="flex flex-1 items-center gap-2.5 rounded-[10px] px-3 py-2 md:rounded-none md:py-1.5 md:px-4">
            <Stethoscope
              className="h-4 w-4 shrink-0 text-teal-600"
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <label
                htmlFor={specialtySelectId}
                className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500"
              >
                Especialidad
              </label>
              <select
                id={specialtySelectId}
                value={specialty}
                onChange={(e) =>
                  setSpecialty(e.target.value as CareSpecialty | "")
                }
                className="w-full bg-transparent text-sm font-medium text-slate-900 focus:outline-none cursor-pointer"
              >
                <option value="">Todas las especialidades</option>
                {CARE_SPECIALTY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            leftIcon={<Search className="h-4 w-4" aria-hidden />}
            className="w-full rounded-[10px] md:w-auto md:rounded-full md:px-6"
          >
            Buscar cuidadores
          </Button>
        </div>
      </form>
    </search>
  );
}
