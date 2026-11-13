import React from 'react';
import type { Metadata } from 'next';
import { AuthFormSkeleton } from '@/components/auth/AuthFormSkeleton';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { PageSkeletonTransition } from '@/components/ui/PageSkeletons';

export const metadata: Metadata = {
  title: 'Recuperar contraseña',
  description:
    'Solicita un enlace seguro para restablecer la contraseña de tu cuenta CareConnect.',
};

export default function ForgotPasswordPage() {
  return (
    <PageSkeletonTransition skeleton={<AuthFormSkeleton />}>
      <ForgotPasswordForm />
    </PageSkeletonTransition>
  );
}
