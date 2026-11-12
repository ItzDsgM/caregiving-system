'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger'
  | 'danger-outline';

export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonStyleOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-teal-600 text-white border border-transparent hover:bg-teal-700 active:bg-teal-800 shadow-xs',
  secondary:
    'bg-white text-slate-900 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-xs',
  outline:
    'bg-transparent text-teal-700 border border-teal-600 hover:bg-teal-50',
  ghost:
    'bg-transparent text-slate-700 border border-transparent hover:bg-slate-100 hover:text-slate-900',
  danger:
    'bg-rose-600 text-white border border-transparent hover:bg-rose-700 active:bg-rose-800 shadow-xs',
  'danger-outline':
    'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-11 px-5 text-sm gap-2',
  icon: 'h-9 w-9 p-0',
};

export function buttonVariants({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
}: ButtonStyleOptions = {}): string {
  return [
    'inline-flex items-center justify-center rounded-[8px] font-medium transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
    'disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    fullWidth ? 'w-full' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');
}

export interface ButtonProps
  extends React.ComponentPropsWithRef<'button'>,
    ButtonStyleOptions {
  loading?: boolean;
  loadingText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  loadingText,
  leftIcon,
  rightIcon,
  disabled,
  type = 'button',
  className = '',
  children,
  ...rest
}: Readonly<ButtonProps>) {
  const isDisabled = Boolean(disabled || loading);

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={buttonVariants({ variant, size, fullWidth, className })}
      {...rest}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
      ) : (
        leftIcon
      )}
      {loading && loadingText ? <span>{loadingText}</span> : children}
      {!loading ? rightIcon : null}
    </button>
  );
}
