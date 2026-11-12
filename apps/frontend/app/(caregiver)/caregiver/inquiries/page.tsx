import type { Metadata } from 'next';
import { CaregiverInquiriesView } from '@/components/caregiver/CaregiverInquiriesView';

export const metadata: Metadata = {
  title: 'Solicitudes Recibidas',
};

export default function CaregiverInquiriesPage() {
  return <CaregiverInquiriesView />;
}
