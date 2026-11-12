import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { CaregiverProfileView } from '@/components/caregiver/CaregiverProfileView';
import { CaregiverSectionSkeleton } from '@/components/caregiver/CaregiverPortalFeedback';

export const metadata: Metadata = {
  title: 'Mi Perfil Profesional',
};

export default function CaregiverProfilePage() {
  return (
    <Suspense fallback={<CaregiverSectionSkeleton rows={3} />}>
      <CaregiverProfileView />
    </Suspense>
  );
}
