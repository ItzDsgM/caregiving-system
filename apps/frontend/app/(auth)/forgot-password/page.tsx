import React from 'react';
import type { Metadata } from 'next';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';

export const metadata: Metadata = {
  title: 'Recuperar contraseña',
  description:
    'Solicita un enlace seguro para restablecer la contraseña de tu cuenta CareConnect.',
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
