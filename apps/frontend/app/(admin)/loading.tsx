import React from 'react';
import { PageLoadingSkeleton } from '@/components/client/ClientUiHelpers';

export default function AdminLoading() {
  return <PageLoadingSkeleton cards={3} />;
}
