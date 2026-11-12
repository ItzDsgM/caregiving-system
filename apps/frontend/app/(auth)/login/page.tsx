import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { AuthFormSkeleton } from '@/components/auth/AuthFormSkeleton';
import { LoginForm } from '@/components/auth/LoginForm';

export const metadata: Metadata = {
  title: 'Iniciar sesión',
  description:
    'Inicia sesión en CareConnect para gestionar tus ofertas, postulaciones, documentos y contrataciones.',
};

export default function LoginPage() {
  return (
    <Suspense fallback={<AuthFormSkeleton />}>
      <LoginForm />
    </Suspense>
  );
}
