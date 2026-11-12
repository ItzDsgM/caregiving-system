'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Clock,
  ExternalLink,
  MessageSquare,
  Search,
  XCircle,
} from 'lucide-react';
import { contactRequestsApi } from '@/lib/api';
import {
  formatDate,
  formatFullName,
  formatRelativeTime,
  getInitials,
} from '@/lib/format';
import type {
  ContactRequestStatus,
  FormattedContactRequest,
} from '@/lib/types';
import { Button, buttonVariants } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { MaskedContactBanner } from '@/components/ui/MaskedContactBanner';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { TabsBar, type TabOption } from '@/components/ui/TabsBar';
import {
  ClientPageHeader,
  PageLoadingSkeleton,
  SectionErrorCard,
  resolveClientErrorMessage,
} from './ClientUiHelpers';

type InquiryTabFilter = 'ALL' | ContactRequestStatus;

const VALID_INQUIRY_TABS: ReadonlySet<string> = new Set([
  'ALL',
  'PENDING',
  'ACCEPTED',
  'REJECTED',
]);

export function ClientInquiriesView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const statusParam = searchParams.get('status') || 'ALL';
  const activeTab: InquiryTabFilter = VALID_INQUIRY_TABS.has(statusParam)
    ? (statusParam as InquiryTabFilter)
    : 'ALL';

  const handleTabChange = (nextTab: InquiryTabFilter) => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextTab === 'ALL') {
      params.delete('status');
    } else {
      params.set('status', nextTab);
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const [inquiries, setInquiries] = useState<FormattedContactRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadInquiries() {
      try {
        const list = await contactRequestsApi.getSent();
        if (!cancelled) {
          setInquiries(list);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            resolveClientErrorMessage(
              err,
              'No pudimos cargar tus solicitudes de contacto enviadas.',
            ),
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadInquiries();
    return () => {
      cancelled = true;
    };
  }, [refreshTick]);

  const counts = useMemo(() => {
    const summary = {
      ALL: inquiries.length,
      PENDING: 0,
      ACCEPTED: 0,
      REJECTED: 0,
    };
    for (const item of inquiries) {
      if (item.status === 'PENDING') summary.PENDING += 1;
      else if (item.status === 'ACCEPTED') summary.ACCEPTED += 1;
      else if (item.status === 'REJECTED') summary.REJECTED += 1;
    }
    return summary;
  }, [inquiries]);

  const tabs: Array<TabOption<InquiryTabFilter>> = [
    { id: 'ALL', label: 'Todas', count: counts.ALL },
    { id: 'PENDING', label: 'Pendientes', count: counts.PENDING },
    { id: 'ACCEPTED', label: 'Aceptadas', count: counts.ACCEPTED },
    { id: 'REJECTED', label: 'Rechazadas', count: counts.REJECTED },
  ];

  const filteredInquiries = useMemo(() => {
    if (activeTab === 'ALL') return inquiries;
    return inquiries.filter((item) => item.status === activeTab);
  }, [inquiries, activeTab]);

  const handleRetry = () => {
    setIsLoading(true);
    setError(null);
    setRefreshTick((prev) => prev + 1);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <ClientPageHeader
        title="Solicitudes de Contacto Enviadas"
        description="Haz seguimiento a las consultas directas que enviaste desde el catálogo de cuidadores. Cuando acepten, su teléfono, correo y WhatsApp aparecerán aquí."
        actions={
          <Link
            href="/caregivers"
            className={buttonVariants({ variant: 'primary', size: 'md' })}
          >
            <Search className="h-4 w-4" aria-hidden />
            Explorar Cuidadores
          </Link>
        }
      />

      {isLoading ? (
        <PageLoadingSkeleton cards={3} />
      ) : error ? (
        <SectionErrorCard
          title="No pudimos cargar tus solicitudes"
          message={error}
          onRetry={handleRetry}
        />
      ) : (
        <div className="space-y-4">
          <div className="rounded-[12px] border border-slate-200 bg-white px-4 sm:px-6">
            <TabsBar
              tabs={tabs}
              activeTab={activeTab}
              onChange={handleTabChange}
              ariaLabel="Filtrar solicitudes por estado"
            />
          </div>

          <div
            role="tabpanel"
            id={`tabpanel-${activeTab}`}
            aria-labelledby={`tab-${activeTab}`}
          >
            {filteredInquiries.length === 0 ? (
              <EmptyState
                icon={<MessageSquare className="h-6 w-6" aria-hidden />}
                title={
                  activeTab === 'ALL'
                    ? 'Aún no has enviado solicitudes directas'
                    : 'No hay solicitudes en este estado'
                }
                description={
                  activeTab === 'ALL'
                    ? 'Explora el directorio de cuidadores verificados y solicita contacto directo con el perfil que mejor se adapte a tu familia.'
                    : 'Cambia de pestaña para revisar tus otras consultas enviadas.'
                }
                action={
                  activeTab === 'ALL' ? (
                    <Link
                      href="/caregivers"
                      className={buttonVariants({
                        variant: 'primary',
                        size: 'md',
                      })}
                    >
                      Explorar Cuidadores
                    </Link>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleTabChange('ALL')}
                    >
                      Ver todas las solicitudes
                    </Button>
                  )
                }
              />
            ) : (
              <div className="space-y-4">
                {filteredInquiries.map((inquiry) => {
                  const fullName = formatFullName(
                    inquiry.participant.firstName,
                    inquiry.participant.lastName,
                  );
                  const isAccepted = inquiry.status === 'ACCEPTED';
                  const isPending = inquiry.status === 'PENDING';

                  return (
                    <article
                      key={inquiry.id}
                      className={`cc-virtual-item rounded-[12px] border bg-white p-5 ${
                        isAccepted
                          ? 'border-emerald-300'
                          : 'border-slate-200'
                      }`}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-start gap-3.5">
                          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-600 text-xs font-bold text-white">
                            {getInitials(
                              inquiry.participant.firstName,
                              inquiry.participant.lastName,
                            )}
                          </span>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h2 className="text-base font-semibold text-slate-900">
                                {fullName}
                              </h2>
                              <StatusBadge
                                status={inquiry.status}
                                domain="contactRequest"
                              />
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                              <span className="inline-flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" aria-hidden />
                                Enviada {formatRelativeTime(inquiry.createdAt)} (
                                {formatDate(inquiry.createdAt, true)})
                              </span>
                              {inquiry.respondedAt ? (
                                <span>
                                  · Respondida{' '}
                                  {formatDate(inquiry.respondedAt, true)}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        <Link
                          href={`/caregivers/${inquiry.caregiverId}`}
                          className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-800"
                        >
                          <span>Ver perfil del cuidador</span>
                          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                        </Link>
                      </div>

                      <div className="mt-4 rounded-[10px] border border-slate-100 bg-slate-50/70 p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          Tu mensaje enviado
                        </p>
                        <p className="mt-1.5 whitespace-pre-line text-sm leading-6 text-slate-700">
                          {inquiry.initialMessage}
                        </p>
                      </div>

                      <div className="mt-4">
                        {isAccepted ? (
                          <MaskedContactBanner
                            unlocked
                            firstName={inquiry.participant.firstName}
                            lastName={inquiry.participant.lastName}
                            phoneNumber={inquiry.participant.phone}
                            email={inquiry.participant.email}
                            unlockedTitle="¡Solicitud aceptada! Contacto directo disponible"
                          />
                        ) : isPending ? (
                          <MaskedContactBanner
                            unlocked={false}
                            firstName={inquiry.participant.firstName}
                            lastName={inquiry.participant.lastName}
                            lockedTitle="Esperando confirmación del cuidador"
                            lockedDescription="Por privacidad, el teléfono, correo y acceso a WhatsApp se mostrarán aquí en cuanto el cuidador acepte tu solicitud."
                          />
                        ) : (
                          <div className="flex flex-col gap-3 rounded-[12px] border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-start gap-2.5">
                              <XCircle
                                className="mt-0.5 h-4 w-4 shrink-0 text-rose-500"
                                aria-hidden
                              />
                              <p className="text-xs leading-5 text-slate-600">
                                El cuidador indicó que no tiene disponibilidad para esta consulta en este momento.
                              </p>
                            </div>
                            <Link
                              href="/caregivers"
                              className={buttonVariants({
                                variant: 'secondary',
                                size: 'sm',
                                className: 'shrink-0',
                              })}
                            >
                              Buscar otros perfiles
                            </Link>
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
