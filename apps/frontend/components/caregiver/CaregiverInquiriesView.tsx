'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, Clock, Inbox, X } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { MaskedContactBanner } from '@/components/ui/MaskedContactBanner';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { TabsBar, type TabOption } from '@/components/ui/TabsBar';
import { ApiError, contactRequestsApi, extractErrorMessage } from '@/lib/api';
import {
  formatDate,
  formatFullName,
  formatRelativeTime,
  getInitials,
} from '@/lib/format';
import type {
  ContactRequestStatus,
  FormattedContactRequest,
  RespondContactRequestResponse,
} from '@/lib/types';
import {
  CaregiverErrorBanner,
  CaregiverSectionSkeleton,
} from './CaregiverPortalFeedback';
import { RespondInquiryModal } from './RespondInquiryModal';
import {
  applyInquiryResponseUpdate,
  sortInquiriesByPriority,
} from './caregiverUtils';

type InquiryTabFilter = 'ALL' | ContactRequestStatus;

export function CaregiverInquiriesView() {
  const [inquiries, setInquiries] = useState<FormattedContactRequest[]>([]);
  const [activeTab, setActiveTab] = useState<InquiryTabFilter>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  const [modalInquiry, setModalInquiry] =
    useState<FormattedContactRequest | null>(null);
  const [modalAction, setModalAction] = useState<
    'ACCEPTED' | 'REJECTED' | null
  >(null);

  const triggerReload = useCallback(() => {
    setIsLoading(true);
    setLoadError(null);
    setReloadTick((prev) => prev + 1);
  }, []);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const res = await contactRequestsApi.getReceived();
        if (!active) return;
        setInquiries(sortInquiriesByPriority(res));
        setLoadError(null);
      } catch (err) {
        if (!active) return;
        const msg =
          err instanceof ApiError
            ? err.message || extractErrorMessage(err.rawMessage, err.statusCode)
            : 'No pudimos cargar las solicitudes de contacto.';
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

  const counts = useMemo(() => {
    let pending = 0;
    let accepted = 0;
    let rejected = 0;
    for (const item of inquiries) {
      if (item.status === 'PENDING') pending += 1;
      else if (item.status === 'ACCEPTED') accepted += 1;
      else if (item.status === 'REJECTED') rejected += 1;
    }
    return {
      ALL: inquiries.length,
      PENDING: pending,
      ACCEPTED: accepted,
      REJECTED: rejected,
    };
  }, [inquiries]);

  const tabs: ReadonlyArray<TabOption<InquiryTabFilter>> = useMemo(
    () => [
      { id: 'ALL', label: 'Todas', count: counts.ALL },
      { id: 'PENDING', label: 'Pendientes', count: counts.PENDING },
      { id: 'ACCEPTED', label: 'Aceptadas', count: counts.ACCEPTED },
      { id: 'REJECTED', label: 'Rechazadas', count: counts.REJECTED },
    ],
    [counts],
  );

  const visibleInquiries = useMemo(() => {
    const sorted = sortInquiriesByPriority(inquiries);
    if (activeTab === 'ALL') return sorted;
    return sorted.filter((item) => item.status === activeTab);
  }, [inquiries, activeTab]);

  const handleResponded = useCallback(
    (inquiryId: string, response: RespondContactRequestResponse) => {
      setInquiries((prev) =>
        sortInquiriesByPriority(
          applyInquiryResponseUpdate(prev, inquiryId, response),
        ),
      );
    },
    [],
  );

  if (isLoading) {
    return <CaregiverSectionSkeleton rows={3} />;
  }

  if (loadError) {
    return (
      <CaregiverErrorBanner message={loadError} onRetry={triggerReload} />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Solicitudes de Contacto Recibidas
            </h1>
            {counts.PENDING > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 font-mono text-xs font-semibold text-amber-800 tabular-nums">
                <Clock className="h-3.5 w-3.5" aria-hidden />
                {counts.PENDING} pendientes
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Responde consultas directas enviadas por familias. Al aceptar, se
            desbloquean los datos mutuos de contacto de inmediato.
          </p>
        </div>

        <Link
          href="/caregiver/profile"
          className={buttonVariants({ variant: 'secondary', size: 'sm' })}
        >
          Actualizar disponibilidad
        </Link>
      </div>

      {/* Tabs */}
      <div className="rounded-[12px] border border-slate-200 bg-white px-4 sm:px-6">
        <TabsBar
          tabs={tabs}
          activeTab={activeTab}
          onChange={setActiveTab}
          ariaLabel="Filtrar solicitudes de contacto"
        />
      </div>

      {/* Prioritized Queue */}
      <div
        id={`tabpanel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`tab-${activeTab}`}
      >
        {visibleInquiries.length === 0 ? (
          <EmptyState
            icon={<Inbox className="h-6 w-6" aria-hidden />}
            title={
              activeTab === 'ALL'
                ? 'No tienes solicitudes de contacto todavía'
                : 'No hay solicitudes en esta categoría'
            }
            description="Cuando las familias exploren tu perfil público y te envíen una consulta directa, aparecerán aquí ordenadas por prioridad."
            action={
              activeTab === 'ALL' ? (
                <Link
                  href="/caregiver/documents"
                  className={buttonVariants({ variant: 'primary', size: 'md' })}
                >
                  Verificar mis documentos
                </Link>
              ) : (
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => setActiveTab('ALL')}
                >
                  Ver todas las solicitudes
                </Button>
              )
            }
          />
        ) : (
          <div className="space-y-4">
            {visibleInquiries.map((inquiry) => {
              const clientName = formatFullName(
                inquiry.participant.firstName,
                inquiry.participant.lastName,
                'Familia',
              );
              const isPending = inquiry.status === 'PENDING';
              const isAccepted = inquiry.status === 'ACCEPTED';

              return (
                <article
                  key={inquiry.id}
                  className={`cc-virtual-item rounded-[12px] border bg-white p-5 sm:p-6 ${
                    isPending
                      ? 'border-amber-200 ring-1 ring-amber-100'
                      : isAccepted
                        ? 'border-emerald-200'
                        : 'border-slate-200'
                  }`}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-3.5">
                      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-teal-50 text-sm font-bold text-teal-800">
                        {getInitials(
                          inquiry.participant.firstName,
                          inquiry.participant.lastName,
                        )}
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-base font-semibold text-slate-900">
                            {clientName}
                          </h2>
                          <StatusBadge
                            status={inquiry.status}
                            domain="contactRequest"
                            size="md"
                          />
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">
                          Recibida {formatRelativeTime(inquiry.createdAt)} ·{' '}
                          {formatDate(inquiry.createdAt, true)}
                          {inquiry.respondedAt
                            ? ` · Respondida el ${formatDate(inquiry.respondedAt, true)}`
                            : ''}
                        </p>
                      </div>
                    </div>

                    {isPending ? (
                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        <Button
                          variant="primary"
                          size="sm"
                          leftIcon={<Check className="h-4 w-4" aria-hidden />}
                          onClick={() => {
                            setModalInquiry(inquiry);
                            setModalAction('ACCEPTED');
                          }}
                        >
                          Aceptar Solicitud
                        </Button>
                        <Button
                          variant="danger-outline"
                          size="sm"
                          leftIcon={<X className="h-4 w-4" aria-hidden />}
                          onClick={() => {
                            setModalInquiry(inquiry);
                            setModalAction('REJECTED');
                          }}
                        >
                          Rechazar Solicitud
                        </Button>
                      </div>
                    ) : null}
                  </div>

                  {/* Client message */}
                  <div className="mt-4 rounded-[8px] border border-slate-200 bg-slate-50/70 p-3.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Mensaje de la familia
                    </p>
                    <p className="mt-1.5 whitespace-pre-line text-sm leading-6 text-slate-700">
                      {inquiry.initialMessage}
                    </p>
                  </div>

                  {/* Contact Banner (Masked by default, auto-unlocked on ACCEPTED) */}
                  <div className="mt-4">
                    <MaskedContactBanner
                      unlocked={isAccepted}
                      firstName={inquiry.participant.firstName}
                      lastName={inquiry.participant.lastName}
                      phoneNumber={inquiry.participant.phone}
                      email={inquiry.participant.email}
                      lockedTitle={
                        inquiry.status === 'REJECTED'
                          ? 'Solicitud rechazada — datos de contacto no compartidos'
                          : 'Datos de contacto de la familia protegidos'
                      }
                      lockedDescription={
                        inquiry.status === 'REJECTED'
                          ? 'Rechazaste esta solicitud, por lo que no se habilitaron canales directos de comunicación.'
                          : 'Al aceptar la solicitud se revelará de inmediato el teléfono, correo electrónico y WhatsApp de la familia.'
                      }
                      unlockedTitle="Contacto directo con la familia desbloqueado"
                    />
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <RespondInquiryModal
        inquiry={modalInquiry}
        action={modalAction}
        onClose={() => {
          setModalInquiry(null);
          setModalAction(null);
        }}
        onResponded={handleResponded}
      />
    </div>
  );
}
