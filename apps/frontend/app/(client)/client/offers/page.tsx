import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { ClientOffersView } from '@/components/client/ClientOffersView';
import { PageLoadingSkeleton } from '@/components/client/ClientUiHelpers';

export const metadata: Metadata = {
  title: 'Mis Ofertas | Portal Cliente',
  description:
    'Administra tus ofertas publicadas, revisa postulaciones y actualiza su estado.',
};

export default function ClientOffersPage() {
  return (
    <Suspense fallback={<PageLoadingSkeleton cards={3} />}>
      <ClientOffersView />
    </Suspense>
  );
}
