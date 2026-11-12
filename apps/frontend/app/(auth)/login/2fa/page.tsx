import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { AuthFormSkeleton } from '@/components/auth/AuthFormSkeleton';
import { TwoFactorChallengeForm } from '@/components/auth/TwoFactorChallengeForm';

export const metadata: Metadata = {
  title: 'Verificación en dos pasos',
  description:
    'Ingresa tu código TOTP de 6 dígitos para completar el inicio de sesión seguro en CareConnect.',
};

export default function TwoFactorChallengePage() {
  return (
    <Suspense fallback={<AuthFormSkeleton />}>
      <TwoFactorChallengeForm />
    </Suspense>
  );
}
