import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { PageLoadingSkeleton } from '@/components/client/ClientUiHelpers';
import { ClientInquiriesView } from '@/components/client/ClientInquiriesView';

export const metadata: Metadata = {
  title: 'Solicitudes Enviadas | Portal Cliente',
  description:
    'Consulta el estado de tus solicitudes de contacto directo y accede a los datos desbloqueados.',
};

export default function ClientInquiriesPage() {
  return (
    <Suspense fallback={<PageLoadingSkeleton cards={3} />}>
      <ClientInquiriesView />
    </Suspense>
  );
}
