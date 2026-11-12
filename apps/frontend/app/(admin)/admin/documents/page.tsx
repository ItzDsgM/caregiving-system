import type { Metadata } from 'next';
import { AdminDocumentsView } from '@/components/admin/AdminDocumentsView';

export const metadata: Metadata = {
  title: 'Verificación Documental',
};

export default function AdminDocumentsPage() {
  return <AdminDocumentsView />;
}
