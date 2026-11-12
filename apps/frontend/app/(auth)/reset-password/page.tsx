import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { AuthFormSkeleton } from '@/components/auth/AuthFormSkeleton';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';

export const metadata: Metadata = {
  title: 'Restablecer contraseña',
  description:
    'Define una nueva contraseña segura para tu cuenta de CareConnect.',
};

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<AuthFormSkeleton />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
