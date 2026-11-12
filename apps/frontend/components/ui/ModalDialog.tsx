'use client';

import React, { useId, useLayoutEffect, useRef } from 'react';
import { X } from 'lucide-react';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

export interface ModalDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: ModalSize;
  children: React.ReactNode;
  footer?: React.ReactNode;
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  className?: string;
}

const SIZE_CLASSES: Record<ModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

function notifyDialogChange(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('cc-dialog-change'));
  }
}

export function ModalDialog({
  open,
  onClose,
  title,
  description,
  size = 'md',
  children,
  footer,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  initialFocusRef,
  className = '',
}: Readonly<ModalDialogProps>) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    if (open) {
      if (!dialog.open) {
        dialog.showModal();
        notifyDialogChange();
        if (initialFocusRef?.current) {
          initialFocusRef.current.focus();
        }
      }
    } else if (dialog.open) {
      dialog.close();
      notifyDialogChange();
    }

    return () => {
      if (dialog.open) {
        dialog.close();
        notifyDialogChange();
      }
    };
  }, [open, initialFocusRef]);

  const handleCancel = (event: React.SyntheticEvent<HTMLDialogElement>) => {
    event.preventDefault();
    if (closeOnEscape) {
      onClose();
    }
  };

  const handleClick = (event: React.MouseEvent<HTMLDialogElement>) => {
    if (!closeOnBackdropClick) {
      return;
    }
    if (event.target === dialogRef.current) {
      onClose();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={handleCancel}
      onClick={handleClick}
      className={`m-auto w-[calc(100%-2rem)] overflow-hidden rounded-[12px] border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl ${SIZE_CLASSES[size]} ${className}`}
    >
      <div className="flex max-h-[85vh] flex-col">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div className="min-w-0">
            <h2
              id={titleId}
              className="text-lg font-semibold tracking-tight text-slate-900"
            >
              {title}
            </h2>
            {description ? (
              <p
                id={descriptionId}
                className="mt-1 text-sm leading-5 text-slate-600"
              >
                {description}
              </p>
            ) : null}
          </div>
          {showCloseButton ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar ventana"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          ) : null}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {open ? children : null}
        </div>

        {open && footer ? (
          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 bg-slate-50/70 px-6 py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </dialog>
  );
}
