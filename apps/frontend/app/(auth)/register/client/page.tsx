import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { AuthFormSkeleton } from '@/components/auth/AuthFormSkeleton';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { PageSkeletonTransition } from '@/components/ui/PageSkeletons';

export const metadata: Metadata = {
  title: 'Registro Familia / Cliente',
  description:
    'Crea tu cuenta familiar en CareConnect para publicar ofertas de cuidado y contactar cuidadores verificados.',
};

export default function RegisterClientPage() {
  return (
    <Suspense fallback={<AuthFormSkeleton />}>
      <PageSkeletonTransition skeleton={<AuthFormSkeleton />}>
        <RegisterForm role="CLIENT" />
      </PageSkeletonTransition>
    </Suspense>
  );
}
