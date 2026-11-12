'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  BadgeCheck,
  CheckCircle2,
  Clock,
  FileCheck2,
  MapPin,
  RefreshCw,
  Search,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import { BulkVerifyModal } from '@/components/admin/BulkVerifyModal';
import { DocumentPreviewPane } from '@/components/admin/DocumentPreviewPane';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/ToastRegion';
import { adminApi, ApiError } from '@/lib/api';
import {
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_TYPE_OPTIONS,
  REQUIRED_VERIFICATION_DOC_TYPES,
} from '@/lib/constants';
import { formatDate, formatFullName, formatRelativeTime } from '@/lib/format';
import type { DocumentType, PendingDocumentItem } from '@/lib/types';

function DocumentsQueueSkeleton() {
  return (
    <div
      className="grid grid-cols-1 gap-4 lg:h-[calc(100dvh-9.5rem)] lg:grid-cols-12 animate-pulse"
      aria-busy="true"
    >
      <div className="h-[420px] rounded-[12px] border border-slate-200 bg-white lg:col-span-5 lg:h-full" />
      <div className="h-[520px] rounded-[12px] border border-slate-200 bg-white lg:col-span-7 lg:h-full" />
    </div>
  );
}

/**
 * F2 Document Verification Queue (Persona / Stripe Identity Master-Detail Split).
 */
export function AdminDocumentsView() {
  const toast = useToast();
  const notesInputRef = useRef<HTMLTextAreaElement | null>(null);

  const [docs, setDocs] = useState<PendingDocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [docTypeFilter, setDocTypeFilter] = useState<'ALL' | DocumentType>('ALL');
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  const [adminNotes, setAdminNotes] = useState('');
  const [notesTouched, setNotesTouched] = useState(false);
  const [notesError, setNotesError] = useState<string | null>(null);
  const [isSubmittingSingle, setIsSubmittingSingle] = useState<
    'APPROVED' | 'REJECTED' | null
  >(null);

  const [bulkModalDecision, setBulkModalDecision] = useState<
    'APPROVED' | 'REJECTED' | null
  >(null);

  const fetchPending = useCallback(async () => {
    const list = await adminApi.getPendingDocuments();
    return Array.isArray(list) ? list : [];
  }, []);

  useEffect(() => {
    let active = true;

    fetchPending()
      .then((list) => {
        if (!active) return;
        setDocs(list);
        setActiveDocId((prev) =>
          prev && list.some((d) => d.id === prev) ? prev : (list[0]?.id ?? null),
        );
        setLoadError(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        const msg =
          err instanceof ApiError
            ? err.message
            : 'No pudimos cargar la cola de documentos pendientes.';
        setLoadError(msg);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [fetchPending]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setLoadError(null);
    try {
      const list = await fetchPending();
      setDocs(list);
      setSelectedIds((prev) => {
        const next = new Set<string>();
        for (const doc of list) {
          if (prev.has(doc.id)) next.add(doc.id);
        }
        return next;
      });
      setActiveDocId((prev) =>
        prev && list.some((d) => d.id === prev) ? prev : (list[0]?.id ?? null),
      );
    } catch (err: unknown) {
      toast.apiError(err, 'No pudimos actualizar la cola documental.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const filteredDocs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return docs.filter((doc) => {
      if (docTypeFilter !== 'ALL' && doc.documentType !== docTypeFilter) {
        return false;
      }
      if (!q) return true;
      const fullName = formatFullName(
        doc.caregiver.firstName,
        doc.caregiver.lastName,
      ).toLowerCase();
      const email = (doc.caregiver.email || '').toLowerCase();
      const city = (doc.caregiver.city || '').toLowerCase();
      const typeLabel = (
        DOCUMENT_TYPE_LABELS[doc.documentType] ?? doc.documentType
      ).toLowerCase();
      return (
        fullName.includes(q) ||
        email.includes(q) ||
        city.includes(q) ||
        typeLabel.includes(q) ||
        doc.id.toLowerCase().includes(q)
      );
    });
  }, [docs, searchQuery, docTypeFilter]);

  const activeDoc = useMemo(() => {
    if (filteredDocs.length === 0) return docs.find((d) => d.id === activeDocId) ?? null;
    return (
      filteredDocs.find((d) => d.id === activeDocId) ?? filteredDocs[0] ?? null
    );
  }, [docs, filteredDocs, activeDocId]);

  const caregiverPendingDocs = useMemo(() => {
    if (!activeDoc) return [];
    return docs.filter(
      (d) => d.caregiverProfileId === activeDoc.caregiverProfileId,
    );
  }, [docs, activeDoc]);

  const selectedDocsList = useMemo(
    () => docs.filter((d) => selectedIds.has(d.id)),
    [docs, selectedIds],
  );

  const allFilteredSelected =
    filteredDocs.length > 0 &&
    filteredDocs.every((doc) => selectedIds.has(doc.id));

  const handleSelectDoc = (docId: string) => {
    setActiveDocId(docId);
    setAdminNotes('');
    setNotesTouched(false);
    setNotesError(null);
  };

  const toggleItemSelection = (docId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) {
        next.delete(docId);
      } else {
        next.add(docId);
      }
      return next;
    });
  };

  const toggleSelectAllFiltered = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        for (const doc of filteredDocs) {
          next.delete(doc.id);
        }
      } else {
        for (const doc of filteredDocs) {
          next.add(doc.id);
        }
      }
      return next;
    });
  };

  const removeProcessedIds = (processedIds: string[]) => {
    const processedSet = new Set(processedIds);
    const remaining = docs.filter((d) => !processedSet.has(d.id));
    setDocs(remaining);
    setSelectedIds((prev) => {
      const next = new Set<string>();
      for (const id of prev) {
        if (!processedSet.has(id)) next.add(id);
      }
      return next;
    });
    setActiveDocId((prev) => {
      if (prev && !processedSet.has(prev)) return prev;
      return remaining[0]?.id ?? null;
    });
    setAdminNotes('');
    setNotesTouched(false);
    setNotesError(null);
  };

  const handleSingleDecision = async (decision: 'APPROVED' | 'REJECTED') => {
    if (!activeDoc) return;
    setNotesTouched(true);
    setNotesError(null);

    const trimmed = adminNotes.trim();
    if (decision === 'REJECTED' && trimmed.length === 0) {
      setNotesError(
        'Debes ingresar el motivo del rechazo en las notas del auditor.',
      );
      notesInputRef.current?.focus();
      return;
    }

    if (adminNotes.length > 500) {
      setNotesError('Las notas no pueden exceder 500 caracteres.');
      notesInputRef.current?.focus();
      return;
    }

    setIsSubmittingSingle(decision);
    try {
      await adminApi.verifyDocument(activeDoc.id, {
        status: decision,
        ...(trimmed ? { adminNotes: trimmed } : {}),
      });

      const docLabel =
        DOCUMENT_TYPE_LABELS[activeDoc.documentType] ?? activeDoc.documentType;
      const caregiverName = formatFullName(
        activeDoc.caregiver.firstName,
        activeDoc.caregiver.lastName,
      );

      removeProcessedIds([activeDoc.id]);

      if (decision === 'APPROVED') {
        toast.success(
          'Documento aprobado',
          `${docLabel} de ${caregiverName} fue aprobado correctamente.`,
        );
      } else {
        toast.info(
          'Documento rechazado',
          `${docLabel} de ${caregiverName} fue rechazado y notificado en el perfil.`,
        );
      }
    } catch (err: unknown) {
      toast.apiError(err, 'No pudimos registrar el dictamen del documento.');
    } finally {
      setIsSubmittingSingle(null);
    }
  };

  const handleBulkSuccess = (
    verifiedIds: string[],
    decision: 'APPROVED' | 'REJECTED',
  ) => {
    setBulkModalDecision(null);
    removeProcessedIds(verifiedIds);
    toast.success(
      decision === 'APPROVED'
        ? 'Lote documental aprobado'
        : 'Lote documental rechazado',
      `Se procesaron ${verifiedIds.length} documento(s) correctamente.`,
    );
  };

  if (isLoading) {
    return <DocumentsQueueSkeleton />;
  }

  if (loadError && docs.length === 0) {
    return (
      <EmptyState
        icon={<AlertCircle className="h-6 w-6 text-rose-600" aria-hidden />}
        title="No pudimos cargar la cola documental"
        description={loadError}
        action={
          <Button onClick={handleRefresh} loading={isRefreshing}>
            Reintentar
          </Button>
        }
      />
    );
  }

  const isMandatoryForBadge = activeDoc
    ? REQUIRED_VERIFICATION_DOC_TYPES.includes(activeDoc.documentType)
    : false;

  return (
    <div className="space-y-3">
      {/* Compact Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Cola de Moderación Documental
          </h1>
          <p className="text-xs text-slate-600 sm:text-sm">
            Audita cédulas, antecedentes y certificados de cuidadores con
            verificación individual o masiva.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 font-mono text-xs font-semibold text-amber-800 tabular-nums">
            {docs.length} pendiente{docs.length === 1 ? '' : 's'}
          </span>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleRefresh}
            loading={isRefreshing}
            leftIcon={<RefreshCw className="h-3.5 w-3.5" aria-hidden />}
          >
            Actualizar
          </Button>
        </div>
      </div>

      {/* Master-Detail Split */}
      {docs.length === 0 ? (
        <EmptyState
          icon={<FileCheck2 className="h-6 w-6 text-emerald-600" aria-hidden />}
          title="No hay documentos pendientes por moderar"
          description="Todos los archivos cargados por los cuidadores han sido dictaminados."
          action={
            <Button
              type="button"
              variant="secondary"
              onClick={handleRefresh}
              loading={isRefreshing}
              leftIcon={<RefreshCw className="h-4 w-4" aria-hidden />}
            >
              Verificar nuevos envíos
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:h-[calc(100dvh-11.5rem)] lg:min-h-[560px] lg:grid-cols-12">
          {/* Left Panel (5 cols ~ 38-42%): Queue + Bulk Bar */}
          <section
            aria-label="Lista de documentos pendientes"
            className="flex min-h-[380px] flex-col overflow-hidden rounded-[12px] border border-slate-200 bg-white shadow-2xs lg:col-span-5 lg:min-h-0"
          >
            {/* Queue Search & Filter */}
            <div className="space-y-2.5 border-b border-slate-200 p-3.5">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden
                />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por cuidador, correo, ciudad o tipo..."
                  aria-label="Buscar en cola de documentos"
                  className="h-9 w-full rounded-[8px] border border-slate-200 bg-slate-50 pr-3 pl-9 text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleSelectAllFiltered}
                    disabled={filteredDocs.length === 0}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  <span>
                    Seleccionar visibles (
                    <span className="font-mono tabular-nums">
                      {filteredDocs.length}
                    </span>
                    )
                  </span>
                </label>

                <select
                  value={docTypeFilter}
                  onChange={(e) =>
                    setDocTypeFilter(e.target.value as 'ALL' | DocumentType)
                  }
                  aria-label="Filtrar por tipo documental"
                  className="h-8 rounded-[8px] border border-slate-200 bg-white px-2 text-xs text-slate-700 focus:border-teal-600 focus:outline-none"
                >
                  <option value="ALL">Todos los tipos</option>
                  {DOCUMENT_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Queue Items */}
            <div className="flex-1 divide-y divide-slate-100 overflow-y-auto">
              {filteredDocs.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  Ningún documento pendiente coincide con tu filtro actual.
                </div>
              ) : (
                filteredDocs.map((doc) => {
                  const isActive = activeDoc?.id === doc.id;
                  const isChecked = selectedIds.has(doc.id);
                  const caregiverName = formatFullName(
                    doc.caregiver.firstName,
                    doc.caregiver.lastName,
                  );
                  const typeLabel =
                    DOCUMENT_TYPE_LABELS[doc.documentType] ?? doc.documentType;
                  const isRequiredBadge =
                    REQUIRED_VERIFICATION_DOC_TYPES.includes(doc.documentType);

                  return (
                    <div
                      key={doc.id}
                      className={`cc-virtual-item flex items-start gap-2.5 px-3.5 py-3 transition-colors ${
                        isActive
                          ? 'border-l-[3px] border-l-teal-600 bg-teal-50/50'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleItemSelection(doc.id)}
                        aria-label={`Seleccionar ${typeLabel} de ${caregiverName}`}
                        className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 cursor-pointer"
                      />

                      <button
                        type="button"
                        onClick={() => handleSelectDoc(doc.id)}
                        className="min-w-0 flex-1 text-left cursor-pointer focus-visible:outline-none"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="truncate text-sm font-semibold text-slate-900">
                            {caregiverName}
                          </span>
                          <span
                            title={formatDate(doc.createdAt, true)}
                            className="inline-flex shrink-0 items-center gap-1 font-mono text-[11px] text-slate-500 tabular-nums"
                          >
                            <Clock className="h-3 w-3" aria-hidden />
                            {formatRelativeTime(doc.createdAt)}
                          </span>
                        </div>

                        <p className="mt-1 truncate text-xs font-medium text-teal-800">
                          {typeLabel}
                        </p>

                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3" aria-hidden />
                            {doc.caregiver.city || 'Sin ciudad'}
                          </span>
                          {isRequiredBadge ? (
                            <span className="rounded-full border border-teal-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-teal-700">
                              Requerido insignia
                            </span>
                          ) : null}
                        </div>
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bulk Action Bar */}
            {selectedIds.size > 0 ? (
              <div className="border-t border-teal-200 bg-teal-50/95 px-3.5 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-teal-950">
                      Verificación Masiva
                    </p>
                    <p className="font-mono text-[11px] text-teal-800 tabular-nums">
                      {selectedIds.size} seleccionado
                      {selectedIds.size === 1 ? '' : 's'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedIds(new Set())}
                    >
                      Limpiar
                    </Button>
                    <Button
                      type="button"
                      variant="danger-outline"
                      size="sm"
                      onClick={() => setBulkModalDecision('REJECTED')}
                    >
                      Rechazar seleccionados
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => setBulkModalDecision('APPROVED')}
                    >
                      Aprobar seleccionados
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}
          </section>

          {/* Right Panel (7 cols ~ 62%): Inspector + Preview + Fixed Decision Footer */}
          <section
            aria-label="Inspector documental"
            className="flex min-h-[540px] flex-col overflow-hidden rounded-[12px] border border-slate-200 bg-white shadow-2xs lg:col-span-7 lg:min-h-0"
          >
            {activeDoc ? (
              <>
                {/* Inspector Header & Verification Context */}
                <div className="space-y-3 border-b border-slate-200 px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-bold text-slate-900">
                          {formatFullName(
                            activeDoc.caregiver.firstName,
                            activeDoc.caregiver.lastName,
                          )}
                        </h2>
                        <StatusBadge
                          status={activeDoc.verificationStatus}
                          domain="verification"
                        />
                      </div>
                      <p className="mt-0.5 text-xs text-slate-600">
                        {activeDoc.caregiver.email} ·{' '}
                        {activeDoc.caregiver.city || 'Ciudad no especificada'}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-xs font-semibold text-slate-900">
                        {DOCUMENT_TYPE_LABELS[activeDoc.documentType] ??
                          activeDoc.documentType}
                      </p>
                      <p className="font-mono text-[11px] text-slate-500 tabular-nums">
                        Cargado: {formatDate(activeDoc.createdAt, true)}
                      </p>
                    </div>
                  </div>

                  {/* Verification Rule & Sibling Pending Context */}
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-[8px] border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                    <div className="flex items-center gap-2 text-slate-700">
                      <BadgeCheck
                        className={`h-4 w-4 shrink-0 ${
                          isMandatoryForBadge
                            ? 'text-teal-600'
                            : 'text-slate-500'
                        }`}
                        aria-hidden
                      />
                      <span>
                        {isMandatoryForBadge
                          ? 'Obligatorio para insignia: se activa automáticamente al tener Cédula y Antecedentes aprobados.'
                          : 'Documento complementario de soporte profesional.'}
                      </span>
                    </div>

                    {caregiverPendingDocs.length > 1 ? (
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="font-mono text-[11px] text-slate-500">
                          En cola ({caregiverPendingDocs.length}):
                        </span>
                        {caregiverPendingDocs.map((sib) => (
                          <button
                            key={sib.id}
                            type="button"
                            onClick={() => handleSelectDoc(sib.id)}
                            className={`rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors cursor-pointer ${
                              sib.id === activeDoc.id
                                ? 'bg-teal-600 text-white'
                                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {sib.documentType === 'ID_CARD'
                              ? 'Cédula'
                              : sib.documentType === 'CRIMINAL_RECORD'
                                ? 'Antecedentes'
                                : sib.documentType === 'HEALTH_CERTIFICATE'
                                  ? 'Salud'
                                  : 'Título'}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Viewer */}
                <div className="flex flex-1 flex-col overflow-hidden p-4">
                  <DocumentPreviewPane doc={activeDoc} />
                </div>

                {/* Fixed Decision Footer */}
                <div className="border-t border-slate-200 bg-slate-50/80 px-5 py-4">
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <label
                          htmlFor="single-admin-notes"
                          className="text-xs font-semibold text-slate-800"
                        >
                          Notas del auditor{' '}
                          <span className="font-normal text-slate-500">
                            (opcional al aprobar · obligatorio al rechazar)
                          </span>
                        </label>
                        <span
                          className={`font-mono text-[11px] tabular-nums ${
                            adminNotes.length > 500
                              ? 'font-semibold text-rose-600'
                              : 'text-slate-500'
                          }`}
                        >
                          {adminNotes.length}/500
                        </span>
                      </div>

                      <textarea
                        ref={notesInputRef}
                        id="single-admin-notes"
                        rows={2}
                        maxLength={520}
                        value={adminNotes}
                        onChange={(e) => {
                          setAdminNotes(e.target.value);
                          if (notesError && e.target.value.trim().length > 0) {
                            setNotesError(null);
                          }
                        }}
                        onBlur={() => setNotesTouched(true)}
                        aria-invalid={
                          notesError ||
                          (notesTouched && adminNotes.length > 500)
                            ? 'true'
                            : undefined
                        }
                        placeholder="Ej: Documento legible y vigente / Motivo específico si se rechaza..."
                        className="mt-1.5 w-full rounded-[8px] border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
                      />

                      {notesError ? (
                        <p className="mt-1 text-xs font-medium text-rose-600">
                          {notesError}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                      <p className="flex items-center gap-1.5 text-[11px] text-slate-600">
                        <ShieldAlert
                          className="h-3.5 w-3.5 shrink-0 text-amber-600"
                          aria-hidden
                        />
                        <span>
                          Rechazar revoca de inmediato{' '}
                          <code className="font-mono">isDocumentVerified</code>{' '}
                          si aplica.
                        </span>
                      </p>

                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <Button
                          type="button"
                          variant="danger-outline"
                          disabled={isSubmittingSingle !== null}
                          loading={isSubmittingSingle === 'REJECTED'}
                          loadingText="Rechazando..."
                          onClick={() => handleSingleDecision('REJECTED')}
                          leftIcon={<XCircle className="h-4 w-4" aria-hidden />}
                        >
                          Rechazar
                        </Button>
                        <Button
                          type="button"
                          variant="primary"
                          disabled={isSubmittingSingle !== null}
                          loading={isSubmittingSingle === 'APPROVED'}
                          loadingText="Aprobando..."
                          onClick={() => handleSingleDecision('APPROVED')}
                          leftIcon={
                            <CheckCircle2 className="h-4 w-4" aria-hidden />
                          }
                        >
                          Aprobar
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center p-6">
                <EmptyState
                  compact
                  title="Selecciona un documento"
                  description="Elige un elemento de la cola izquierda para previsualizar el archivo y emitir un dictamen."
                />
              </div>
            )}
          </section>
        </div>
      )}

      <BulkVerifyModal
        open={bulkModalDecision !== null}
        decision={bulkModalDecision}
        selectedDocs={selectedDocsList}
        onClose={() => setBulkModalDecision(null)}
        onSuccess={handleBulkSuccess}
      />
    </div>
  );
}
