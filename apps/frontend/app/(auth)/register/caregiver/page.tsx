import React from 'react';
import type { Metadata } from 'next';
import { RegisterForm } from '@/components/auth/RegisterForm';

export const metadata: Metadata = {
  title: 'Registro Cuidador Profesional',
  description:
    'Regístrate como cuidador en CareConnect, configura tu perfil y sube tus documentos de verificación.',
};

export default function RegisterCaregiverPage() {
  return <RegisterForm role="CAREGIVER" />;
}
