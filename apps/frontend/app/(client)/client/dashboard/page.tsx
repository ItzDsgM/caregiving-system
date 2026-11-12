import type { Metadata } from 'next';
import { ClientDashboardView } from '@/components/client/ClientDashboardView';

export const metadata: Metadata = {
  title: 'Panel Principal | Portal Cliente',
  description:
    'Resumen de ofertas activas, postulaciones pendientes, solicitudes enviadas y servicios en curso.',
};

export default function ClientDashboardPage() {
  return <ClientDashboardView />;
}
