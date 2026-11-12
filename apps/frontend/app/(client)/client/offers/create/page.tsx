import type { Metadata } from 'next';
import { CreateOfferView } from '@/components/client/CreateOfferView';

export const metadata: Metadata = {
  title: 'Publicar Oferta | Portal Cliente',
  description:
    'Crea una nueva oferta de cuidado especificando especialidad, ubicación, fechas, presupuesto y horarios.',
};

export default function CreateOfferPage() {
  return <CreateOfferView />;
}
