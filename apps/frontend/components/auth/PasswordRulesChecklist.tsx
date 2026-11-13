'use client';

import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import { PASSWORD_REQUIREMENTS } from '@/lib/constants';

export interface PasswordRulesChecklistProps {
  /** Current password value used to evaluate each complexity requirement. */
  password: string;
  /** Optional DOM id for linking with the password input via aria-describedby. */
  id?: string;
}

/**
 * Displays password complexity rules above the password input.
 * Remains permanently visible so users always see each rule's verification state.
 */
export function PasswordRulesChecklist({
  password,
  id,
}: Readonly<PasswordRulesChecklistProps>) {
  const results = PASSWORD_REQUIREMENTS.map((rule) => ({
    ...rule,
    passed: rule.test(password),
  }));

  return (
    <div
      id={id}
      className="mb-2 rounded-[8px] border border-slate-200 bg-slate-50/80 px-3 py-2.5"
    >
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
        Requisitos de contraseña
      </p>
      <ul className="grid grid-cols-1 gap-x-3 gap-y-1 sm:grid-cols-2">
        {results.map((rule) => (
          <li
            key={rule.id}
            className={`flex items-center gap-1.5 text-xs ${
              rule.passed ? 'font-medium text-emerald-700' : 'text-slate-600'
            }`}
          >
            {rule.passed ? (
              <CheckCircle2
                className="h-3.5 w-3.5 shrink-0 text-emerald-600"
                aria-hidden
              />
            ) : (
              <Circle
                className="h-3.5 w-3.5 shrink-0 text-slate-400"
                aria-hidden
              />
            )}
            <span>{rule.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
