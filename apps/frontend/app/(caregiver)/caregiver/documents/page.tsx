import type { Metadata } from 'next';
import { CaregiverDocumentsView } from '@/components/caregiver/CaregiverDocumentsView';

export const metadata: Metadata = {
  title: 'Documentos y Verificación',
};

export default function CaregiverDocumentsPage() {
  return <CaregiverDocumentsView />;
}
