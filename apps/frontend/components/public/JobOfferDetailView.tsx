"use client";

import React, { useEffect, useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Info,
  MapPin,
  Send,
  Sparkles,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { MaskedContactBanner } from "@/components/ui/MaskedContactBanner";
import { ModalDialog } from "@/components/ui/ModalDialog";
import { SchedulePicker } from "@/components/ui/SchedulePicker";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/ToastRegion";
import { ApiError, jobOffersApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { CARE_SPECIALTY_LABELS } from "@/lib/constants";
import {
  formatCOP,
  formatCOPRange,
  formatDate,
  formatDateRange,
} from "@/lib/format";
import type { JobOffer } from "@/lib/types";

export interface JobOfferDetailViewProps {
  offerId: string;
}

const MIN_COVER_LETTER_LENGTH = 20;

export function JobOfferDetailView({
  offerId,
}: Readonly<JobOfferDetailViewProps>) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const toast = useToast();

  const [offer, setOffer] = useState<JobOffer | null>(null);
  const [isLoadingOffer, setIsLoadingOffer] = useState(true);
  const [offerError, setOfferError] = useState<string | null>(null);

  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [proposedRate, setProposedRate] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [rateTouched, setRateTouched] = useState(false);
  const [letterTouched, setLetterTouched] = useState(false);
  const [isSubmittingApply, setIsSubmittingApply] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [appliedSuccess, setAppliedSuccess] = useState(false);

  const rateInputId = useId();
  const letterTextareaId = useId();

  useEffect(() => {
    return () => {
      setIsApplyModalOpen(false);
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadOffer() {
      setIsLoadingOffer(true);
      setOfferError(null);
      try {
        const data = await jobOffersApi.getById(offerId);
        if (!active) return;
        setOffer(data);
      } catch (err) {
        if (!active) return;
        const msg =
          err instanceof ApiError && err.statusCode === 404
            ? "No encontramos esta oferta de cuidado o fue eliminada."
            : err instanceof Error
              ? err.message
              : "No pudimos cargar el detalle de la oferta.";
        setOfferError(msg);
      } finally {
        if (active) {
          setIsLoadingOffer(false);
        }
      }
    }

    void loadOffer();

    return () => {
      active = false;
    };
  }, [offerId]);

  const trimmedLetter = coverLetter.trim();
  const letterInvalid = trimmedLetter.length < MIN_COVER_LETTER_LENGTH;
  const showLetterError = letterTouched && letterInvalid;

  const trimmedRate = proposedRate.trim();
  const parsedRate = trimmedRate ? Number(trimmedRate) : undefined;
  const rateInvalid =
    trimmedRate.length > 0 &&
    (parsedRate === undefined || !Number.isFinite(parsedRate) || parsedRate <= 0);
  const showRateError = rateTouched && rateInvalid;

  const handleOpenApplyFlow = () => {
    if (authLoading || !offer || offer.status !== "OPEN") return;
    if (!isAuthenticated || !user) {
      router.push(`/login?redirect=${encodeURIComponent(`/job-offers/${offerId}`)}`);
      return;
    }
    if (user.role !== "CAREGIVER") {
      return;
    }
    setModalError(null);
    setRateTouched(false);
    setLetterTouched(false);
    setIsApplyModalOpen(true);
  };

  const handleSubmitApplication = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setRateTouched(true);
    setLetterTouched(true);
    setModalError(null);

    if (!offer || letterInvalid || rateInvalid) {
      return;
    }

    setIsSubmittingApply(true);
    try {
      await jobOffersApi.apply(offer.id, {
        coverLetter: trimmedLetter,
        ...(parsedRate !== undefined && parsedRate > 0
          ? { proposedRate: parsedRate }
          : {}),
      });
      setIsApplyModalOpen(false);
      setProposedRate("");
      setCoverLetter("");
      setRateTouched(false);
      setLetterTouched(false);
      setAppliedSuccess(true);
      toast.success(
        "Postulación enviada",
        "La familia revisará tu perfil profesional y carta de presentación.",
      );
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "No pudimos registrar tu postulación.";
      setModalError(msg);
    } finally {
      setIsSubmittingApply(false);
    }
  };

  if (isLoadingOffer) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="h-5 w-48 animate-pulse rounded bg-slate-200" />
        <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-8">
            <div className="h-44 animate-pulse rounded-[12px] border border-slate-200 bg-white" />
            <div className="h-64 animate-pulse rounded-[12px] border border-slate-200 bg-white" />
          </div>
          <div className="h-72 animate-pulse rounded-[12px] border border-slate-200 bg-white lg:col-span-4" />
        </div>
      </div>
    );
  }

  if (offerError || !offer) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <EmptyState
          title="Oferta no disponible"
          description={
            offerError ??
            "La oferta que estás buscando no existe o ya no se encuentra publicada."
          }
          action={
            <Link
              href="/job-offers"
              className={buttonVariants({ variant: "primary" })}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Volver a ofertas disponibles
            </Link>
          }
        />
      </div>
    );
  }

  const isOfferOpen = offer.status === "OPEN";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <div className="mb-6">
        <Link
          href="/job-offers"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition-colors hover:text-teal-700"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Volver a ofertas disponibles
        </Link>
      </div>

      {/* Asymmetric 8/4 Layout */}
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        {/* Main Column (8 cols) */}
        <div className="space-y-6 lg:col-span-8">
          {/* Header Card */}
          <section className="rounded-[12px] border border-slate-200 bg-white p-6 shadow-xs sm:p-7">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={offer.status} domain="jobOffer" size="md" />
              <span className="inline-flex items-center rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-medium text-teal-800">
                {CARE_SPECIALTY_LABELS[offer.careType] ?? offer.careType}
              </span>
            </div>

            <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {offer.title}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-600">
              <span className="inline-flex items-center gap-1.5 font-medium text-slate-800">
                <MapPin className="h-4 w-4 text-teal-600" aria-hidden />
                {offer.locationCity} · {offer.locationZone}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-teal-600" aria-hidden />
                Publicada el {formatDate(offer.createdAt)}
              </span>
            </div>
          </section>

          {/* Full Description */}
          <section className="rounded-[12px] border border-slate-200 bg-white p-6 shadow-xs">
            <h2 className="text-base font-semibold text-slate-900">
              Descripción de Necesidades de Cuidado
            </h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-700">
              {offer.description}
            </p>
          </section>

          {/* Required Schedule (Read-only) */}
          <section className="rounded-[12px] border border-slate-200 bg-white p-6 shadow-xs">
            <div className="mb-4">
              <h2 className="text-base font-semibold text-slate-900">
                Turnos Requeridos por Día
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Jornadas solicitadas por la familia durante la vigencia del
                servicio.
              </p>
            </div>
            <SchedulePicker
              value={offer.requiredSchedule ?? []}
              readOnly
              showPresets={false}
            />
          </section>

          {/* Sanitized Client Banner */}
          <MaskedContactBanner
            unlocked={false}
            lockedTitle="Datos de la familia protegidos"
            lockedDescription={`Ubicación referencial: ${offer.locationCity}, ${offer.locationZone}. El teléfono, correo y enlace de WhatsApp del cliente se desbloquean automáticamente cuando tu postulación es aceptada.`}
          />
        </div>

        {/* Sticky Right Rail (4 cols) */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:col-span-4">
          <div className="rounded-[12px] border border-slate-200 bg-white p-6 shadow-xs">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Rango presupuestal
            </p>
            <p className="mt-2 font-mono tabular-nums text-2xl font-bold tracking-tight text-slate-900">
              {formatCOPRange(offer.budgetMin, offer.budgetMax)}
            </p>

            <dl className="mt-4 space-y-2.5 border-t border-slate-100 pt-4 text-sm">
              <div className="flex items-center justify-between gap-2">
                <dt className="text-slate-600">Fechas</dt>
                <dd className="font-mono tabular-nums text-right font-medium text-slate-900">
                  {formatDateRange(offer.startDate, offer.endDate)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-slate-600">Ubicación</dt>
                <dd className="text-right font-medium text-slate-900">
                  {offer.locationCity}, {offer.locationZone}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-slate-600">Estado</dt>
                <dd>
                  <StatusBadge status={offer.status} domain="jobOffer" />
                </dd>
              </div>
            </dl>

            <div className="mt-5 space-y-3 border-t border-slate-100 pt-5">
              {!isOfferOpen ? (
                <div className="rounded-[10px] border border-slate-200 bg-slate-50 p-3.5 text-xs leading-5 text-slate-600">
                  Esta oferta se encuentra cerrada o cancelada y ya no admite
                  nuevas postulaciones.
                </div>
              ) : !authLoading && user && user.role !== "CAREGIVER" ? (
                <div className="rounded-[10px] border border-amber-200 bg-amber-50 p-3.5 text-xs leading-5 text-amber-900">
                  <div className="flex items-start gap-2">
                    <Info
                      className="mt-0.5 h-4 w-4 shrink-0 text-amber-700"
                      aria-hidden
                    />
                    <p>
                      Has iniciado sesión como{" "}
                      <strong>
                        {user.role === "CLIENT"
                          ? "Familia / Cliente"
                          : "Administrador"}
                      </strong>
                      . Solo las cuentas de{" "}
                      <strong>Cuidador Profesional</strong> pueden postular a
                      ofertas de empleo.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    disabled={authLoading || appliedSuccess}
                    onClick={handleOpenApplyFlow}
                    leftIcon={<Sparkles className="h-4 w-4" aria-hidden />}
                  >
                    {appliedSuccess
                      ? "Postulación enviada"
                      : "Postular a esta oferta"}
                  </Button>
                  {!authLoading && !isAuthenticated ? (
                    <p className="text-center text-xs text-slate-500">
                      Inicia sesión como{" "}
                      <span className="font-medium text-slate-700">
                        Cuidador Profesional
                      </span>{" "}
                      para enviar tu propuesta.
                    </p>
                  ) : null}
                </>
              )}

              {appliedSuccess ? (
                <div className="rounded-[10px] border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-900">
                  <p className="font-semibold">¡Postulación registrada!</p>
                  <p className="mt-0.5 leading-5 text-emerald-800">
                    Puedes hacer seguimiento a su estado desde tu portal de
                    cuidador.
                  </p>
                  <Link
                    href="/caregiver/applications"
                    className="mt-2 inline-flex items-center font-semibold text-teal-800 underline underline-offset-2 hover:text-teal-950"
                  >
                    Ver mis postulaciones →
                  </Link>
                </div>
              ) : null}
            </div>
          </div>
        </aside>
      </div>

      {/* Application Modal (CAREGIVER only) */}
      <ModalDialog
        open={isApplyModalOpen}
        onClose={() => {
          if (!isSubmittingApply) {
            setIsApplyModalOpen(false);
          }
        }}
        title="Postular a esta oferta"
        description={`${offer.title} · ${offer.locationCity}`}
        size="md"
      >
        <form
          noValidate
          onSubmit={handleSubmitApplication}
          className="space-y-4"
        >
          {modalError ? (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-[10px] border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-800"
            >
              <AlertCircle
                className="mt-0.5 h-4 w-4 shrink-0 text-rose-600"
                aria-hidden
              />
              <span>{modalError}</span>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor={rateInputId}
                className="text-sm font-medium text-slate-800"
              >
                Tarifa propuesta en COP{" "}
                <span className="font-normal text-slate-500">(opcional)</span>
              </label>
              {parsedRate && parsedRate > 0 ? (
                <span className="font-mono tabular-nums text-xs font-semibold text-teal-700">
                  {formatCOP(parsedRate)}
                </span>
              ) : null}
            </div>
            <input
              id={rateInputId}
              type="number"
              min={1}
              step={1000}
              inputMode="numeric"
              value={proposedRate}
              onChange={(e) => setProposedRate(e.target.value)}
              onBlur={() => setRateTouched(true)}
              aria-invalid={showRateError ? true : undefined}
              placeholder="Ej. 950000"
              className="h-10 w-full rounded-[8px] border border-slate-300 bg-white px-3 font-mono tabular-nums text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
            />
            {showRateError ? (
              <p role="alert" className="text-xs font-medium text-rose-600">
                La tarifa propuesta debe ser un valor positivo mayor a $0.
              </p>
            ) : (
              <p className="text-xs text-slate-500">
                Presupuesto de la oferta:{" "}
                <span className="font-mono tabular-nums">
                  {formatCOPRange(offer.budgetMin, offer.budgetMax)}
                </span>
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor={letterTextareaId}
                className="text-sm font-medium text-slate-800"
              >
                Carta de presentación
              </label>
              <span
                className={`font-mono tabular-nums text-xs ${
                  trimmedLetter.length >= MIN_COVER_LETTER_LENGTH
                    ? "text-emerald-700"
                    : "text-slate-500"
                }`}
              >
                {trimmedLetter.length}/{MIN_COVER_LETTER_LENGTH} mín.
              </span>
            </div>
            <textarea
              id={letterTextareaId}
              rows={5}
              required
              minLength={MIN_COVER_LETTER_LENGTH}
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              onBlur={() => setLetterTouched(true)}
              aria-invalid={showLetterError ? true : undefined}
              placeholder="Describe tu experiencia en este tipo de cuidado, certificaciones relevantes y disponibilidad para atender los turnos solicitados."
              className="w-full rounded-[8px] border border-slate-300 bg-white px-3 py-2.5 text-sm leading-6 text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
            />
            {showLetterError ? (
              <p role="alert" className="text-xs font-medium text-rose-600">
                Tu carta de presentación debe tener al menos{" "}
                {MIN_COVER_LETTER_LENGTH} caracteres.
              </p>
            ) : (
              <p className="text-xs text-slate-500">
                Mínimo {MIN_COVER_LETTER_LENGTH} caracteres.
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-slate-200 pt-4">
            <Button
              type="button"
              variant="secondary"
              disabled={isSubmittingApply}
              onClick={() => setIsApplyModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isSubmittingApply}
              loadingText="Enviando postulación..."
              leftIcon={<Send className="h-4 w-4" aria-hidden />}
            >
              Enviar postulación
            </Button>
          </div>
        </form>
      </ModalDialog>
    </div>
  );
}
