import type { Metadata } from 'next';
import { AdminDashboardView } from '@/components/admin/AdminDashboardView';

export const metadata: Metadata = {
  title: 'Panel Ejecutivo',
};

export default function AdminDashboardPage() {
  return <AdminDashboardView />;
}
