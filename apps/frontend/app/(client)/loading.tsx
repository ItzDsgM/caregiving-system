import React from 'react';
import { PageLoadingSkeleton } from '@/components/client/ClientUiHelpers';

export default function ClientLoading() {
  return <PageLoadingSkeleton cards={3} />;
}
