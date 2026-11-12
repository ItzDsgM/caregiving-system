import type { Metadata } from 'next';
import { AdminUsersView } from '@/components/admin/AdminUsersView';

export const metadata: Metadata = {
  title: 'Usuarios y Roles',
};

export default function AdminUsersPage() {
  return <AdminUsersView />;
}
