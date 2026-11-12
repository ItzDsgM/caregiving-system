import React from 'react';
import type { Metadata } from 'next';
import { SecuritySettingsView } from '@/components/auth/SecuritySettingsView';

export const metadata: Metadata = {
  title: 'Seguridad y 2FA',
  description:
    'Configura la autenticación en dos pasos (2FA) para proteger tu cuenta de familia en CareConnect.',
};

export default function ClientSecuritySettingsPage() {
  return <SecuritySettingsView />;
}
