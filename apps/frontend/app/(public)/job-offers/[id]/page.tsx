import React, { Suspense } from "react";
import type { Metadata } from "next";
import { JobOfferDetailView } from "@/components/public/JobOfferDetailView";

export const metadata: Metadata = {
  title: "Detalle de Oferta de Cuidado",
  description:
    "Revisa los turnos requeridos, presupuesto y detalles de la oferta de cuidado y envía tu postulación.",
};

function OfferDetailFallback() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="h-5 w-48 animate-pulse rounded bg-slate-200" />
      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <div className="h-44 animate-pulse rounded-[12px] border border-slate-200 bg-white" />
          <div className="h-64 animate-pulse rounded-[12px] border border-slate-200 bg-white" />
        </div>
        <div className="h-72 animate-pulse rounded-[12px] border border-slate-200 bg-white lg:col-span-4" />
      </div>
    </div>
  );
}

async function JobOfferDetailResolved({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <JobOfferDetailView offerId={id} />;
}

export default function JobOfferDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<OfferDetailFallback />}>
      <JobOfferDetailResolved params={params} />
    </Suspense>
  );
}
