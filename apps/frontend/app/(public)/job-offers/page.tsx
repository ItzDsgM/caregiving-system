import React, { Suspense } from "react";
import type { Metadata } from "next";
import { JobOffersBoardView } from "@/components/public/JobOffersBoardView";

export const metadata: Metadata = {
  title: "Ofertas de Cuidado",
  description:
    "Explora ofertas de empleo abiertas para cuidadores profesionales por ciudad, modalidad y presupuesto.",
};

function OffersFallback() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="h-10 w-64 animate-pulse rounded bg-slate-200" />
      <div className="mt-6 h-24 animate-pulse rounded-[12px] border border-slate-200 bg-white" />
      <div className="mt-6 space-y-4">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className="h-44 animate-pulse rounded-[12px] border border-slate-200 bg-white"
          />
        ))}
      </div>
    </div>
  );
}

export default function JobOffersPage() {
  return (
    <Suspense fallback={<OffersFallback />}>
      <JobOffersBoardView />
    </Suspense>
  );
}
