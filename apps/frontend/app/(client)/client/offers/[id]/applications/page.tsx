import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { PageLoadingSkeleton } from '@/components/client/ClientUiHelpers';
import { OfferApplicationsView } from '@/components/client/OfferApplicationsView';

export const metadata: Metadata = {
  title: 'Postulantes de Oferta | Portal Cliente',
  description:
    'Evalúa postulaciones recibidas, revisa tarifas propuestas y desbloquea contacto directo.',
};

async function OfferApplicationsLoader({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <OfferApplicationsView offerId={id} />;
}

export default function OfferApplicationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<PageLoadingSkeleton cards={3} />}>
      <OfferApplicationsLoader params={params} />
    </Suspense>
  );
}
