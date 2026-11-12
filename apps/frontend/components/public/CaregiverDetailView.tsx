"use client";

import React, { useEffect, useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Briefcase,
  CheckCircle2,
  Clock,
  FileCheck2,
  Info,
  MapPin,
  MessageSquarePlus,
  Send,
  ShieldCheck,
} from "lucide-react";
import { BadgeVerified } from "@/components/ui/BadgeVerified";
import { Button, buttonVariants } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { MaskedContactBanner } from "@/components/ui/MaskedContactBanner";
import { ModalDialog } from "@/components/ui/ModalDialog";
import { Pagination } from "@/components/ui/Pagination";
import { RatingStars } from "@/components/ui/RatingStars";
import { SchedulePicker } from "@/components/ui/SchedulePicker";
import { useToast } from "@/components/ui/ToastRegion";
import { ApiError, caregiversApi, contactRequestsApi, reviewsApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  CARE_SPECIALTY_LABELS,
  DOCUMENT_TYPE_LABELS,
  REQUIRED_VERIFICATION_DOC_TYPES,
} from "@/lib/constants";
import {
  formatCOP,
  formatDate,
  formatMaskedName,
  getInitials,
  toNullableNumeric,
} from "@/lib/format";
import type {
  DocumentType,
  PaginationMeta,
  PublicCaregiverDetail,
  ReviewItem,
} from "@/lib/types";

export interface CaregiverDetailViewProps {
  caregiverId: string;
}

const REVIEWS_PER_PAGE = 5;
const MIN_INQUIRY_LENGTH = 15;

export function CaregiverDetailView({
  caregiverId,
}: Readonly<CaregiverDetailViewProps>) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const toast = useToast();

  const [profile, setProfile] = useState<PublicCaregiverDetail | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [reviewsMeta, setReviewsMeta] = useState<PaginationMeta>({
    totalItems: 0,
    itemCount: 0,
    itemsPerPage: REVIEWS_PER_PAGE,
    totalPages: 1,
    currentPage: 1,
  });
  const [reviewsPage, setReviewsPage] = useState(1);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);

  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [initialMessage, setInitialMessage] = useState("");
  const [messageTouched, setMessageTouched] = useState(false);
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [inquirySentSuccess, setInquirySentSuccess] = useState(false);

  const messageTextareaId = useId();

  useEffect(() => {
    return () => {
      setIsContactModalOpen(false);
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      setIsLoadingProfile(true);
      setProfileError(null);
      try {
        const data = await caregiversApi.getPublicProfile(caregiverId);
        if (!active) return;
        setProfile(data);
        setReviewsPage(1);
      } catch (err) {
        if (!active) return;
        const msg =
          err instanceof ApiError && err.statusCode === 404
            ? "No encontramos este perfil de cuidador o ya no está disponible públicamente."
            : err instanceof Error
              ? err.message
              : "No pudimos cargar el perfil del cuidador.";
        setProfileError(msg);
      } finally {
        if (active) {
          setIsLoadingProfile(false);
        }
      }
    }

    void loadProfile();

    return () => {
      active = false;
    };
  }, [caregiverId]);

  const caregiverUserId = profile?.userId ?? null;

  useEffect(() => {
    if (!caregiverUserId) return;
    const targetUserId = caregiverUserId;
    let active = true;

    async function loadReviews() {
      setIsLoadingReviews(true);
      try {
        // CRITICAL: reviews endpoint requires Caregiver User.id (profile.userId), NOT CaregiverProfile.id
        const res = await reviewsApi.getByCaregiver(
          targetUserId,
          reviewsPage,
          REVIEWS_PER_PAGE,
        );
        if (!active) return;
        setReviews(res.data);
        setReviewsMeta(res.meta);
      } catch {
        if (!active) return;
        setReviews([]);
      } finally {
        if (active) {
          setIsLoadingReviews(false);
        }
      }
    }

    void loadReviews();

    return () => {
      active = false;
    };
  }, [caregiverUserId, reviewsPage]);

  const trimmedMessage = initialMessage.trim();
  const messageInvalid = trimmedMessage.length < MIN_INQUIRY_LENGTH;
  const showMessageError = messageTouched && messageInvalid;

  const handleOpenContactFlow = () => {
    if (authLoading) return;
    if (!isAuthenticated || !user) {
      router.push(`/login?redirect=${encodeURIComponent(`/caregivers/${caregiverId}`)}`);
      return;
    }
    if (user.role !== "CLIENT") {
      return;
    }
    setModalError(null);
    setMessageTouched(false);
    setIsContactModalOpen(true);
  };

  const handleSubmitContactRequest = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setMessageTouched(true);
    setModalError(null);

    if (!profile || messageInvalid) {
      return;
    }

    setIsSubmittingContact(true);
    try {
      // CRITICAL: contact-requests requires User.id (profile.userId), NOT CaregiverProfile.id
      await contactRequestsApi.create({
        caregiverId: profile.userId,
        initialMessage: trimmedMessage,
      });
      setIsContactModalOpen(false);
      setInitialMessage("");
      setMessageTouched(false);
      setInquirySentSuccess(true);
      toast.success(
        "Solicitud de contacto enviada",
        "Cuando el cuidador la acepte se desbloquearán sus datos directos.",
      );
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "No pudimos enviar la solicitud de contacto.";
      setModalError(msg);
    } finally {
      setIsSubmittingContact(false);
    }
  };

  if (isLoadingProfile) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="h-5 w-48 animate-pulse rounded bg-slate-200" />
        <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-8">
            <div className="h-48 animate-pulse rounded-[12px] border border-slate-200 bg-white" />
            <div className="h-64 animate-pulse rounded-[12px] border border-slate-200 bg-white" />
          </div>
          <div className="h-80 animate-pulse rounded-[12px] border border-slate-200 bg-white lg:col-span-4" />
        </div>
      </div>
    );
  }

  if (profileError || !profile) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <EmptyState
          title="Perfil no disponible"
          description={
            profileError ??
            "El perfil que buscas no existe o fue retirado del catálogo."
          }
          action={
            <Link
              href="/caregivers"
              className={buttonVariants({ variant: "primary" })}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Volver al directorio
            </Link>
          }
        />
      </div>
    );
  }

  const maskedName = formatMaskedName(profile.firstName, profile.lastName);
  const initials = getInitials(profile.firstName, profile.lastName);

  const approvedDocMap = new Map(
    (profile.documents ?? []).map((doc) => [doc.documentType, doc]),
  );
  const optionalApprovedDocs = (profile.documents ?? []).filter(
    (doc) => !REQUIRED_VERIFICATION_DOC_TYPES.includes(doc.documentType),
  );

  const hasOptionalRates =
    toNullableNumeric(profile.dailyRate8h) !== null ||
    toNullableNumeric(profile.dailyRate12h) !== null ||
    toNullableNumeric(profile.overnightRate) !== null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <div className="mb-6">
        <Link
          href="/caregivers"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition-colors hover:text-teal-700"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Volver al directorio de cuidadores
        </Link>
      </div>

      {/* Asymmetric 8/4 Layout */}
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        {/* Main Column (8 cols) */}
        <div className="space-y-6 lg:col-span-8">
          {/* Header Identity Card */}
          <section className="rounded-[12px] border border-slate-200 bg-white p-6 shadow-xs sm:p-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-teal-50 text-xl font-bold text-teal-700 ring-1 ring-teal-200">
                  {initials}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                      {maskedName}
                    </h1>
                    <BadgeVerified
                      verified={profile.isDocumentVerified}
                      size="md"
                    />
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-slate-600">
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin
                        className="h-4 w-4 text-teal-600"
                        aria-hidden
                      />
                      {profile.city || "Colombia"}
                      {profile.maxCoverageRadiusKm ? (
                        <span className="font-mono tabular-nums text-xs text-slate-500">
                          (radio {profile.maxCoverageRadiusKm} km)
                        </span>
                      ) : null}
                    </span>

                    <span className="inline-flex items-center gap-1.5">
                      <Briefcase
                        className="h-4 w-4 text-teal-600"
                        aria-hidden
                      />
                      <span className="font-mono tabular-nums font-semibold text-slate-900">
                        {profile.yearsOfExperience}
                      </span>{" "}
                      {profile.yearsOfExperience === 1
                        ? "año de experiencia"
                        : "años de experiencia"}
                    </span>
                  </div>

                  <div className="mt-3">
                    <RatingStars
                      rating={profile.ratingAverage}
                      reviewCount={profile.totalReviews}
                      size="md"
                    />
                  </div>
                </div>
              </div>
            </div>

            {profile.neighborhoods?.length > 0 ? (
              <div className="mt-5 border-t border-slate-100 pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Zonas o barrios de cobertura
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {profile.neighborhoods.map((neighborhood) => (
                    <span
                      key={neighborhood}
                      className="inline-flex items-center rounded-[8px] border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700"
                    >
                      {neighborhood}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {profile.specialties?.length > 0 ? (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Especialidades de cuidado
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {profile.specialties.map((spec) => (
                    <span
                      key={spec}
                      className="inline-flex items-center rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-medium text-teal-800"
                    >
                      {CARE_SPECIALTY_LABELS[spec] ?? spec}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </section>

          {/* Document Verification Breakdown */}
          <section className="rounded-[12px] border border-slate-200 bg-white p-6 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShieldCheck
                  className="h-5 w-5 text-teal-600"
                  aria-hidden
                />
                <h2 className="text-base font-semibold text-slate-900">
                  Estado de Verificación Documental
                </h2>
              </div>
              <BadgeVerified verified={profile.isDocumentVerified} />
            </div>
            <p className="mt-1.5 text-sm text-slate-600">
              Para obtener la insignia verificada, nuestro equipo valida identidad
              y antecedentes judiciales vigentes.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {REQUIRED_VERIFICATION_DOC_TYPES.map((docType: DocumentType) => {
                const approvedDoc = approvedDocMap.get(docType);
                const isApproved = Boolean(approvedDoc);

                return (
                  <div
                    key={docType}
                    className={`flex items-start gap-3 rounded-[10px] border p-3.5 ${
                      isApproved
                        ? "border-emerald-200 bg-emerald-50/60"
                        : "border-slate-200 bg-slate-50/70"
                    }`}
                  >
                    {isApproved ? (
                      <CheckCircle2
                        className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
                        aria-hidden
                      />
                    ) : (
                      <Clock
                        className="mt-0.5 h-4 w-4 shrink-0 text-slate-400"
                        aria-hidden
                      />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900">
                        {DOCUMENT_TYPE_LABELS[docType]}
                      </p>
                      <p
                        className={`mt-0.5 text-xs ${
                          isApproved ? "text-emerald-700" : "text-slate-500"
                        }`}
                      >
                        {isApproved && approvedDoc
                          ? `Aprobado el ${formatDate(approvedDoc.createdAt)}`
                          : "Pendiente de validación"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {optionalApprovedDocs.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {optionalApprovedDocs.map((doc) => (
                  <span
                    key={doc.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800"
                  >
                    <FileCheck2 className="h-3.5 w-3.5" aria-hidden />
                    {DOCUMENT_TYPE_LABELS[doc.documentType] ?? doc.documentType}
                  </span>
                ))}
              </div>
            ) : null}
          </section>

          {/* Biography */}
          <section className="rounded-[12px] border border-slate-200 bg-white p-6 shadow-xs">
            <h2 className="text-base font-semibold text-slate-900">
              Biografía y Enfoque de Cuidado
            </h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-700">
              {profile.bio?.trim() ||
                "Este cuidador aún no ha agregado una biografía detallada."}
            </p>
          </section>

          {/* Availability Matrix (Read-only) */}
          <section className="rounded-[12px] border border-slate-200 bg-white p-6 shadow-xs">
            <div className="mb-4">
              <h2 className="text-base font-semibold text-slate-900">
                Disponibilidad Semanal
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Turnos habituales declarados por el cuidador para coordinar
                servicios.
              </p>
            </div>
            <SchedulePicker
              value={profile.availability ?? []}
              readOnly
              showPresets={false}
            />
          </section>

          {/* Paginated Reviews */}
          <section className="rounded-[12px] border border-slate-200 bg-white p-6 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Reseñas de Familias
                </h2>
                <p className="mt-0.5 text-sm text-slate-600">
                  Opiniones verificadas de clientes tras finalizar un servicio.
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-[10px] border border-slate-200 bg-slate-50 px-3 py-1.5">
                <RatingStars
                  rating={profile.ratingAverage}
                  reviewCount={profile.totalReviews}
                  size="sm"
                />
              </div>
            </div>

            {isLoadingReviews ? (
              <div className="mt-4 space-y-3">
                {[1, 2].map((n) => (
                  <div
                    key={n}
                    className="h-24 animate-pulse rounded-[10px] border border-slate-100 bg-slate-50"
                  />
                ))}
              </div>
            ) : reviews.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  compact
                  title="Aún no hay reseñas publicadas"
                  description="Las calificaciones aparecen aquí una vez las familias evalúan un servicio finalizado con este cuidador."
                />
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <ul className="space-y-3">
                  {reviews.map((review) => (
                    <li
                      key={review.id}
                      className="rounded-[10px] border border-slate-200 bg-slate-50/50 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-xs font-semibold text-teal-800">
                            {getInitials(
                              review.client?.firstName,
                              review.client?.lastName,
                            )}
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {formatMaskedName(
                                review.client?.firstName,
                                review.client?.lastName,
                                "Familia",
                              )}
                            </p>
                            <p className="text-xs text-slate-500">
                              {formatDate(review.createdAt)}
                            </p>
                          </div>
                        </div>
                        <RatingStars
                          rating={review.rating}
                          showNumeric={false}
                          size="sm"
                        />
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-700">
                        {review.comment}
                      </p>
                    </li>
                  ))}
                </ul>

                <Pagination
                  meta={reviewsMeta}
                  onPageChange={(nextPage) => setReviewsPage(nextPage)}
                />
              </div>
            )}
          </section>
        </div>

        {/* Sticky Right Rail (4 cols) */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:col-span-4">
          {/* Pricing Summary */}
          <div className="rounded-[12px] border border-slate-200 bg-white p-6 shadow-xs">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Tarifa referencial
            </p>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="font-mono tabular-nums text-3xl font-bold tracking-tight text-slate-900">
                {formatCOP(profile.hourlyRate)}
              </span>
              <span className="text-sm font-medium text-slate-500">/ hora</span>
            </div>

            {hasOptionalRates ? (
              <dl className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm">
                {toNullableNumeric(profile.dailyRate8h) !== null ? (
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-slate-600">Turno día (8h)</dt>
                    <dd className="font-mono tabular-nums font-semibold text-slate-900">
                      {formatCOP(profile.dailyRate8h)}
                    </dd>
                  </div>
                ) : null}
                {toNullableNumeric(profile.dailyRate12h) !== null ? (
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-slate-600">Turno extendido (12h)</dt>
                    <dd className="font-mono tabular-nums font-semibold text-slate-900">
                      {formatCOP(profile.dailyRate12h)}
                    </dd>
                  </div>
                ) : null}
                {toNullableNumeric(profile.overnightRate) !== null ? (
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-slate-600">Turno nocturno</dt>
                    <dd className="font-mono tabular-nums font-semibold text-slate-900">
                      {formatCOP(profile.overnightRate)}
                    </dd>
                  </div>
                ) : null}
              </dl>
            ) : null}

            {/* Primary CTA */}
            <div className="mt-5 space-y-3 border-t border-slate-100 pt-5">
              {!authLoading && user && user.role !== "CLIENT" ? (
                <div className="rounded-[10px] border border-amber-200 bg-amber-50 p-3.5 text-xs leading-5 text-amber-900">
                  <div className="flex items-start gap-2">
                    <Info
                      className="mt-0.5 h-4 w-4 shrink-0 text-amber-700"
                      aria-hidden
                    />
                    <p>
                      Has iniciado sesión como{" "}
                      <strong>
                        {user.role === "CAREGIVER"
                          ? "Cuidador Profesional"
                          : "Administrador"}
                      </strong>
                      . Solo las cuentas de{" "}
                      <strong>Familia / Cliente</strong> pueden enviar
                      solicitudes de contacto directo.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    disabled={authLoading}
                    onClick={handleOpenContactFlow}
                    leftIcon={
                      <MessageSquarePlus className="h-4 w-4" aria-hidden />
                    }
                  >
                    Solicitar Contacto Directo
                  </Button>
                  {!authLoading && !isAuthenticated ? (
                    <p className="text-center text-xs text-slate-500">
                      Necesitas iniciar sesión como{" "}
                      <span className="font-medium text-slate-700">
                        Familia / Cliente
                      </span>{" "}
                      para enviar tu mensaje.
                    </p>
                  ) : null}
                </>
              )}

              {inquirySentSuccess ? (
                <div className="rounded-[10px] border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-900">
                  <p className="font-semibold">Solicitud registrada</p>
                  <p className="mt-0.5 leading-5 text-emerald-800">
                    Puedes hacer seguimiento a la respuesta desde tu bandeja.
                  </p>
                  <Link
                    href="/client/inquiries"
                    className="mt-2 inline-flex items-center font-semibold text-teal-800 underline underline-offset-2 hover:text-teal-950"
                  >
                    Ir a mis solicitudes →
                  </Link>
                </div>
              ) : null}
            </div>
          </div>

          <MaskedContactBanner
            unlocked={false}
            firstName={profile.firstName}
            lastName={profile.lastName}
            lockedTitle="Contacto directo protegido"
            lockedDescription="Por seguridad, el teléfono, correo y enlace de WhatsApp se desbloquean únicamente cuando el cuidador acepta tu solicitud."
          />
        </aside>
      </div>

      {/* Contact Request Modal (CLIENT only) */}
      <ModalDialog
        open={isContactModalOpen}
        onClose={() => {
          if (!isSubmittingContact) {
            setIsContactModalOpen(false);
          }
        }}
        title={`Solicitar contacto con ${maskedName}`}
        description="Cuéntale brevemente tus necesidades de cuidado, ciudad y horarios esperados. Tu teléfono y correo permanecerán ocultos hasta que acepte."
        size="md"
      >
        <form
          noValidate
          onSubmit={handleSubmitContactRequest}
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
            <div className="flex items-center justify-between">
              <label
                htmlFor={messageTextareaId}
                className="text-sm font-medium text-slate-800"
              >
                Mensaje inicial para el cuidador
              </label>
              <span
                className={`font-mono tabular-nums text-xs ${
                  trimmedMessage.length >= MIN_INQUIRY_LENGTH
                    ? "text-emerald-700"
                    : "text-slate-500"
                }`}
              >
                {trimmedMessage.length}/{MIN_INQUIRY_LENGTH} mín.
              </span>
            </div>
            <textarea
              id={messageTextareaId}
              rows={5}
              required
              minLength={MIN_INQUIRY_LENGTH}
              value={initialMessage}
              onChange={(e) => setInitialMessage(e.target.value)}
              onBlur={() => setMessageTouched(true)}
              aria-invalid={showMessageError ? true : undefined}
              placeholder="Ej. Hola, buscamos apoyo para el cuidado de mi madre en Bogotá de lunes a viernes en las tardes. ¿Tendrías disponibilidad para conversar esta semana?"
              className="w-full rounded-[8px] border border-slate-300 bg-white px-3 py-2.5 text-sm leading-6 text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
            />
            {showMessageError ? (
              <p role="alert" className="text-xs font-medium text-rose-600">
                Escribe al menos {MIN_INQUIRY_LENGTH} caracteres para describir
                tu solicitud.
              </p>
            ) : (
              <p className="text-xs text-slate-500">
                Mínimo {MIN_INQUIRY_LENGTH} caracteres. No incluyas datos
                bancarios en este primer mensaje.
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-slate-200 pt-4">
            <Button
              type="button"
              variant="secondary"
              disabled={isSubmittingContact}
              onClick={() => setIsContactModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isSubmittingContact}
              loadingText="Enviando..."
              leftIcon={<Send className="h-4 w-4" aria-hidden />}
            >
              Enviar solicitud
            </Button>
          </div>
        </form>
      </ModalDialog>
    </div>
  );
}
