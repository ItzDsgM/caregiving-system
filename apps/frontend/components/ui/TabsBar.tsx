'use client';

import React, { useRef } from 'react';

export interface TabOption<T extends string = string> {
  id: T;
  label: string;
  count?: number;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface TabsBarProps<T extends string = string> {
  tabs: ReadonlyArray<TabOption<T>>;
  activeTab: T;
  onChange: (tabId: T) => void;
  ariaLabel?: string;
  className?: string;
}

export function TabsBar<T extends string = string>({
  tabs,
  activeTab,
  onChange,
  ariaLabel = 'Secciones',
  className = '',
}: Readonly<TabsBarProps<T>>) {
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const focusAndSelectIndex = (targetIndex: number) => {
    const enabledIndices = tabs
      .map((tab, index) => (tab.disabled ? -1 : index))
      .filter((index) => index !== -1);

    if (enabledIndices.length === 0) {
      return;
    }

    const chosenIndex = enabledIndices.includes(targetIndex)
      ? targetIndex
      : enabledIndices[0];

    const tab = tabs[chosenIndex];
    if (!tab) {
      return;
    }

    onChange(tab.id);
    buttonRefs.current[chosenIndex]?.focus();
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) => {
    const enabledIndices = tabs
      .map((tab, index) => (tab.disabled ? -1 : index))
      .filter((index) => index !== -1);

    if (enabledIndices.length <= 1) {
      return;
    }

    const pos = enabledIndices.indexOf(currentIndex);
    if (pos === -1) {
      return;
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      const next = enabledIndices[(pos + 1) % enabledIndices.length];
      focusAndSelectIndex(next);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      const prev =
        enabledIndices[
          (pos - 1 + enabledIndices.length) % enabledIndices.length
        ];
      focusAndSelectIndex(prev);
    } else if (event.key === 'Home') {
      event.preventDefault();
      focusAndSelectIndex(enabledIndices[0]);
    } else if (event.key === 'End') {
      event.preventDefault();
      focusAndSelectIndex(enabledIndices[enabledIndices.length - 1]);
    }
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`flex items-center gap-1 overflow-x-auto border-b border-slate-200 ${className}`}
    >
      {tabs.map((tab, index) => {
        const isSelected = tab.id === activeTab;

        return (
          <button
            key={tab.id}
            ref={(el) => {
              buttonRefs.current[index] = el;
            }}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={isSelected}
            aria-controls={`tabpanel-${tab.id}`}
            tabIndex={isSelected ? 0 : -1}
            disabled={tab.disabled}
            onClick={() => onChange(tab.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={`cc-tab inline-flex shrink-0 items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-inset disabled:cursor-not-allowed disabled:opacity-45 cursor-pointer ${
              isSelected
                ? 'text-teal-700'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {typeof tab.count === 'number' ? (
              <span
                className={`tabular-nums rounded-full px-2 py-0.5 text-xs font-semibold ${
                  isSelected
                    ? 'bg-teal-50 text-teal-700'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {tab.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
