'use client';

import React, { useId } from 'react';
import { AlertCircle } from 'lucide-react';

export interface OtpCodeInputProps {
  id?: string;
  name?: string;
  label?: string;
  value: string;
  onChange: (digits: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  autoFocus?: boolean;
  error?: string | null;
  hint?: string;
}

/**
 * Single semantic 6-digit OTP input designed for screen readers,
 * SMS/authenticator autofill (`one-time-code`), and smart numeric paste.
 */
export function OtpCodeInput({
  id: providedId,
  name = 'code',
  label = 'Código de verificación (6 dígitos)',
  value,
  onChange,
  onBlur,
  disabled = false,
  autoFocus = false,
  error,
  hint,
}: Readonly<OtpCodeInputProps>) {
  const generatedId = useId();
  const inputId = providedId ?? generatedId;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;

  const handleValueChange = (raw: string) => {
    const digitsOnly = raw.replace(/\D/g, '').slice(0, 6);
    onChange(digitsOnly);
  };

  return (
    <div>
      <label
        htmlFor={inputId}
        className="mb-1.5 block text-sm font-medium text-slate-800"
      >
        {label}
      </label>

      <input
        id={inputId}
        name={name}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        pattern="\d{6}"
        required
        disabled={disabled}
        autoFocus={autoFocus}
        spellCheck={false}
        autoCorrect="off"
        placeholder="000000"
        value={value}
        onChange={(e) => handleValueChange(e.target.value)}
        onBlur={onBlur}
        aria-invalid={error ? true : undefined}
        aria-describedby={
          error ? errorId : hint ? hintId : undefined
        }
        className="h-12 w-full rounded-[8px] border border-slate-200 bg-white px-4 text-center font-mono text-xl font-semibold tracking-[0.4em] text-slate-900 tabular-nums placeholder:text-slate-300 transition-colors focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 sm:text-2xl sm:tracking-[0.48em]"
      />

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
