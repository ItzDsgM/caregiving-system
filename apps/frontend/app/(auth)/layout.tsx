import React, { Suspense } from 'react';
import { AuthLayoutShell } from '@/components/layout/AuthLayoutShell';

function AuthShellFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8fafc] px-4">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-teal-600" />
    </div>
  );
}

export default function AuthGroupLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Suspense fallback={<AuthShellFallback />}>
      <AuthLayoutShell>{children}</AuthLayoutShell>
    </Suspense>
  );
}
