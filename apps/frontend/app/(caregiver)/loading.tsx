import React from 'react';
import { CaregiverSectionSkeleton } from '@/components/caregiver/CaregiverPortalFeedback';

export default function CaregiverLoading() {
  return <CaregiverSectionSkeleton rows={3} />;
}
