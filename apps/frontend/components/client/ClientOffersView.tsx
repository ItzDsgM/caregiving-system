'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Ban,
  Briefcase,
  Lock,
  MapPin,
  Pencil,
  PlusCircle,
  Users,
} from 'lucide-react';
import { jobOffersApi } from '@/lib/api';
import { CARE_SPECIALTY_LABELS } from '@/lib/constants';
import { formatCOPRange, formatDateRange } from '@/lib/format';
import type { JobOfferStatus, MyJobOfferItem } from '@/lib/types';
import { Button, buttonVariants } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ModalDialog } from '@/components/ui/ModalDialog';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { TabsBar, type TabOption } from '@/components/ui/TabsBar';
import { useToast } from '@/components/ui/ToastRegion';
import {
  ClientPageHeader,
  InlineErrorAlert,
  PageLoadingSkeleton,
  SectionErrorCard,
  resolveClientErrorMessage,
} from './ClientUiHelpers';
import { EditOfferModalDialog } from './EditOfferModalDialog';

type OfferTabFilter = 'ALL' | JobOfferStatus;

const VALID_OFFER_TABS: ReadonlySet<string> = new Set([
  'ALL',
  'OPEN',
  'CLOSED',
  'CANCELLED',
]);

export function ClientOffersView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const toast = useToast();

  const statusParam = searchParams.get('status') || 'ALL';
  const activeTab: OfferTabFilter = VALID_OFFER_TABS.has(statusParam)
    ? (statusParam as OfferTabFilter)
    : 'ALL';

  const handleTabChange = (nextTab: OfferTabFilter) => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextTab === 'ALL') {
      params.delete('status');
    } else {
      params.set('status', nextTab);
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const [offers, setOffers] = useState<MyJobOfferItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const [busyOfferId, setBusyOfferId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<MyJobOfferItem | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [editingOffer, setEditingOffer] = useState<MyJobOfferItem | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadOffers() {
      try {
        const list = await jobOffersApi.getMyOffers();
        if (!cancelled) {
          setOffers(list);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            resolveClientErrorMessage(
              err,
              'No pudimos cargar tus ofertas publicadas.',
            ),
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadOffers();
    return () => {
      cancelled = true;
    };
  }, [refreshTick]);

  const counts = useMemo(() => {
    const summary = {
      ALL: offers.length,
      OPEN: 0,
      CLOSED: 0,
      CANCELLED: 0,
    };
    for (const offer of offers) {
      if (offer.status === 'OPEN') summary.OPEN += 1;
      else if (offer.status === 'CLOSED') summary.CLOSED += 1;
      else if (offer.status === 'CANCELLED') summary.CANCELLED += 1;
    }
    return summary;
  }, [offers]);

  const tabs: Array<TabOption<OfferTabFilter>> = [
    { id: 'ALL', label: 'Todas', count: counts.ALL },
    { id: 'OPEN', label: 'Abiertas', count: counts.OPEN },
    { id: 'CLOSED', label: 'Cerradas', count: counts.CLOSED },
    { id: 'CANCELLED', label: 'Canceladas', count: counts.CANCELLED },
  ];

  const filteredOffers = useMemo(() => {
    if (activeTab === 'ALL') return offers;
    return offers.filter((offer) => offer.status === activeTab);
  }, [offers, activeTab]);

  const handleRetry = () => {
    setIsLoading(true);
    setError(null);
    setRefreshTick((prev) => prev + 1);
  };

  const handleCloseOffer = async (offer: MyJobOfferItem) => {
    setBusyOfferId(offer.id);
    try {
      const updated = await jobOffersApi.updateStatus(offer.id, {
        status: 'CLOSED',
      });
      setOffers((prev) =>
        prev.map((item) =>
          item.id === offer.id
            ? { ...updated, applicationsCount: item.applicationsCount }
            : item,
        ),
      );
      toast.success(
        'Oferta cerrada',
        `"${offer.title}" ya no recibe nuevas postulaciones.`,
      );
    } catch (err) {
      toast.apiError(err, 'No se pudo cerrar la oferta.');
    } finally {
      setBusyOfferId(null);
    }
  };

  const handleConfirmCancelOffer = async () => {
    if (!cancelTarget) return;
    setBusyOfferId(cancelTarget.id);
    setCancelError(null);
    try {
      const updated = await jobOffersApi.updateStatus(cancelTarget.id, {
        status: 'CANCELLED',
      });
      setOffers((prev) =>
        prev.map((item) =>
          item.id === cancelTarget.id
            ? { ...updated, applicationsCount: item.applicationsCount }
            : item,
        ),
      );
      const cancelledTitle = cancelTarget.title;
      setCancelTarget(null);
      toast.info(
        'Oferta cancelada',
        `"${cancelledTitle}" pasó a estado cancelada.`,
      );
    } catch (err) {
      setCancelError(
        resolveClientErrorMessage(err, 'No se pudo cancelar la oferta.'),
      );
    } finally {
      setBusyOfferId(null);
    }
  };

  return (
    <div className="space-y-6">
      <ClientPageHeader
        title="Mis Ofertas de Empleo"
        description="Gestiona tus ofertas activas, revisa postulaciones recibidas y actualiza o cierra convocatorias."
        actions={
          <Link
            href="/client/offers/create"
            className={buttonVariants({ variant: 'primary', size: 'md' })}
          >
            <PlusCircle className="h-4 w-4" aria-hidden />
            Publicar Nueva Oferta
          </Link>
        }
      />

      {isLoading ? (
        <PageLoadingSkeleton cards={3} />
      ) : error ? (
        <SectionErrorCard
          title="No pudimos obtener tus ofertas"
          message={error}
          onRetry={handleRetry}
        />
      ) : (
        <div className="rounded-[12px] border border-slate-200 bg-white">
          <div className="px-4 sm:px-6">
            <TabsBar
              tabs={tabs}
              activeTab={activeTab}
              onChange={handleTabChange}
              ariaLabel="Filtrar ofertas por estado"
            />
          </div>

          <div
            role="tabpanel"
            id={`tabpanel-${activeTab}`}
            aria-labelledby={`tab-${activeTab}`}
            className="p-4 sm:p-6"
          >
            {filteredOffers.length === 0 ? (
              <EmptyState
                icon={<Briefcase className="h-6 w-6" aria-hidden />}
                title={
                  activeTab === 'ALL'
                    ? 'Aún no has publicado ofertas'
                    : 'No hay ofertas en este estado'
                }
                description={
                  activeTab === 'ALL'
                    ? 'Publica tu primera oferta describiendo el cuidado requerido para recibir postulaciones de cuidadores verificados.'
                    : 'Prueba cambiando de pestaña o publica una nueva oferta cuando necesites asistencia.'
                }
                action={
                  activeTab === 'ALL' ? (
                    <Link
                      href="/client/offers/create"
                      className={buttonVariants({ variant: 'primary', size: 'md' })}
                    >
                      <PlusCircle className="h-4 w-4" aria-hidden />
                      Publicar Nueva Oferta
                    </Link>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleTabChange('ALL')}
                    >
                      Ver todas las ofertas
                    </Button>
                  )
                }
              />
            ) : (
              <div className="cc-table-container">
                <table className="cc-responsive-table text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <th scope="col" className="px-4 py-3">
                        Oferta y modalidad
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Fechas y presupuesto
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Estado
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Postulantes
                      </th>
                      <th scope="col" className="px-4 py-3 text-right">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredOffers.map((offer) => {
                      const isRowBusy = busyOfferId === offer.id;
                      const isOpen = offer.status === 'OPEN';

                      return (
                        <tr
                          key={offer.id}
                          className="transition-colors hover:bg-slate-50/70"
                        >
                          <td data-label="Oferta" className="px-4 py-4 align-top">
                            <div className="max-w-sm">
                              <Link
                                href={`/client/offers/${offer.id}/applications`}
                                className="font-semibold text-slate-900 transition-colors hover:text-teal-700"
                              >
                                {offer.title}
                              </Link>
                              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                <span className="rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-[11px] font-medium text-teal-800">
                                  {CARE_SPECIALTY_LABELS[offer.careType]}
                                </span>
                                <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                                  <MapPin className="h-3 w-3" aria-hidden />
                                  {offer.locationCity} — {offer.locationZone}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td
                            data-label="Fechas y presupuesto"
                            className="px-4 py-4 align-top"
                          >
                            <p className="text-xs font-medium text-slate-700">
                              {formatDateRange(offer.startDate, offer.endDate)}
                            </p>
                            <p className="mt-1 font-mono text-xs font-semibold text-slate-900 tabular-nums">
                              {formatCOPRange(offer.budgetMin, offer.budgetMax)}
                            </p>
                          </td>

                          <td data-label="Estado" className="px-4 py-4 align-top">
                            <StatusBadge
                              status={offer.status}
                              domain="jobOffer"
                            />
                          </td>

                          <td
                            data-label="Postulantes"
                            className="px-4 py-4 align-top"
                          >
                            <Link
                              href={`/client/offers/${offer.id}/applications`}
                              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-xs font-semibold tabular-nums transition-colors ${
                                offer.applicationsCount > 0
                                  ? 'border-teal-200 bg-teal-50 text-teal-800 hover:bg-teal-100'
                                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              <Users className="h-3.5 w-3.5" aria-hidden />
                              {offer.applicationsCount}{' '}
                              {offer.applicationsCount === 1
                                ? 'postulante'
                                : 'postulantes'}
                            </Link>
                          </td>

                          <td
                            data-label="Acciones"
                            className="px-4 py-4 align-top text-right"
                          >
                            <div className="flex flex-wrap items-center justify-end gap-2">
                              <Link
                                href={`/client/offers/${offer.id}/applications`}
                                className={buttonVariants({
                                  variant: 'secondary',
                                  size: 'sm',
                                })}
                              >
                                Revisar
                              </Link>

                              {isOpen ? (
                                <>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    disabled={isRowBusy}
                                    onClick={() => setEditingOffer(offer)}
                                    leftIcon={
                                      <Pencil className="h-3.5 w-3.5" aria-hidden />
                                    }
                                  >
                                    Editar
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    loading={isRowBusy && !cancelTarget}
                                    disabled={isRowBusy}
                                    onClick={() => handleCloseOffer(offer)}
                                    leftIcon={
                                      <Lock className="h-3.5 w-3.5" aria-hidden />
                                    }
                                  >
                                    Cerrar
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="danger-outline"
                                    size="sm"
                                    disabled={isRowBusy}
                                    onClick={() => {
                                      setCancelError(null);
                                      setCancelTarget(offer);
                                    }}
                                    leftIcon={
                                      <Ban className="h-3.5 w-3.5" aria-hidden />
                                    }
                                  >
                                    Cancelar
                                  </Button>
                                </>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirm Cancel Modal */}
      <ModalDialog
        open={Boolean(cancelTarget)}
        onClose={() => {
          if (!busyOfferId) {
            setCancelTarget(null);
            setCancelError(null);
          }
        }}
        title="Cancelar oferta de empleo"
        description="Esta acción cerrará la convocatoria permanentemente para nuevos postulantes."
        size="sm"
        closeOnBackdropClick={!busyOfferId}
        closeOnEscape={!busyOfferId}
      >
        {cancelTarget ? (
          <div className="space-y-4">
            <InlineErrorAlert
              message={cancelError}
              title="No se pudo cancelar la oferta"
            />
            <p className="text-sm leading-6 text-slate-700">
              ¿Confirmas que deseas cancelar la oferta{' '}
              <strong className="font-semibold text-slate-900">
                “{cancelTarget.title}”
              </strong>
              ? Si ya tienes postulantes en revisión, te recomendamos revisarlos o cerrar la oferta en lugar de cancelarla.
            </p>
            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 pt-4">
              <Button
                type="button"
                variant="secondary"
                disabled={Boolean(busyOfferId)}
                onClick={() => {
                  setCancelTarget(null);
                  setCancelError(null);
                }}
              >
                Mantener oferta
              </Button>
              <Button
                type="button"
                variant="danger"
                loading={busyOfferId === cancelTarget.id}
                loadingText="Cancelando..."
                onClick={handleConfirmCancelOffer}
              >
                Sí, cancelar oferta
              </Button>
            </div>
          </div>
        ) : null}
      </ModalDialog>

      {/* Edit Open Offer Modal */}
      <EditOfferModalDialog
        offer={editingOffer}
        onClose={() => setEditingOffer(null)}
        onUpdated={(updated) => {
          setOffers((prev) =>
            prev.map((item) => (item.id === updated.id ? updated : item)),
          );
        }}
      />
    </div>
  );
}
