import React, { Suspense } from "react";
import type { Metadata } from "next";
import { CaregiverDetailView } from "@/components/public/CaregiverDetailView";

export const metadata: Metadata = {
  title: "Perfil del Cuidador",
  description:
    "Consulta la experiencia, verificación documental, disponibilidad semanal y reseñas del cuidador en CareConnect.",
};

function DetailFallback() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="h-5 w-48 animate-pulse rounded bg-slate-200" />
      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <div className="h-48 animate-pulse rounded-[12px] border border-slate-200 bg-white" />
          <div className="h-64 animate-pulse rounded-[12px] border border-slate-200 bg-white" />
        </div>
        <div className="h-80 animate-pulse rounded-[12px] border border-slate-200 bg-white lg:col-span-4" />
      </div>
    </div>
  );
}

async function CaregiverDetailResolved({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CaregiverDetailView caregiverId={id} />;
}

export default function CaregiverDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<DetailFallback />}>
      <CaregiverDetailResolved params={params} />
    </Suspense>
  );
}
