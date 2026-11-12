import React, { Suspense } from "react";
import type { Metadata } from "next";
import { CaregiversDirectoryView } from "@/components/public/CaregiversDirectoryView";

export const metadata: Metadata = {
  title: "Directorio de Cuidadores",
  description:
    "Explora y filtra cuidadores verificados en Colombia por ciudad, especialidad, tarifa por hora y calificación.",
};

function DirectoryFallback() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="h-10 w-64 animate-pulse rounded bg-slate-200" />
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="hidden h-96 animate-pulse rounded-[12px] border border-slate-200 bg-white lg:block" />
        <div className="cc-subgrid-grid">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="h-72 animate-pulse rounded-[12px] border border-slate-200 bg-white"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function CaregiversDirectoryPage() {
  return (
    <Suspense fallback={<DirectoryFallback />}>
      <CaregiversDirectoryView />
    </Suspense>
  );
}
