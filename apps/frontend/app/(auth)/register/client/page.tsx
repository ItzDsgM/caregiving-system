import React from 'react';
import type { Metadata } from 'next';
import { RegisterForm } from '@/components/auth/RegisterForm';

export const metadata: Metadata = {
  title: 'Registro Familia / Cliente',
  description:
    'Crea tu cuenta familiar en CareConnect para publicar ofertas de cuidado y contactar cuidadores verificados.',
};

export default function RegisterClientPage() {
  return <RegisterForm role="CLIENT" />;
}
