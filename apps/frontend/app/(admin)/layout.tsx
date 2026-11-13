import React, { Suspense } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { PortalShellSkeleton } from '@/components/ui/PageSkeletons';

export default function AdminGroupLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Suspense fallback={<PortalShellSkeleton />}>
      <AppShell expectedRole="ADMIN">{children}</AppShell>
    </Suspense>
  );
}
