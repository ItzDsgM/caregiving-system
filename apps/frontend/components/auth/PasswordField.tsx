'use client';

import React, { useId, useState } from 'react';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import { PasswordRulesChecklist } from './PasswordRulesChecklist';

export interface PasswordFieldProps {
  id?: string;
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  autoComplete: 'current-password' | 'new-password';
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  minLength?: number;
  error?: string | null;
  showRulesAbove?: boolean;
  hint?: string;
  labelRight?: React.ReactNode;
}

/**
 * Accessible password input with visibility toggle, paste support,
 * deferred validation styling, and optional complexity checklist above the field.
 */
export function PasswordField({
  id: providedId,
  name,
  label,
  value,
  onChange,
  onBlur,
  autoComplete,
  placeholder = '••••••••',
  required = true,
  disabled = false,
  minLength,
  error,
  showRulesAbove = false,
  hint,
  labelRight,
}: Readonly<PasswordFieldProps>) {
  const generatedId = useId();
  const inputId = providedId ?? generatedId;
  const rulesId = `${inputId}-rules`;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;

  const [visible, setVisible] = useState(false);

  const describedByIds: string[] = [];
  if (showRulesAbove) describedByIds.push(rulesId);
  if (hint && !error) describedByIds.push(hintId);
  if (error) describedByIds.push(errorId);

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-slate-800"
        >
          {label}
        </label>
        {labelRight}
      </div>

      {showRulesAbove ? (
        <PasswordRulesChecklist id={rulesId} password={value} />
      ) : null}

      <div className="relative">
        <input
          id={inputId}
          name={name}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          autoComplete={autoComplete}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          minLength={minLength}
          aria-invalid={error ? true : undefined}
          aria-describedby={
            describedByIds.length > 0 ? describedByIds.join(' ') : undefined
          }
          className="h-10 w-full rounded-[8px] border border-slate-200 bg-white pr-10 pl-3 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
        />
        <button
          type="button"
          onClick={() => setVisible((prev) => !prev)}
          disabled={disabled}
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-[8px] text-slate-500 transition-colors hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 disabled:pointer-events-none cursor-pointer"
        >
          {visible ? (
            <EyeOff className="h-4 w-4" aria-hidden />
          ) : (
            <Eye className="h-4 w-4" aria-hidden />
          )}
        </button>
      </div>

      {error ? (
        <p
          id={errorId}
          className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-rose-600"
        >
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p id={hintId} className="mt-1.5 text-xs text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
