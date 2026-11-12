import React from 'react';
import { Inbox } from 'lucide-react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  compact?: boolean;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  compact = false,
  className = '',
}: Readonly<EmptyStateProps>) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-[12px] border border-dashed border-slate-300 bg-white text-center ${
        compact ? 'px-5 py-8' : 'px-6 py-12'
      } ${className}`}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-teal-700">
        {icon ?? <Inbox className="h-6 w-6" aria-hidden />}
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-900">{title}</h3>
      {description ? (
        <p className="mt-1.5 max-w-md text-sm leading-6 text-slate-600">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5 flex flex-wrap justify-center gap-3">{action}</div> : null}
    </div>
  );
}
