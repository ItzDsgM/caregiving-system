import React, { Suspense } from 'react';
import { AppShell } from '@/components/layout/AppShell';

function PortalShellFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8fafc] px-4">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-teal-600" />
    </div>
  );
}

export default function ClientGroupLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Suspense fallback={<PortalShellFallback />}>
      <AppShell expectedRole="CLIENT">{children}</AppShell>
    </Suspense>
  );
}
