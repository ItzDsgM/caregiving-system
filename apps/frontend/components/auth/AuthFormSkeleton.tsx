import React from 'react';

export function AuthFormSkeleton() {
  return (
    <div
      aria-hidden
      className="space-y-4 rounded-[12px] border border-slate-200 bg-white p-6 shadow-xs"
    >
      <div className="h-6 w-40 animate-pulse rounded bg-slate-200" />
      <div className="h-4 w-64 animate-pulse rounded bg-slate-100" />
      <div className="space-y-3 pt-2">
        <div className="h-10 w-full animate-pulse rounded-[8px] bg-slate-100" />
        <div className="h-10 w-full animate-pulse rounded-[8px] bg-slate-100" />
        <div className="h-11 w-full animate-pulse rounded-[8px] bg-teal-100" />
      </div>
    </div>
  );
}
