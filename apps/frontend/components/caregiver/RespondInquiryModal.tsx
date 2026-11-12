'use client';

import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ModalDialog } from '@/components/ui/ModalDialog';
import { useToast } from '@/components/ui/ToastRegion';
import { contactRequestsApi, extractErrorMessage, ApiError } from '@/lib/api';
import { formatFullName, formatRelativeTime } from '@/lib/format';
import type {
  FormattedContactRequest,
  RespondContactRequestResponse,
} from '@/lib/types';

export interface RespondInquiryModalProps {
  inquiry: FormattedContactRequest | null;
  action: 'ACCEPTED' | 'REJECTED' | null;
  onClose: () => void;
  onResponded: (
    inquiryId: string,
    response: RespondContactRequestResponse,
  ) => void;
}

export function RespondInquiryModal({
  inquiry,
  action,
  onClose,
  onResponded,
}: Readonly<RespondInquiryModalProps>) {
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isOpen = Boolean(inquiry && action);
  const isAccept = action === 'ACCEPTED';

  const handleClose = () => {
    if (isSubmitting) return;
    setErrorMessage(null);
    onClose();
  };

  const handleConfirm = async () => {
    if (!inquiry || !action || isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // Strictly send { status } only per RespondContactRequestDto (forbidNonWhitelisted: true)
      const response = await contactRequestsApi.respond(inquiry.id, {
        status: action,
      });

      onResponded(inquiry.id, response);
      setIsSubmitting(false);
      setErrorMessage(null);
      onClose();

      if (action === 'ACCEPTED') {
        toast.success(
          'Solicitud aceptada',
          'Los datos de contacto directo de la familia ya están desbloqueados.',
        );
      } else {
        toast.info(
          'Solicitud rechazada',
          'La familia será notificada y no se compartirán tus datos.',
        );
      }
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message || extractErrorMessage(err.rawMessage, err.statusCode)
          : 'No pudimos registrar tu respuesta. Inténtalo de nuevo.';
      setErrorMessage(msg);
      setIsSubmitting(false);
    }
  };

  const clientName = inquiry
    ? formatFullName(inquiry.participant.firstName, inquiry.participant.lastName, 'Familia')
    : '';

  return (
    <ModalDialog
      open={isOpen}
      onClose={handleClose}
      size="md"
      title={
        isAccept
          ? 'Aceptar solicitud de contacto'
          : 'Rechazar solicitud de contacto'
      }
      description={
        inquiry
          ? `Solicitud enviada por ${clientName} (${formatRelativeTime(inquiry.createdAt)})`
          : undefined
      }
      closeOnBackdropClick={!isSubmitting}
      closeOnEscape={!isSubmitting}
      footer={
        <>
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            variant={isAccept ? 'primary' : 'danger'}
            loading={isSubmitting}
            loadingText={isAccept ? 'Aceptando...' : 'Rechazando...'}
            onClick={handleConfirm}
          >
            {isAccept ? 'Confirmar y desbloquear contacto' : 'Confirmar rechazo'}
          </Button>
        </>
      }
    >
      {inquiry ? (
        <div className="space-y-4">
          {errorMessage ? (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-[8px] border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden />
              <span>{errorMessage}</span>
            </div>
          ) : null}

          <div className="rounded-[8px] border border-slate-200 bg-slate-50 p-3.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Mensaje de {clientName}
            </p>
            <p className="mt-1.5 whitespace-pre-line text-sm leading-6 text-slate-700">
              {inquiry.initialMessage}
            </p>
          </div>

          {isAccept ? (
            <div className="flex items-start gap-3 rounded-[8px] border border-emerald-200 bg-emerald-50/70 p-3.5 text-sm text-emerald-900">
              <CheckCircle2
                className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600"
                aria-hidden
              />
              <div>
                <p className="font-semibold">Desbloqueo mutuo de contacto</p>
                <p className="mt-0.5 text-xs leading-5 text-emerald-800">
                  Al aceptar, podrás ver el teléfono, correo y enlace directo de
                  WhatsApp de {clientName}, y la familia recibirá tus datos para
                  coordinar el servicio.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 rounded-[8px] border border-rose-200 bg-rose-50/60 p-3.5 text-sm text-rose-900">
              <XCircle
                className="mt-0.5 h-5 w-5 shrink-0 text-rose-600"
                aria-hidden
              />
              <div>
                <p className="font-semibold">Esta acción no se puede deshacer</p>
                <p className="mt-0.5 text-xs leading-5 text-rose-800">
                  La solicitud pasará a estado rechazado y tus datos de contacto
                  permanecerán ocultos.
                </p>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </ModalDialog>
  );
}
