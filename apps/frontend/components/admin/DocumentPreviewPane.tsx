'use client';

import React, { useEffect, useState } from 'react';
import {
  ExternalLink,
  FileText,
  FileWarning,
  Loader2,
  RotateCw,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { DOCUMENT_TYPE_LABELS } from '@/lib/constants';
import {
  formatDate,
  isImageDocumentUrl,
  isPdfDocumentUrl,
  resolveDocumentUrl,
} from '@/lib/format';
import type { PendingDocumentItem } from '@/lib/types';

export interface DocumentPreviewPaneProps {
  doc: PendingDocumentItem;
}

type PreviewStatus = 'loading' | 'ready' | 'unavailable';

interface DocumentPreviewInnerProps {
  doc: PendingDocumentItem;
  onRetry: () => void;
}

function DocumentPreviewInner({
  doc,
  onRetry,
}: Readonly<DocumentPreviewInnerProps>) {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);

  const resolvedUrl = resolveDocumentUrl(doc.fileUrl);
  const isImage = isImageDocumentUrl(doc.fileUrl);
  const isPdf = isPdfDocumentUrl(doc.fileUrl);

  const [status, setStatus] = useState<PreviewStatus>(() => {
    if (!resolvedUrl || (!isImage && !isPdf)) return 'unavailable';
    return 'loading';
  });

  useEffect(() => {
    if (!resolvedUrl || !isPdf) {
      return;
    }

    // For PDFs, verify availability via HEAD so iframes don't render raw 404 JSON envelopes.
    let active = true;
    const controller = new AbortController();

    fetch(resolvedUrl, { method: 'HEAD', signal: controller.signal })
      .then((res) => {
        if (!active) return;
        const contentType = res.headers.get('content-type') || '';
        if (!res.ok || contentType.includes('application/json')) {
          setStatus('unavailable');
          return;
        }
        setStatus('ready');
      })
      .catch(() => {
        if (!active) return;
        setStatus('unavailable');
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [resolvedUrl, isPdf]);

  const handleZoomOut = () => setZoom((z) => Math.max(50, z - 25));
  const handleZoomReset = () => setZoom(100);
  const handleZoomIn = () => setZoom((z) => Math.min(250, z + 25));
  const handleRotate = () => setRotation((r) => (r + 90) % 360);

  const docTypeLabel =
    DOCUMENT_TYPE_LABELS[doc.documentType] ?? doc.documentType;

  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-[12px] border border-slate-200 bg-slate-50">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-2">
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleZoomOut}
            disabled={zoom <= 50 || status !== 'ready'}
            aria-label="Alejar documento"
          >
            <ZoomOut className="h-3.5 w-3.5" aria-hidden />
          </Button>
          <button
            type="button"
            onClick={handleZoomReset}
            disabled={status !== 'ready'}
            className="inline-flex h-8 min-w-[54px] items-center justify-center rounded-[8px] border border-slate-200 bg-white px-2 font-mono text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 tabular-nums cursor-pointer"
            title="Restablecer zoom al 100%"
          >
            {zoom}%
          </button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleZoomIn}
            disabled={zoom >= 250 || status !== 'ready'}
            aria-label="Acercar documento"
          >
            <ZoomIn className="h-3.5 w-3.5" aria-hidden />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleRotate}
            disabled={status !== 'ready'}
            aria-label="Rotar documento 90 grados"
          >
            <RotateCw className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden font-mono text-xs sm:inline tabular-nums">
              {rotation}°
            </span>
          </Button>
        </div>

        {resolvedUrl ? (
          <a
            href={resolvedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-[8px] border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-teal-700 transition-colors hover:bg-teal-50"
          >
            <span>Abrir original</span>
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>
        ) : null}
      </div>

      {/* Canvas */}
      <div className="relative flex min-h-[240px] flex-1 items-center justify-center overflow-auto p-4">
        {status === 'loading' ? (
          <div className="flex items-center gap-2 rounded-[8px] border border-slate-200 bg-white px-4 py-2.5 text-xs font-medium text-slate-600 shadow-2xs">
            <Loader2 className="h-4 w-4 animate-spin text-teal-600" aria-hidden />
            <span>Cargando vista previa...</span>
          </div>
        ) : null}

        {isImage && resolvedUrl && status !== 'unavailable' ? (
          <div
            className={`transition-transform duration-150 ${
              status === 'loading' ? 'hidden' : 'flex items-center justify-center'
            }`}
            style={{
              transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
              transformOrigin: 'center center',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- Arbitrary dynamic upload preview with CSS zoom/rotate */}
            <img
              src={resolvedUrl}
              alt={`${docTypeLabel} de ${doc.caregiver.firstName} ${doc.caregiver.lastName}`}
              onLoad={() => setStatus('ready')}
              onError={() => setStatus('unavailable')}
              className="max-h-[420px] max-w-full rounded-[8px] border border-slate-200 bg-white object-contain shadow-xs"
            />
          </div>
        ) : null}

        {isPdf && resolvedUrl && status === 'ready' ? (
          <div
            className="h-full min-h-[320px] w-full overflow-hidden rounded-[8px] border border-slate-200 bg-white transition-transform duration-150"
            style={{
              transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
              transformOrigin: 'center center',
            }}
          >
            <iframe
              src={resolvedUrl}
              title={`${docTypeLabel} - Vista PDF`}
              className="h-full min-h-[320px] w-full border-0"
            />
          </div>
        ) : null}

        {status === 'unavailable' ? (
          <div className="w-full max-w-md rounded-[12px] border border-slate-200 bg-white p-5 text-left shadow-xs">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                <FileWarning className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <h4 className="text-sm font-semibold text-slate-900">
                  Vista previa directa no disponible
                </h4>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  El archivo registrado no pudo renderizarse en el navegador (el
                  servidor API puede no exponer estáticos bajo{' '}
                  <code className="font-mono text-[11px] text-slate-800">
                    /uploads/documents/*
                  </code>{' '}
                  o el formato requiere descarga externa).
                </p>
              </div>
            </div>

            <dl className="mt-4 space-y-2 rounded-[8px] border border-slate-200 bg-slate-50 p-3 text-xs">
              <div className="flex items-center justify-between gap-2">
                <dt className="font-medium text-slate-500">Tipo documental</dt>
                <dd className="font-semibold text-slate-900">{docTypeLabel}</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="font-medium text-slate-500">Ruta archivo</dt>
                <dd className="max-w-[230px] truncate font-mono text-[11px] text-slate-700">
                  {doc.fileUrl}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="font-medium text-slate-500">ID Documento</dt>
                <dd className="max-w-[230px] truncate font-mono text-[11px] text-slate-700 tabular-nums">
                  {doc.id}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="font-medium text-slate-500">Fecha de carga</dt>
                <dd className="font-mono text-[11px] text-slate-700 tabular-nums">
                  {formatDate(doc.createdAt, true)}
                </dd>
              </div>
            </dl>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onRetry}
              >
                Reintentar vista
              </Button>
              {resolvedUrl ? (
                <a
                  href={resolvedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-700 hover:underline"
                >
                  <FileText className="h-3.5 w-3.5" aria-hidden />
                  <span>Abrir enlace de archivo</span>
                  <ExternalLink className="h-3 w-3" aria-hidden />
                </a>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Interactive document viewer with Zoom/Rotation controls and graceful 404/unavailable fallback
 * when backend static file serving for `/uploads/documents/*` is not enabled.
 */
export function DocumentPreviewPane({
  doc,
}: Readonly<DocumentPreviewPaneProps>) {
  const [retrySeed, setRetrySeed] = useState(0);

  return (
    <DocumentPreviewInner
      key={`${doc.id}-${retrySeed}`}
      doc={doc}
      onRetry={() => setRetrySeed((prev) => prev + 1)}
    />
  );
}
