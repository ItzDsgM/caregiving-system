import type { Metadata } from 'next';
import { AdminReportsView } from '@/components/admin/AdminReportsView';

export const metadata: Metadata = {
  title: 'Reportes de Modalidad',
};

export default function AdminReportsPage() {
  return <AdminReportsView />;
}
