import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { AuthFormSkeleton } from '@/components/auth/AuthFormSkeleton';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { PageSkeletonTransition } from '@/components/ui/PageSkeletons';

export const metadata: Metadata = {
  title: 'Registro Cuidador Profesional',
  description:
    'Regístrate como cuidador en CareConnect, configura tu perfil y sube tus documentos de verificación.',
};

export default function RegisterCaregiverPage() {
  return (
    <Suspense fallback={<AuthFormSkeleton />}>
      <PageSkeletonTransition skeleton={<AuthFormSkeleton />}>
        <RegisterForm role="CAREGIVER" />
      </PageSkeletonTransition>
    </Suspense>
  );
}
