import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { PageLoadingSkeleton } from '@/components/client/ClientUiHelpers';
import { NewReviewView } from '@/components/client/NewReviewView';

export const metadata: Metadata = {
  title: 'Nueva Reseña | Portal Cliente',
  description:
    'Califica el desempeño de un cuidador después de completar un servicio verificado.',
};

export default function NewReviewPage() {
  return (
    <Suspense fallback={<PageLoadingSkeleton cards={1} />}>
      <NewReviewView />
    </Suspense>
  );
}
