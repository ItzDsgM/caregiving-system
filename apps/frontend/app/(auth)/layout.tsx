import React, { Suspense } from 'react';
import { AuthLayoutShell } from '@/components/layout/AuthLayoutShell';
import { AuthSplitPageSkeleton } from '@/components/ui/PageSkeletons';

export default function AuthGroupLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Suspense fallback={<AuthSplitPageSkeleton />}>
      <AuthLayoutShell>{children}</AuthLayoutShell>
    </Suspense>
  );
}
