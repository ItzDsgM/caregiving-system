import React, { Suspense } from 'react';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { PublicNavbar } from '@/components/layout/PublicNavbar';

function NavbarFallback() {
  return (
    <div className="sticky top-0 z-40 h-16 border-b border-slate-200 bg-white/95" />
  );
}

function PublicContentFallback() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="h-40 animate-pulse rounded-[12px] border border-slate-200 bg-white" />
    </div>
  );
}

export default function PublicGroupLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc]">
      <Suspense fallback={<NavbarFallback />}>
        <PublicNavbar />
      </Suspense>
      <main className="flex-1">
        <Suspense fallback={<PublicContentFallback />}>{children}</Suspense>
      </main>
      <PublicFooter />
    </div>
  );
}
