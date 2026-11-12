'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, History } from 'lucide-react';
import { caregiversApi, historyApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatFullName } from '@/lib/format';
import type { ClientHistoryItem, PublicCaregiverDetail } from '@/lib/types';
import { BadgeVerified } from '@/components/ui/BadgeVerified';
import { Button, buttonVariants } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/ToastRegion';
import { ClientPageHeader, PageLoadingSkeleton } from './ClientUiHelpers';
import { ReviewForm } from './ReviewForm';
import {
  getReviewedCaregiverRecord,
  useReviewedCaregivers,
} from './storage';

export function NewReviewView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const toast = useToast();
  const reviewedMap = useReviewedCaregivers();

  const queryCaregiverId = (searchParams.get('caregiverId') || '').trim();
  const queryOfferTitle = (searchParams.get('offerTitle') || '').trim();

  const [selectedCaregiverId, setSelectedCaregiverId] =
    useState<string>(queryCaregiverId);
  const [selectedOfferTitle, setSelectedOfferTitle] =
    useState<string>(queryOfferTitle);

  const [caregiverProfile, setCaregiverProfile] =
    useState<PublicCaregiverDetail | null>(null);
  const [completedServices, setCompletedServices] = useState<ClientHistoryItem[]>(
    [],
  );
  const [isLoadingContext, setIsLoadingContext] = useState(true);

  const effectiveCaregiverId = queryCaregiverId || selectedCaregiverId;
  const effectiveOfferTitle = queryOfferTitle || selectedOfferTitle;

  useEffect(() => {
    let cancelled = false;

    async function loadReviewContext() {
      try {
        if (effectiveCaregiverId) {
          const profile = await caregiversApi
            .getPublicProfile(effectiveCaregiverId)
            .catch(() => null);
          if (!cancelled) {
            setCaregiverProfile(profile);
          }
        } else {
          const historyRes = await historyApi
            .getClientHistory({ status: 'COMPLETED', limit: 20 })
            .catch(() => null);
          if (!cancelled && historyRes) {
            setCompletedServices(historyRes.data);
          }
        }
      } finally {
        if (!cancelled) {
          setIsLoadingContext(false);
        }
      }
    }

    void loadReviewContext();
    return () => {
      cancelled = true;
    };
  }, [effectiveCaregiverId]);

  const existingReviewRecord = effectiveCaregiverId
    ? getReviewedCaregiverRecord(reviewedMap, user?.id, effectiveCaregiverId)
    : null;

  const caregiverDisplayName = caregiverProfile
    ? formatFullName(caregiverProfile.firstName, caregiverProfile.lastName)
    : 'Cuidador seleccionado';

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <ClientPageHeader
        backHref="/client/history"
        backLabel="Volver al Historial"
        title="Calificar Servicio"
        description="Comparte tu experiencia real para ayudar a otras familias de CareConnect a elegir cuidadores confiables."
      />

      {isLoadingContext ? (
        <PageLoadingSkeleton cards={1} />
      ) : !effectiveCaregiverId ? (
        completedServices.length === 0 ? (
          <EmptyState
            icon={<History className="h-6 w-6" aria-hidden />}
            title="Selecciona un servicio completado desde tu historial"
            description="Solo puedes publicar reseñas para cuidadores con los que hayas tenido una contratación o contacto aceptado."
            action={
              <Link
                href="/client/history?status=COMPLETED"
                className={buttonVariants({ variant: 'primary', size: 'md' })}
              >
                Ir a mi historial
              </Link>
            }
          />
        ) : (
          <section className="space-y-4 rounded-[12px] border border-slate-200 bg-white p-6">
            <h2 className="text-base font-semibold text-slate-900">
              Elige el servicio que deseas calificar
            </h2>
            <p className="text-xs text-slate-600">
              Selecciona uno de tus contratos completados para abrir el formulario de reseña.
            </p>
            <div className="space-y-3">
              {completedServices.map((item) => {
                const alreadyRated = Boolean(
                  getReviewedCaregiverRecord(
                    reviewedMap,
                    user?.id,
                    item.caregiver.id,
                  ),
                );
                const fullName = formatFullName(
                  item.caregiver.firstName,
                  item.caregiver.lastName,
                );

                return (
                  <div
                    key={item.contractId}
                    className="flex flex-col gap-3 rounded-[12px] border border-slate-200 bg-slate-50/70 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {fullName}
                      </p>
                      <p className="text-xs text-slate-600">{item.offerTitle}</p>
                    </div>
                    {alreadyRated ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                        Reseña enviada
                      </span>
                    ) : (
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          setSelectedCaregiverId(item.caregiver.id);
                          setSelectedOfferTitle(item.offerTitle);
                        }}
                      >
                        Calificar
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )
      ) : (
        <section className="space-y-5 rounded-[12px] border border-slate-200 bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-slate-200 bg-slate-50 px-4 py-3.5">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Cuidador a evaluar
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-slate-900">
                  {caregiverDisplayName}
                </p>
                {caregiverProfile ? (
                  <BadgeVerified
                    verified={caregiverProfile.isDocumentVerified}
                    hideWhenUnverified
                  />
                ) : null}
              </div>
              {effectiveOfferTitle ? (
                <p className="mt-0.5 text-xs text-slate-600">
                  {effectiveOfferTitle}
                </p>
              ) : null}
            </div>
          </div>

          {existingReviewRecord ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-[12px] border border-emerald-200 bg-emerald-50 p-4">
                <CheckCircle2
                  className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700"
                  aria-hidden
                />
                <div>
                  <p className="text-sm font-semibold text-emerald-950">
                    Ya enviaste una reseña para este cuidador
                  </p>
                  <p className="mt-0.5 text-xs text-emerald-800">
                    Calificación registrada:{' '}
                    <span className="font-mono font-semibold tabular-nums">
                      {existingReviewRecord.rating}/5
                    </span>
                    . Solo se permite una evaluación por relación cliente-cuidador.
                  </p>
                </div>
              </div>
              <Link
                href="/client/history"
                className={buttonVariants({ variant: 'secondary', size: 'md' })}
              >
                Volver al historial
              </Link>
            </div>
          ) : (
            <ReviewForm
              caregiverId={effectiveCaregiverId}
              onSuccess={() => {
                toast.success(
                  'Reseña publicada',
                  'Tu calificación ya hace parte de la reputación del cuidador.',
                );
                router.push('/client/history');
              }}
              onError={(msg) => toast.error('No se pudo publicar la reseña', msg)}
              cancelAction={
                <Link
                  href="/client/history"
                  className={buttonVariants({
                    variant: 'secondary',
                    size: 'md',
                  })}
                >
                  Cancelar
                </Link>
              }
            />
          )}
        </section>
      )}
    </div>
  );
}
