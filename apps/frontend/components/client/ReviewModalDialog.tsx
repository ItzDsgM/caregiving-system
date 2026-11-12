'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { ModalDialog } from '@/components/ui/ModalDialog';
import { useToast } from '@/components/ui/ToastRegion';
import { ReviewForm } from './ReviewForm';
import type { StoredReviewRecord } from './storage';

export interface ReviewModalDialogProps {
  open: boolean;
  onClose: () => void;
  caregiverId: string;
  caregiverName: string;
  offerTitle?: string;
  onSubmitted?: (caregiverId: string, review: StoredReviewRecord) => void;
}

export function ReviewModalDialog({
  open,
  onClose,
  caregiverId,
  caregiverName,
  offerTitle,
  onSubmitted,
}: Readonly<ReviewModalDialogProps>) {
  const toast = useToast();

  return (
    <ModalDialog
      open={open}
      onClose={onClose}
      title="Calificar Servicio"
      description="Tu evaluación ayuda a otras familias a elegir cuidadores de confianza."
      size="md"
    >
      <div className="space-y-5">
        <div className="rounded-[12px] border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Cuidador evaluado
          </p>
          <p className="mt-0.5 text-sm font-semibold text-slate-900">
            {caregiverName}
          </p>
          {offerTitle ? (
            <p className="mt-0.5 text-xs text-slate-600">{offerTitle}</p>
          ) : null}
        </div>

        <ReviewForm
          key={`${caregiverId}-${open ? 'open' : 'closed'}`}
          caregiverId={caregiverId}
          onSuccess={(record) => {
            onClose();
            onSubmitted?.(caregiverId, record);
            toast.success(
              'Reseña publicada',
              `Gracias por compartir tu experiencia con ${caregiverName}.`,
            );
          }}
          onAlreadyReviewed={(record) => {
            onSubmitted?.(caregiverId, record);
          }}
          cancelAction={
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
          }
        />
      </div>
    </ModalDialog>
  );
}
