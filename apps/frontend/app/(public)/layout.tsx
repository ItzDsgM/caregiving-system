import React, { Suspense } from 'react';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { PublicPageSkeleton } from '@/components/ui/PageSkeletons';

function NavbarFallback() {
  return (
    <div className="sticky top-0 z-40 h-16 border-b border-slate-200 bg-white/95" />
  );
}

function PublicContentFallback() {
  return <PublicPageSkeleton />;
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
