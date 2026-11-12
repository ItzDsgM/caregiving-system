import type { Metadata } from 'next';
import { CaregiverApplicationsView } from '@/components/caregiver/CaregiverApplicationsView';

export const metadata: Metadata = {
  title: 'Mis Postulaciones',
};

export default function CaregiverApplicationsPage() {
  return <CaregiverApplicationsView />;
}
