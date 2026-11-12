import type { Metadata } from 'next';
import { CaregiverHistoryView } from '@/components/caregiver/CaregiverHistoryView';

export const metadata: Metadata = {
  title: 'Historial de Servicios',
};

export default function CaregiverHistoryPage() {
  return <CaregiverHistoryView />;
}
