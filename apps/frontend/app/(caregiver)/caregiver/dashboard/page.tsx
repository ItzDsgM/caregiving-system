import type { Metadata } from 'next';
import { CaregiverDashboardView } from '@/components/caregiver/CaregiverDashboardView';

export const metadata: Metadata = {
  title: 'Panel del Cuidador',
};

export default function CaregiverDashboardPage() {
  return <CaregiverDashboardView />;
}
