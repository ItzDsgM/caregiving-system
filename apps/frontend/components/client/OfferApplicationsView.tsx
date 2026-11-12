'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Lock,
  MapPin,
  UserCheck,
  Users,
  XCircle,
} from 'lucide-react';
import { applicationsApi, jobOffersApi } from '@/lib/api';
import { CARE_SPECIALTY_LABELS } from '@/lib/constants';
import {
  formatCOP,
  formatCOPRange,
  formatDate,
  formatDateRange,
  formatFullName,
  formatRelativeTime,
  getInitials,
} from '@/lib/format';
import type {
  ApplicationStatus,
  JobOffer,
  JobOfferApplicationItem,
} from '@/lib/types';
import { Button, buttonVariants } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { MaskedContactBanner } from '@/components/ui/MaskedContactBanner';
import { ModalDialog } from '@/components/ui/ModalDialog';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { TabsBar, type TabOption } from '@/components/ui/TabsBar';
import { useToast } from '@/components/ui/ToastRegion';
import {
  ClientPageHeader,
  CompactScheduleSummary,
  InlineErrorAlert,
  PageLoadingSkeleton,
  SectionErrorCard,
  resolveClientErrorMessage,
} from './ClientUiHelpers';
import {
  saveUnlockedAppContact,
  useUnlockedAppContacts,
} from './storage';

const COVER_LETTER_COLLAPSE_THRESHOLD = 240;

type AppTabFilter = 'ALL' | ApplicationStatus;

export interface OfferApplicationsViewProps {
  offerId: string;
}

export function OfferApplicationsView({
  offerId,
}: Readonly<OfferApplicationsViewProps>) {
  const toast = useToast();
  const unlockedContactsMap = useUnlockedAppContacts();

  const [offer, setOffer] = useState<JobOffer | null>(null);
  const [applications, setApplications] = useState<JobOfferApplicationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const [activeTab, setActiveTab] = useState<AppTabFilter>('ALL');
  const [expandedLetters, setExpandedLetters] = useState<Record<string, boolean>>({});
  const [acceptTarget, setAcceptTarget] = useState<JobOfferApplicationItem | null>(null);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [busyAppId, setBusyAppId] = useState<string | null>(null);
  const [isClosingOffer, setIsClosingOffer] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadOfferApplications() {
      try {
        const [offerRes, appsRes] = await Promise.all([
          jobOffersApi.getById(offerId),
          jobOffersApi.getApplications(offerId),
        ]);

        if (!cancelled) {
          setOffer(offerRes);
          setApplications(appsRes);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            resolveClientErrorMessage(
              err,
              'No pudimos cargar las postulaciones de esta oferta.',
            ),
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadOfferApplications();
    return () => {
      cancelled = true;
    };
  }, [offerId, refreshTick]);

  const counts = useMemo(() => {
    const summary = {
      ALL: applications.length,
      PENDING: 0,
      ACCEPTED: 0,
      REJECTED: 0,
    };
    for (const app of applications) {
      if (app.status === 'PENDING') summary.PENDING += 1;
      else if (app.status === 'ACCEPTED') summary.ACCEPTED += 1;
      else if (app.status === 'REJECTED') summary.REJECTED += 1;
    }
    return summary;
  }, [applications]);

  const tabs: Array<TabOption<AppTabFilter>> = [
    { id: 'ALL', label: 'Todas', count: counts.ALL },
    { id: 'PENDING', label: 'En revisión', count: counts.PENDING },
    { id: 'ACCEPTED', label: 'Aceptadas', count: counts.ACCEPTED },
    { id: 'REJECTED', label: 'Rechazadas', count: counts.REJECTED },
  ];

  const filteredApplications = useMemo(() => {
    if (activeTab === 'ALL') return applications;
    return applications.filter((app) => app.status === activeTab);
  }, [applications, activeTab]);

  const handleRetry = () => {
    setIsLoading(true);
    setError(null);
    setRefreshTick((prev) => prev + 1);
  };

  const toggleCoverLetter = (appId: string) => {
    setExpandedLetters((prev) => ({
      ...prev,
      [appId]: !prev[appId],
    }));
  };

  const handleConfirmAccept = async () => {
    if (!acceptTarget) return;
    setBusyAppId(acceptTarget.id);
    setAcceptError(null);

    try {
      const response = await applicationsApi.updateStatus(acceptTarget.id, {
        status: 'ACCEPTED',
      });

      if (response.unlockedContactDetails) {
        saveUnlockedAppContact(acceptTarget.id, response.unlockedContactDetails);
      }

      setApplications((prev) =>
        prev.map((item) =>
          item.id === acceptTarget.id
            ? { ...item, status: response.application.status }
            : item,
        ),
      );

      const caregiverName = formatFullName(
        acceptTarget.caregiver.firstName,
        acceptTarget.caregiver.lastName,
      );
      setAcceptTarget(null);
      toast.success(
        'Cuidador aceptado',
        `Contacto directo desbloqueado con ${caregiverName}.`,
      );
    } catch (err) {
      setAcceptError(
        resolveClientErrorMessage(
          err,
          'No pudimos confirmar la aceptación del cuidador.',
        ),
      );
    } finally {
      setBusyAppId(null);
    }
  };

  const handleReject = async (app: JobOfferApplicationItem) => {
    setBusyAppId(app.id);
    try {
      const response = await applicationsApi.updateStatus(app.id, {
        status: 'REJECTED',
      });
      setApplications((prev) =>
        prev.map((item) =>
          item.id === app.id
            ? { ...item, status: response.application.status }
            : item,
        ),
      );
      toast.info(
        'Postulación rechazada',
        `Se actualizó el estado de ${formatFullName(
          app.caregiver.firstName,
          app.caregiver.lastName,
        )}.`,
      );
    } catch (err) {
      toast.apiError(err, 'No se pudo rechazar la postulación.');
    } finally {
      setBusyAppId(null);
    }
  };

  const handleCloseOffer = async () => {
    if (!offer || offer.status !== 'OPEN') return;
    setIsClosingOffer(true);
    try {
      const updated = await jobOffersApi.updateStatus(offer.id, {
        status: 'CLOSED',
      });
      setOffer(updated);
      toast.success(
        'Oferta cerrada',
        'La convocatoria ya no aceptará nuevas postulaciones.',
      );
    } catch (err) {
      toast.apiError(err, 'No se pudo cerrar la oferta.');
    } finally {
      setIsClosingOffer(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <ClientPageHeader
        backHref="/client/offers"
        backLabel="Volver a Mis Ofertas"
        title={offer ? offer.title : 'Postulantes de la Oferta'}
        description={
          offer
            ? 'Evalúa la tarifa propuesta y carta de presentación de cada cuidador. Aceptar una postulación desbloquea el contacto mutuo directo.'
            : 'Cargando detalles de la convocatoria...'
        }
        actions={
          offer && offer.status === 'OPEN' && counts.ACCEPTED > 0 ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              loading={isClosingOffer}
              onClick={handleCloseOffer}
              leftIcon={<Lock className="h-3.5 w-3.5" aria-hidden />}
            >
              Cerrar convocatoria
            </Button>
          ) : null
        }
      />

      {isLoading ? (
        <PageLoadingSkeleton cards={3} />
      ) : error ? (
        <SectionErrorCard
          title="No pudimos cargar las postulaciones"
          message={error}
          onRetry={handleRetry}
        />
      ) : offer ? (
        <>
          {/* Offer Summary Header */}
          <section className="rounded-[12px] border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={offer.status} domain="jobOffer" size="md" />
                <span className="rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-800">
                  {CARE_SPECIALTY_LABELS[offer.careType]}
                </span>
              </div>
              <span className="font-mono text-sm font-bold text-slate-900 tabular-nums">
                {formatCOPRange(offer.budgetMin, offer.budgetMax)}
              </span>
            </div>

            <div className="mt-4 grid gap-3 text-xs text-slate-600 sm:grid-cols-2">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                <span>
                  {offer.locationCity} — {offer.locationZone}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                <span>{formatDateRange(offer.startDate, offer.endDate)}</span>
              </div>
            </div>

            {offer.requiredSchedule?.length > 0 ? (
              <div className="mt-3 border-t border-slate-100 pt-3">
                <CompactScheduleSummary
                  schedule={offer.requiredSchedule}
                  maxDays={7}
                />
              </div>
            ) : null}
          </section>

          {/* Applications List */}
          <section className="space-y-4">
            <div className="rounded-[12px] border border-slate-200 bg-white px-4 sm:px-6">
              <TabsBar
                tabs={tabs}
                activeTab={activeTab}
                onChange={setActiveTab}
                ariaLabel="Filtrar postulaciones por estado"
              />
            </div>

            {filteredApplications.length === 0 ? (
              <EmptyState
                icon={<Users className="h-6 w-6" aria-hidden />}
                title={
                  applications.length === 0
                    ? 'Aún no hay postulantes en esta oferta'
                    : 'No hay postulantes en este estado'
                }
                description={
                  applications.length === 0
                    ? 'Mientras la oferta permanezca abierta, los cuidadores podrán enviar su propuesta y carta de presentación.'
                    : 'Prueba seleccionando otra pestaña para revisar el resto de postulantes.'
                }
                action={
                  applications.length === 0 ? (
                    <Link
                      href="/caregivers"
                      className={buttonVariants({
                        variant: 'secondary',
                        size: 'sm',
                      })}
                    >
                      Explorar cuidadores directamente
                    </Link>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setActiveTab('ALL')}
                    >
                      Ver todas las postulaciones
                    </Button>
                  )
                }
              />
            ) : (
              <div className="space-y-4">
                {filteredApplications.map((app) => {
                  const fullName = formatFullName(
                    app.caregiver.firstName,
                    app.caregiver.lastName,
                  );
                  const isLongLetter =
                    app.coverLetter.length > COVER_LETTER_COLLAPSE_THRESHOLD;
                  const isExpanded = Boolean(expandedLetters[app.id]);
                  const displayedLetter =
                    isLongLetter && !isExpanded
                      ? `${app.coverLetter.slice(0, COVER_LETTER_COLLAPSE_THRESHOLD).trimEnd()}...`
                      : app.coverLetter;

                  const isAccepted = app.status === 'ACCEPTED';
                  const isPending = app.status === 'PENDING';
                  const isRowBusy = busyAppId === app.id;
                  const cachedContact = unlockedContactsMap[app.id]?.caregiver;

                  return (
                    <article
                      key={app.id}
                      className={`cc-virtual-item rounded-[12px] border bg-white p-5 transition-colors ${
                        isAccepted
                          ? 'border-teal-500 ring-1 ring-teal-500/20'
                          : 'border-slate-200'
                      }`}
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-start gap-3.5">
                          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-teal-600 text-sm font-bold text-white">
                            {getInitials(
                              app.caregiver.firstName,
                              app.caregiver.lastName,
                            )}
                          </span>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h2 className="text-base font-semibold text-slate-900">
                                {fullName}
                              </h2>
                              <StatusBadge
                                status={app.status}
                                domain="application"
                              />
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                              <span>
                                Postuló {formatRelativeTime(app.appliedAt)} (
                                {formatDate(app.appliedAt, true)})
                              </span>
                              <Link
                                href={`/caregivers/${app.caregiver.id}`}
                                className="inline-flex items-center gap-1 font-medium text-teal-700 hover:text-teal-800"
                              >
                                <span>Ver perfil público</span>
                                <ExternalLink
                                  className="h-3 w-3"
                                  aria-hidden
                                />
                              </Link>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-[8px] border border-slate-200 bg-slate-50 px-3.5 py-2 text-left sm:text-right">
                          <span className="block text-[11px] font-medium uppercase tracking-wide text-slate-500">
                            Tarifa propuesta
                          </span>
                          <span className="mt-0.5 block font-mono text-base font-bold text-slate-900 tabular-nums">
                            {formatCOP(
                              app.proposedRate,
                              'Según presupuesto',
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Cover letter */}
                      <div className="mt-4 rounded-[10px] border border-slate-100 bg-slate-50/70 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Carta de presentación
                        </p>
                        <p className="mt-1.5 whitespace-pre-line text-sm leading-6 text-slate-700">
                          {displayedLetter}
                        </p>
                        {isLongLetter ? (
                          <button
                            type="button"
                            onClick={() => toggleCoverLetter(app.id)}
                            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-800 cursor-pointer"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="h-3.5 w-3.5" aria-hidden />
                                Mostrar menos
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                                Leer carta completa
                              </>
                            )}
                          </button>
                        ) : null}
                      </div>

                      {/* Contact reveal / mask block */}
                      <div className="mt-4">
                        {isAccepted ? (
                          cachedContact &&
                          (cachedContact.phone || cachedContact.email) ? (
                            <MaskedContactBanner
                              unlocked
                              firstName={
                                cachedContact.firstName ||
                                app.caregiver.firstName
                              }
                              lastName={
                                cachedContact.lastName || app.caregiver.lastName
                              }
                              phoneNumber={cachedContact.phone}
                              email={cachedContact.email}
                              unlockedTitle="Contacto directo desbloqueado"
                              className="border-teal-300 bg-teal-50/70"
                            />
                          ) : (
                            <div className="rounded-[12px] border border-teal-200 bg-teal-50/60 p-4">
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex items-start gap-3">
                                  <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-700">
                                    <CheckCircle2
                                      className="h-5 w-5"
                                      aria-hidden
                                    />
                                  </span>
                                  <div>
                                    <p className="text-sm font-semibold text-teal-950">
                                      Contacto mutuo desbloqueado al aceptar
                                    </p>
                                    <p className="mt-0.5 text-xs leading-5 text-teal-800">
                                      Esta postulación fue aceptada en una sesión anterior. Los datos directos se entregaron al confirmar la contratación y por correo electrónico.
                                    </p>
                                  </div>
                                </div>
                                <Link
                                  href="/client/history"
                                  className={buttonVariants({
                                    variant: 'secondary',
                                    size: 'sm',
                                    className: 'shrink-0',
                                  })}
                                >
                                  Ver en historial
                                </Link>
                              </div>
                            </div>
                          )
                        ) : isPending ? (
                          <MaskedContactBanner
                            unlocked={false}
                            firstName={app.caregiver.firstName}
                            lastName={app.caregiver.lastName}
                            lockedDescription="Por seguridad, el teléfono, correo y enlace de WhatsApp del cuidador se revelan únicamente al aceptar su postulación."
                          />
                        ) : null}
                      </div>

                      {/* Action footer for PENDING applications */}
                      {isPending ? (
                        <div className="mt-4 flex flex-wrap items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
                          <Button
                            type="button"
                            variant="danger-outline"
                            size="sm"
                            loading={isRowBusy && !acceptTarget}
                            disabled={isRowBusy}
                            onClick={() => handleReject(app)}
                            leftIcon={
                              <XCircle className="h-4 w-4" aria-hidden />
                            }
                          >
                            Rechazar
                          </Button>
                          <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            disabled={isRowBusy}
                            onClick={() => {
                              setAcceptError(null);
                              setAcceptTarget(app);
                            }}
                            leftIcon={
                              <UserCheck className="h-4 w-4" aria-hidden />
                            }
                          >
                            Aceptar Cuidador
                          </Button>
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </>
      ) : null}

      {/* Confirm Accept Caregiver Modal */}
      <ModalDialog
        open={Boolean(acceptTarget)}
        onClose={() => {
          if (!busyAppId) {
            setAcceptTarget(null);
            setAcceptError(null);
          }
        }}
        title="Confirmar aceptación de cuidador"
        description="Al aceptar, desbloquearás los datos de contacto mutuo para coordinar el inicio del servicio."
        size="sm"
        closeOnBackdropClick={!busyAppId}
        closeOnEscape={!busyAppId}
      >
        {acceptTarget ? (
          <div className="space-y-4">
            <InlineErrorAlert
              message={acceptError}
              title="No se pudo aceptar la postulación"
            />
            <div className="rounded-[12px] border border-teal-200 bg-teal-50/50 p-4">
              <p className="text-sm font-semibold text-slate-900">
                {formatFullName(
                  acceptTarget.caregiver.firstName,
                  acceptTarget.caregiver.lastName,
                )}
              </p>
              <p className="mt-1 font-mono text-xs font-semibold text-teal-800 tabular-nums">
                Tarifa propuesta:{' '}
                {formatCOP(
                  acceptTarget.proposedRate,
                  'Según presupuesto de la oferta',
                )}
              </p>
            </div>
            <p className="text-sm leading-6 text-slate-600">
              Se compartirán tu teléfono y correo con el cuidador, y verás de inmediato su teléfono, correo y enlace directo de WhatsApp en esta tarjeta.
            </p>
            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 pt-4">
              <Button
                type="button"
                variant="secondary"
                disabled={Boolean(busyAppId)}
                onClick={() => {
                  setAcceptTarget(null);
                  setAcceptError(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="primary"
                loading={busyAppId === acceptTarget.id}
                loadingText="Aceptando..."
                onClick={handleConfirmAccept}
                leftIcon={<UserCheck className="h-4 w-4" aria-hidden />}
              >
                Confirmar y Desbloquear
              </Button>
            </div>
          </div>
        ) : null}
      </ModalDialog>
    </div>
  );
}
