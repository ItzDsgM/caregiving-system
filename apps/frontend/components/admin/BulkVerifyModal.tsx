'use client';

import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, ShieldAlert, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ModalDialog } from '@/components/ui/ModalDialog';
import { adminApi, ApiError, extractErrorMessage } from '@/lib/api';
import { DOCUMENT_TYPE_LABELS } from '@/lib/constants';
import { formatFullName } from '@/lib/format';
import type { PendingDocumentItem } from '@/lib/types';

export interface BulkVerifyModalProps {
  open: boolean;
  decision: 'APPROVED' | 'REJECTED' | null;
  selectedDocs: PendingDocumentItem[];
  onClose: () => void;
  onSuccess: (verifiedIds: string[], decision: 'APPROVED' | 'REJECTED') => void;
}

interface BulkVerifyFormProps {
  decision: 'APPROVED' | 'REJECTED';
  selectedDocs: PendingDocumentItem[];
  onClose: () => void;
  onSuccess: (verifiedIds: string[], decision: 'APPROVED' | 'REJECTED') => void;
}

function BulkVerifyForm({
  decision,
  selectedDocs,
  onClose,
  onSuccess,
}: Readonly<BulkVerifyFormProps>) {
  const [adminNotes, setAdminNotes] = useState('');
  const [touched, setTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isReject = decision === 'REJECTED';
  const trimmedNotes = adminNotes.trim();
  const isMissingNotes = isReject && trimmedNotes.length === 0;
  const isTooLong = adminNotes.length > 500;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setTouched(true);
    setErrorMessage(null);

    if (isMissingNotes) {
      setErrorMessage(
        'Debes ingresar un motivo obligatorio en notas del auditor para rechazar documentos.',
      );
      return;
    }

    if (isTooLong) {
      setErrorMessage('Las notas del auditor no pueden superar 500 caracteres.');
      return;
    }

    setIsSubmitting(true);
    try {
      const allIds = selectedDocs.map((d) => d.id);
      // Backend @ArrayMaxSize(50) requires chunking large bulk requests cleanly
      for (let i = 0; i < allIds.length; i += 50) {
        const chunkIds = allIds.slice(i, i + 50);
        await adminApi.bulkVerifyDocuments({
          items: chunkIds.map((id) => ({
            id,
            status: decision,
            ...(trimmedNotes ? { adminNotes: trimmedNotes } : {}),
          })),
        });
      }
      onSuccess(allIds, decision);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : extractErrorMessage(undefined, 500);
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div
        className={`flex items-start gap-3 rounded-[10px] border p-3.5 text-xs leading-5 ${
          isReject
            ? 'border-rose-200 bg-rose-50 text-rose-900'
            : 'border-emerald-200 bg-emerald-50 text-emerald-900'
        }`}
      >
        {isReject ? (
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden />
        ) : (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
        )}
        <div>
          <p className="font-semibold">
            {isReject
              ? `Rechazar ${selectedDocs.length} documento(s) seleccionado(s)`
              : `Aprobar ${selectedDocs.length} documento(s) seleccionado(s)`}
          </p>
          <p className="mt-0.5">
            {isReject
              ? 'El backend revocará de inmediato la insignia de verificación (isDocumentVerified = false) si el cuidador pierde alguno de sus documentos obligatorios.'
              : 'Los cuidadores que completen Cédula de Ciudadanía y Antecedentes Judiciales aprobados obtendrán automáticamente la insignia de verificación.'}
          </p>
        </div>
      </div>

      <div className="max-h-40 overflow-y-auto rounded-[10px] border border-slate-200 bg-slate-50 p-2.5">
        <ul className="divide-y divide-slate-200 text-xs">
          {selectedDocs.map((doc) => (
            <li
              key={doc.id}
              className="flex items-center justify-between gap-2 py-1.5 first:pt-0 last:pb-0"
            >
              <span className="truncate font-medium text-slate-900">
                {formatFullName(doc.caregiver.firstName, doc.caregiver.lastName)}
              </span>
              <span className="shrink-0 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700">
                {DOCUMENT_TYPE_LABELS[doc.documentType] ?? doc.documentType}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <div className="flex items-center justify-between gap-2">
          <label
            htmlFor="bulk-verify-notes"
            className="block text-xs font-semibold text-slate-800"
          >
            Notas del auditor {isReject ? '(obligatorio)' : '(opcional)'}
          </label>
          <span
            className={`font-mono text-[11px] tabular-nums ${
              isTooLong ? 'font-semibold text-rose-600' : 'text-slate-500'
            }`}
          >
            {adminNotes.length}/500
          </span>
        </div>
        <textarea
          id="bulk-verify-notes"
          rows={3}
          maxLength={520}
          value={adminNotes}
          onChange={(e) => setAdminNotes(e.target.value)}
          onBlur={() => setTouched(true)}
          aria-invalid={(touched && isMissingNotes) || isTooLong ? 'true' : undefined}
          placeholder={
            isReject
              ? 'Ej: Documentos ilegibles, vencidos o con información inconsistente.'
              : 'Ej: Validación documental aprobada en lote.'
          }
          className="mt-1.5 w-full rounded-[8px] border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
        />
        {touched && isMissingNotes ? (
          <p className="mt-1 text-xs font-medium text-rose-600">
            El motivo es obligatorio cuando se rechazan documentos.
          </p>
        ) : null}
      </div>

      {errorMessage ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-[8px] border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-800"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden />
          <span>{errorMessage}</span>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-slate-200 pt-4">
        <Button
          type="button"
          variant="secondary"
          onClick={onClose}
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          variant={isReject ? 'danger' : 'primary'}
          loading={isSubmitting}
          loadingText="Procesando lote..."
          leftIcon={
            isReject ? (
              <XCircle className="h-4 w-4" aria-hidden />
            ) : (
              <CheckCircle2 className="h-4 w-4" aria-hidden />
            )
          }
        >
          {isReject ? 'Confirmar rechazo masivo' : 'Confirmar aprobación masiva'}
        </Button>
      </div>
    </form>
  );
}

/**
 * Confirmation modal for bulk approving or rejecting selected verification documents.
 */
export function BulkVerifyModal({
  open,
  decision,
  selectedDocs,
  onClose,
  onSuccess,
}: Readonly<BulkVerifyModalProps>) {
  return (
    <ModalDialog
      open={open && decision !== null}
      onClose={onClose}
      title={
        decision === 'REJECTED'
          ? 'Verificación Masiva · Rechazar lote'
          : 'Verificación Masiva · Aprobar lote'
      }
      description="Esta operación aplica el dictamen simultáneamente sobre todos los documentos marcados."
      size="md"
    >
      {open && decision ? (
        <BulkVerifyForm
          decision={decision}
          selectedDocs={selectedDocs}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      ) : null}
    </ModalDialog>
  );
}
