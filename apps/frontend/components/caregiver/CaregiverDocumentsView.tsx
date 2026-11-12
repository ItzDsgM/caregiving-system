'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileCheck2,
  FileText,
  Lock,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UploadCloud,
  X,
  XCircle,
} from 'lucide-react';
import { BadgeVerified } from '@/components/ui/BadgeVerified';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ModalDialog } from '@/components/ui/ModalDialog';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/ToastRegion';
import { ApiError, caregiversApi, extractErrorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_TYPE_OPTIONS,
  REQUIRED_VERIFICATION_DOC_TYPES,
} from '@/lib/constants';
import { formatDate } from '@/lib/format';
import type {
  CaregiverDocument,
  CaregiverProfile,
  DocumentType,
} from '@/lib/types';
import {
  CaregiverErrorBanner,
  CaregiverSectionSkeleton,
} from './CaregiverPortalFeedback';
import {
  getVerificationProgress,
  type RequiredDocChecklistStatus,
} from './caregiverUtils';

const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
]);
const ALLOWED_EXTENSIONS = /\.(pdf|jpe?g|png)$/i;

function validateSelectedFile(file: File): string | null {
  const hasAllowedMime = file.type ? ALLOWED_MIME_TYPES.has(file.type) : false;
  const hasAllowedExt = ALLOWED_EXTENSIONS.test(file.name);
  if (!hasAllowedMime && !hasAllowedExt) {
    return 'Formato no permitido. Solo se aceptan archivos PDF, PNG o JPG.';
  }
  if (file.size > MAX_DOCUMENT_BYTES) {
    return 'El archivo supera el límite máximo de 5 MB.';
  }
  if (file.size === 0) {
    return 'El archivo seleccionado está vacío.';
  }
  return null;
}

function formatFileSizeMb(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  if (mb < 0.1) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${mb.toFixed(2)} MB`;
}

function extractDocumentLabel(fileUrl: string): string {
  const parts = fileUrl.split('/').filter(Boolean);
  return parts[parts.length - 1] || fileUrl;
}

function renderChecklistIcon(status: RequiredDocChecklistStatus) {
  switch (status) {
    case 'APPROVED':
      return (
        <CheckCircle2
          className="h-5 w-5 shrink-0 text-emerald-600"
          aria-hidden
        />
      );
    case 'PENDING':
      return (
        <Clock className="h-5 w-5 shrink-0 text-amber-600" aria-hidden />
      );
    case 'REJECTED':
      return (
        <XCircle className="h-5 w-5 shrink-0 text-rose-600" aria-hidden />
      );
    default:
      return (
        <span
          aria-hidden
          className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-slate-300 bg-white"
        />
      );
  }
}

const CHECKLIST_TEXT_LABEL: Record<RequiredDocChecklistStatus, string> = {
  APPROVED: 'Aprobado',
  PENDING: 'En revisión',
  REJECTED: 'Rechazado — requiere nueva carga',
  MISSING: 'Pendiente por subir',
};

export function CaregiverDocumentsView() {
  const toast = useToast();
  const { user, setUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [profile, setProfile] = useState<CaregiverProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  const [documentType, setDocumentType] = useState<DocumentType>('ID_CARD');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<CaregiverDocument | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const triggerReload = useCallback(() => {
    setIsLoading(true);
    setLoadError(null);
    setReloadTick((prev) => prev + 1);
  }, []);

  const fetchProfileDocs = useCallback(async () => {
    const fresh = await caregiversApi.getMe();
    setProfile(fresh);
    if (user) {
      setUser({ ...user, caregiverProfile: fresh });
    }
    return fresh;
  }, [user, setUser]);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const fetched = await caregiversApi.getMe();
        if (!active) return;
        setProfile(fetched);
        setLoadError(null);
      } catch (err) {
        if (!active) return;
        const msg =
          err instanceof ApiError
            ? err.message || extractErrorMessage(err.rawMessage, err.statusCode)
            : 'No pudimos cargar tus documentos de verificación.';
        setLoadError(msg);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [reloadTick]);

  const verification = useMemo(
    () => getVerificationProgress(profile),
    [profile],
  );

  const sortedDocuments = useMemo(() => {
    const docs = profile?.documents ?? [];
    return [...docs].sort((a, b) =>
      (b.createdAt || '').localeCompare(a.createdAt || ''),
    );
  }, [profile]);

  const handleFilePicked = (file: File | null) => {
    if (!file) return;
    const validationError = validateSelectedFile(file);
    if (validationError) {
      setSelectedFile(null);
      setFileError(validationError);
      return;
    }
    setFileError(null);
    setSelectedFile(file);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    const dropped = event.dataTransfer.files?.[0] ?? null;
    handleFilePicked(dropped);
  };

  const handleUploadSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    if (isUploading) return;

    if (!selectedFile) {
      setFileError('Selecciona o arrastra un archivo PDF, PNG o JPG.');
      return;
    }

    const validationError = validateSelectedFile(selectedFile);
    if (validationError) {
      setFileError(validationError);
      return;
    }

    setIsUploading(true);
    setFileError(null);

    try {
      await caregiversApi.uploadDocument(selectedFile, documentType);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      await fetchProfileDocs();
      toast.success(
        'Documento cargado',
        `${DOCUMENT_TYPE_LABELS[documentType]} quedó en revisión por el equipo de moderación.`,
      );
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message || extractErrorMessage(err.rawMessage, err.statusCode)
          : 'No se pudo subir el documento. Inténtalo nuevamente.';
      setFileError(msg);
      toast.apiError(err, msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget || isDeleting) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      await caregiversApi.deleteDocument(deleteTarget.id);
      const deletedTypeLabel = DOCUMENT_TYPE_LABELS[deleteTarget.documentType];
      setDeleteTarget(null);
      setIsDeleting(false);
      await fetchProfileDocs();
      toast.info(
        'Documento eliminado',
        `Se retiró el archivo de ${deletedTypeLabel}.`,
      );
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message || extractErrorMessage(err.rawMessage, err.statusCode)
          : 'No pudimos eliminar el documento.';
      setDeleteError(msg);
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl">
        <CaregiverSectionSkeleton rows={2} />
      </div>
    );
  }

  if (loadError || !profile) {
    return (
      <div className="mx-auto max-w-5xl">
        <CaregiverErrorBanner
          message={loadError ?? 'No encontramos tu perfil documental.'}
          onRetry={triggerReload}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Documentos y Verificación
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Sube tu cédula y antecedentes judiciales para activar la insignia de
            confianza verificada en tu perfil público.
          </p>
        </div>
        <BadgeVerified
          verified={profile.isDocumentVerified}
          size="md"
          label={
            profile.isDocumentVerified
              ? 'Insignia Activa'
              : 'Verificación Pendiente'
          }
        />
      </div>

      {/* Grid 5/7 (max-w-5xl) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left (5 cols): Checklist & Upload */}
        <div className="space-y-6 lg:col-span-5">
          {/* Checklist Card */}
          <section
            aria-labelledby="docs-checklist-heading"
            className="rounded-[12px] border border-slate-200 bg-white p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                {profile.isDocumentVerified ? (
                  <ShieldCheck
                    className="h-5 w-5 text-emerald-600"
                    aria-hidden
                  />
                ) : (
                  <ShieldAlert
                    className="h-5 w-5 text-amber-600"
                    aria-hidden
                  />
                )}
                <h2
                  id="docs-checklist-heading"
                  className="text-base font-semibold text-slate-900"
                >
                  Requisitos de Verificación
                </h2>
              </div>
              <span className="font-mono text-xs font-semibold text-slate-700 tabular-nums">
                {verification.approvedRequiredCount}/
                {verification.totalRequiredCount}
              </span>
            </div>

            <div className="mt-3">
              <progress
                aria-label="Progreso de requisitos obligatorios"
                value={verification.approvedRequiredCount}
                max={verification.totalRequiredCount}
                className="h-2 w-full overflow-hidden rounded-full"
              />
            </div>

            <ol className="mt-4 space-y-3">
              <li className="flex items-start gap-3 rounded-[8px] border border-slate-200 bg-slate-50/70 p-3">
                {renderChecklistIcon(verification.requiredStatuses.ID_CARD)}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">
                    1. Cédula de Ciudadanía{' '}
                    <span className="font-mono text-[11px] font-normal text-slate-500">
                      (ID_CARD)
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-slate-600">
                    {CHECKLIST_TEXT_LABEL[verification.requiredStatuses.ID_CARD]}
                  </p>
                </div>
              </li>

              <li className="flex items-start gap-3 rounded-[8px] border border-slate-200 bg-slate-50/70 p-3">
                {renderChecklistIcon(
                  verification.requiredStatuses.CRIMINAL_RECORD,
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">
                    2. Antecedentes Judiciales{' '}
                    <span className="font-mono text-[11px] font-normal text-slate-500">
                      (CRIMINAL_RECORD)
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-slate-600">
                    {
                      CHECKLIST_TEXT_LABEL[
                        verification.requiredStatuses.CRIMINAL_RECORD
                      ]
                    }
                  </p>
                </div>
              </li>
            </ol>

            <div className="mt-4 border-t border-slate-100 pt-3">
              <p className="text-xs font-medium text-slate-500">
                Opcionales recomendados:
              </p>
              <ul className="mt-1.5 space-y-1 text-xs text-slate-600">
                <li>
                  • {DOCUMENT_TYPE_LABELS.HEALTH_CERTIFICATE}{' '}
                  <span className="font-mono text-[11px] text-slate-400">
                    (HEALTH_CERTIFICATE)
                  </span>
                </li>
                <li>
                  • {DOCUMENT_TYPE_LABELS.ACADEMIC_DEGREE}{' '}
                  <span className="font-mono text-[11px] text-slate-400">
                    (ACADEMIC_DEGREE)
                  </span>
                </li>
              </ul>
            </div>
          </section>

          {/* Upload Form Card */}
          <section
            aria-labelledby="docs-upload-heading"
            className="rounded-[12px] border border-slate-200 bg-white p-5"
          >
            <h2
              id="docs-upload-heading"
              className="text-base font-semibold text-slate-900"
            >
              Subir Nuevo Documento
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Formatos aceptados: PDF, PNG o JPG hasta 5 MB.
            </p>

            <form onSubmit={handleUploadSubmit} className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="documentTypeSelect"
                  className="block text-sm font-medium text-slate-800"
                >
                  Tipo de documento
                </label>
                <select
                  id="documentTypeSelect"
                  value={documentType}
                  onChange={(e) =>
                    setDocumentType(e.target.value as DocumentType)
                  }
                  disabled={isUploading}
                  className="mt-1.5 w-full rounded-[8px] border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
                >
                  {DOCUMENT_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}{' '}
                      {opt.requiredForBadge ? '(Obligatorio)' : '(Opcional)'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <span className="block text-sm font-medium text-slate-800">
                  Archivo
                </span>
                <input
                  ref={fileInputRef}
                  id="documentFileInput"
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                  onChange={(e) =>
                    handleFilePicked(e.target.files?.[0] ?? null)
                  }
                  className="sr-only"
                />

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (!isUploading) setIsDragging(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                  }}
                  onDrop={handleDrop}
                  className={`mt-1.5 flex flex-col items-center justify-center rounded-[12px] border-2 border-dashed px-4 py-6 text-center transition-colors ${
                    isDragging
                      ? 'border-teal-600 bg-teal-50/70'
                      : fileError
                        ? 'border-rose-300 bg-rose-50/40'
                        : 'border-slate-300 bg-slate-50/60 hover:border-teal-400 hover:bg-teal-50/30'
                  }`}
                >
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-teal-50 text-teal-700">
                    <UploadCloud className="h-5 w-5" aria-hidden />
                  </span>
                  <p className="mt-3 text-sm font-medium text-slate-800">
                    Arrastra y suelta tu documento aquí
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    PDF, PNG o JPG · Máximo 5 MB
                  </p>
                  <div className="mt-3">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={isUploading}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Elegir archivo del equipo
                    </Button>
                  </div>
                </div>
              </div>

              {selectedFile ? (
                <div className="flex items-center justify-between gap-2 rounded-[8px] border border-teal-200 bg-teal-50/60 px-3 py-2.5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <FileText
                      className="h-4 w-4 shrink-0 text-teal-700"
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-slate-900">
                        {selectedFile.name}
                      </p>
                      <p className="font-mono text-[11px] text-slate-600 tabular-nums">
                        {formatFileSizeMb(selectedFile.size)}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    aria-label="Quitar archivo seleccionado"
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] text-slate-500 hover:bg-teal-100 hover:text-slate-900 cursor-pointer"
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              ) : null}

              {fileError ? (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-[8px] border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-800"
                >
                  <AlertCircle
                    className="mt-0.5 h-4 w-4 shrink-0 text-rose-600"
                    aria-hidden
                  />
                  <span>{fileError}</span>
                </div>
              ) : null}

              {isUploading ? (
                <div className="space-y-1.5 rounded-[8px] border border-teal-200 bg-teal-50/50 p-3">
                  <div className="flex items-center justify-between text-xs font-medium text-teal-900">
                    <span>Subiendo archivo de forma segura...</span>
                    <span className="font-mono tabular-nums">En curso</span>
                  </div>
                  <progress
                    aria-label="Subiendo documento"
                    className="h-2 w-full overflow-hidden rounded-full"
                  />
                </div>
              ) : null}

              <Button
                type="submit"
                variant="primary"
                fullWidth
                loading={isUploading}
                loadingText="Subiendo documento..."
                disabled={!selectedFile}
                leftIcon={<UploadCloud className="h-4 w-4" aria-hidden />}
              >
                Subir Documento
              </Button>
            </form>
          </section>
        </div>

        {/* Right (7 cols): Document Status Cards */}
        <section
          aria-labelledby="docs-list-heading"
          className="space-y-4 lg:col-span-7"
        >
          <div className="flex items-center justify-between gap-2 rounded-[12px] border border-slate-200 bg-white px-5 py-4">
            <div className="flex items-center gap-2.5">
              <FileCheck2 className="h-5 w-5 text-teal-600" aria-hidden />
              <div>
                <h2
                  id="docs-list-heading"
                  className="text-base font-semibold text-slate-900"
                >
                  Documentos Cargados
                </h2>
                <p className="text-xs text-slate-500">
                  Solo puedes eliminar documentos en estado En revisión o
                  Rechazado.
                </p>
              </div>
            </div>
            <span className="font-mono text-sm font-semibold text-slate-700 tabular-nums">
              {sortedDocuments.length}
            </span>
          </div>

          {sortedDocuments.length === 0 ? (
            <EmptyState
              title="Aún no has subido documentos"
              description="Carga tu Cédula de Ciudadanía y tu Certificado de Antecedentes Judiciales desde el panel izquierdo para iniciar la verificación."
            />
          ) : (
            <div className="space-y-4">
              {sortedDocuments.map((doc) => {
                const isRequired = REQUIRED_VERIFICATION_DOC_TYPES.includes(
                  doc.documentType,
                );
                const canDelete =
                  doc.verificationStatus === 'PENDING' ||
                  doc.verificationStatus === 'REJECTED';
                const filename = extractDocumentLabel(doc.fileUrl);

                return (
                  <article
                    key={doc.id}
                    className={`rounded-[12px] border bg-white p-5 transition-colors ${
                      doc.verificationStatus === 'REJECTED'
                        ? 'border-rose-300'
                        : doc.verificationStatus === 'APPROVED'
                          ? 'border-emerald-200'
                          : 'border-slate-200'
                    }`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-slate-900">
                            {DOCUMENT_TYPE_LABELS[doc.documentType]}
                          </h3>
                          {isRequired ? (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                              Obligatorio
                            </span>
                          ) : (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                              Opcional
                            </span>
                          )}
                        </div>

                        <p className="truncate font-mono text-xs text-slate-700">
                          {filename}
                        </p>
                        <p className="text-xs text-slate-500">
                          Cargado el {formatDate(doc.createdAt, true)}
                        </p>
                      </div>

                      <div className="flex shrink-0 flex-wrap items-center gap-2.5">
                        <StatusBadge
                          status={doc.verificationStatus}
                          domain="verification"
                          size="md"
                        />

                        {canDelete ? (
                          <Button
                            variant="danger-outline"
                            size="sm"
                            onClick={() => {
                              setDeleteError(null);
                              setDeleteTarget(doc);
                            }}
                            leftIcon={
                              <Trash2 className="h-3.5 w-3.5" aria-hidden />
                            }
                          >
                            Eliminar
                          </Button>
                        ) : (
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled
                            title="Los documentos aprobados no pueden eliminarse"
                            leftIcon={
                              <Lock className="h-3.5 w-3.5" aria-hidden />
                            }
                          >
                            Eliminar
                          </Button>
                        )}
                      </div>
                    </div>

                    {doc.verificationStatus === 'REJECTED' ? (
                      <div
                        role="alert"
                        className="mt-4 flex items-start gap-2.5 rounded-[8px] border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-900"
                      >
                        <AlertTriangle
                          className="mt-0.5 h-4 w-4 shrink-0 text-rose-600"
                          aria-hidden
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold uppercase tracking-wide text-rose-800">
                            Motivo del rechazo (moderación)
                          </p>
                          <p className="mt-1 text-sm leading-5 text-rose-900">
                            {doc.adminNotes?.trim()
                              ? doc.adminNotes
                              : 'El documento no pudo validarse. Elimínalo y sube una nueva copia legible.'}
                          </p>
                        </div>
                      </div>
                    ) : doc.adminNotes?.trim() ? (
                      <div className="mt-4 rounded-[8px] border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-700">
                        <span className="font-semibold text-slate-800">
                          Nota de moderación:{' '}
                        </span>
                        {doc.adminNotes}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Delete Confirmation Modal */}
      <ModalDialog
        open={Boolean(deleteTarget)}
        onClose={() => {
          if (!isDeleting) {
            setDeleteError(null);
            setDeleteTarget(null);
          }
        }}
        size="sm"
        title="¿Eliminar documento?"
        description={
          deleteTarget
            ? `${DOCUMENT_TYPE_LABELS[deleteTarget.documentType]} · ${extractDocumentLabel(deleteTarget.fileUrl)}`
            : undefined
        }
        closeOnBackdropClick={!isDeleting}
        closeOnEscape={!isDeleting}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setDeleteError(null);
                setDeleteTarget(null);
              }}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              loading={isDeleting}
              loadingText="Eliminando..."
              onClick={handleConfirmDelete}
            >
              Confirmar eliminación
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {deleteError ? (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-[8px] border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"
            >
              <AlertCircle
                className="mt-0.5 h-4 w-4 shrink-0 text-rose-600"
                aria-hidden
              />
              <span>{deleteError}</span>
            </div>
          ) : null}
          <p className="text-sm leading-6 text-slate-600">
            Esta acción retirará permanentemente el archivo de tu expediente.
            Si se trata de un documento obligatorio para la insignia, recuerda
            subir uno nuevo.
          </p>
        </div>
      </ModalDialog>
    </div>
  );
}
