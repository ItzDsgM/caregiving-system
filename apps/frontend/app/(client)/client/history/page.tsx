import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { PageLoadingSkeleton } from '@/components/client/ClientUiHelpers';
import { ClientHistoryView } from '@/components/client/ClientHistoryView';

export const metadata: Metadata = {
  title: 'Historial de Servicios | Portal Cliente',
  description:
    'Consulta tus contrataciones activas, programadas y completadas, y califica la atención recibida.',
};

export default function ClientHistoryPage() {
  return (
    <Suspense fallback={<PageLoadingSkeleton cards={3} />}>
      <ClientHistoryView />
    </Suspense>
  );
}
