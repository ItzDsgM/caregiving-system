'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  CalendarClock,
  Check,
  MapPin,
  Plus,
  Save,
  UserCog,
  X,
} from 'lucide-react';
import { BadgeVerified } from '@/components/ui/BadgeVerified';
import { Button, buttonVariants } from '@/components/ui/Button';
import { SchedulePicker } from '@/components/ui/SchedulePicker';
import { TabsBar, type TabOption } from '@/components/ui/TabsBar';
import { useToast } from '@/components/ui/ToastRegion';
import { ApiError, caregiversApi, extractErrorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { CARE_SPECIALTY_OPTIONS, COLOMBIAN_CITIES } from '@/lib/constants';
import { formatCOP, toNullableNumeric } from '@/lib/format';
import type {
  AvailabilitySlot,
  CaregiverProfile,
  CareSpecialty,
  UpdateCaregiverProfilePayload,
} from '@/lib/types';
import {
  CaregiverErrorBanner,
  CaregiverSectionSkeleton,
} from './CaregiverPortalFeedback';

type ProfileTabId = 'profile' | 'availability';

interface ProfileFormState {
  hourlyRate: string;
  dailyRate8h: string;
  dailyRate12h: string;
  overnightRate: string;
  yearsOfExperience: string;
  specialties: CareSpecialty[];
  bio: string;
  city: string;
  neighborhoods: string[];
  maxCoverageRadiusKm: string;
  availability: AvailabilitySlot[];
}

type FieldErrorMap = Partial<
  Record<
    | 'hourlyRate'
    | 'dailyRate8h'
    | 'dailyRate12h'
    | 'overnightRate'
    | 'yearsOfExperience'
    | 'bio'
    | 'maxCoverageRadiusKm',
    string
  >
>;

function profileToFormState(profile: CaregiverProfile): ProfileFormState {
  const toStr = (val: number | string | null | undefined): string => {
    const num = toNullableNumeric(val);
    return num !== null && num > 0 ? String(num) : '';
  };

  return {
    hourlyRate: toStr(profile.hourlyRate),
    dailyRate8h: toStr(profile.dailyRate8h),
    dailyRate12h: toStr(profile.dailyRate12h),
    overnightRate: toStr(profile.overnightRate),
    yearsOfExperience: String(
      Number.isFinite(profile.yearsOfExperience) ? profile.yearsOfExperience : 0,
    ),
    specialties: Array.isArray(profile.specialties)
      ? [...profile.specialties]
      : [],
    bio: profile.bio ?? '',
    city: profile.city ?? '',
    neighborhoods: Array.isArray(profile.neighborhoods)
      ? profile.neighborhoods.filter(Boolean)
      : [],
    maxCoverageRadiusKm:
      profile.maxCoverageRadiusKm && profile.maxCoverageRadiusKm >= 1
        ? String(profile.maxCoverageRadiusKm)
        : '',
    availability: Array.isArray(profile.availability)
      ? profile.availability.map((slot) => ({
          day: slot.day,
          shifts: [...slot.shifts],
        }))
      : [],
  };
}

function serializeFormSnapshot(state: ProfileFormState): string {
  const normalizedSlots = [...state.availability]
    .map((slot) => ({
      day: slot.day,
      shifts: [...slot.shifts].sort(),
    }))
    .sort((a, b) => a.day.localeCompare(b.day));

  return JSON.stringify({
    hourlyRate: state.hourlyRate.trim(),
    dailyRate8h: state.dailyRate8h.trim(),
    dailyRate12h: state.dailyRate12h.trim(),
    overnightRate: state.overnightRate.trim(),
    yearsOfExperience: state.yearsOfExperience.trim(),
    specialties: [...state.specialties].sort(),
    bio: state.bio,
    city: state.city.trim(),
    neighborhoods: state.neighborhoods.map((n) => n.trim()),
    maxCoverageRadiusKm: state.maxCoverageRadiusKm.trim(),
    availability: normalizedSlots,
  });
}

function validateFormState(
  state: ProfileFormState,
  initialBioWasPresent: boolean,
  initialHourlyRateWasPresent: boolean,
): FieldErrorMap {
  const errors: FieldErrorMap = {};

  if (state.hourlyRate.trim() === '' && initialHourlyRateWasPresent) {
    errors.hourlyRate = 'La tarifa por hora debe ser mayor a 0.';
  }

  const checkPositiveRate = (
    raw: string,
    key: 'hourlyRate' | 'dailyRate8h' | 'dailyRate12h' | 'overnightRate',
    label: string,
  ) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    const num = Number(trimmed);
    if (!Number.isFinite(num) || num <= 0) {
      errors[key] = `${label} debe ser un valor numérico mayor a 0.`;
    }
  };

  checkPositiveRate(state.hourlyRate, 'hourlyRate', 'La tarifa por hora');
  checkPositiveRate(state.dailyRate8h, 'dailyRate8h', 'La tarifa 8h');
  checkPositiveRate(state.dailyRate12h, 'dailyRate12h', 'La tarifa 12h');
  checkPositiveRate(state.overnightRate, 'overnightRate', 'La tarifa nocturna');

  if (state.yearsOfExperience.trim() !== '') {
    const years = Number(state.yearsOfExperience.trim());
    if (!Number.isInteger(years) || years < 0) {
      errors.yearsOfExperience =
        'Los años de experiencia deben ser un número entero mayor o igual a 0.';
    }
  }

  if (state.maxCoverageRadiusKm.trim() !== '') {
    const radius = Number(state.maxCoverageRadiusKm.trim());
    if (!Number.isInteger(radius) || radius < 1) {
      errors.maxCoverageRadiusKm =
        'El radio de cobertura debe ser un entero de al menos 1 km.';
    }
  }

  const trimmedBio = state.bio.trim();
  if (trimmedBio.length > 0 || initialBioWasPresent) {
    if (trimmedBio.length < 50 || trimmedBio.length > 1500) {
      errors.bio =
        'La biografía profesional debe tener entre 50 y 1500 caracteres.';
    }
  }

  return errors;
}

export function CaregiverProfileView() {
  const searchParams = useSearchParams();
  const toast = useToast();
  const { user, setUser } = useAuth();

  const tabParam: ProfileTabId =
    searchParams.get('tab') === 'availability' ? 'availability' : 'profile';

  const [tabOverride, setTabOverride] = useState<{
    key: ProfileTabId;
    tab: ProfileTabId;
  } | null>(null);
  const activeTab: ProfileTabId =
    tabOverride?.key === tabParam ? tabOverride.tab : tabParam;
  const setActiveTab = useCallback(
    (nextTab: ProfileTabId) => {
      setTabOverride({ key: tabParam, tab: nextTab });
    },
    [tabParam],
  );
  const [profile, setProfile] = useState<CaregiverProfile | null>(null);
  const [formState, setFormState] = useState<ProfileFormState | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState<string>('');
  const [savedFormState, setSavedFormState] =
    useState<ProfileFormState | null>(null);

  const [neighborhoodDraft, setNeighborhoodDraft] = useState('');
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  const triggerReload = useCallback(() => {
    setIsLoading(true);
    setLoadError(null);
    setReloadTick((prev) => prev + 1);
  }, []);

  useEffect(() => {
    let active = true;

    async function hydrateProfile() {
      try {
        const fetched = await caregiversApi.getMe();
        if (!active) return;
        const initial = profileToFormState(fetched);
        setProfile(fetched);
        setFormState(initial);
        setSavedFormState(initial);
        setSavedSnapshot(serializeFormSnapshot(initial));
        setLoadError(null);
      } catch (err) {
        if (!active) return;
        const msg =
          err instanceof ApiError
            ? err.message || extractErrorMessage(err.rawMessage, err.statusCode)
            : 'No pudimos cargar tu perfil profesional.';
        setLoadError(msg);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void hydrateProfile();

    return () => {
      active = false;
    };
  }, [reloadTick]);

  const isDirty = useMemo(() => {
    if (!formState) return false;
    return serializeFormSnapshot(formState) !== savedSnapshot;
  }, [formState, savedSnapshot]);

  const initialBioWasPresent = Boolean(profile?.bio && profile.bio.trim().length > 0);
  const initialHourlyRateWasPresent =
    toNullableNumeric(profile?.hourlyRate) !== null;

  const validationErrors = useMemo(() => {
    if (!formState) return {};
    return validateFormState(
      formState,
      initialBioWasPresent,
      initialHourlyRateWasPresent,
    );
  }, [formState, initialBioWasPresent, initialHourlyRateWasPresent]);

  const totalAvailabilityBlocks = useMemo(
    () =>
      (formState?.availability ?? []).reduce(
        (sum, slot) => sum + (slot.shifts?.length ?? 0),
        0,
      ),
    [formState],
  );

  const tabs: ReadonlyArray<TabOption<ProfileTabId>> = useMemo(
    () => [
      {
        id: 'profile',
        label: 'Perfil Profesional',
        icon: <UserCog className="h-4 w-4" aria-hidden />,
      },
      {
        id: 'availability',
        label: 'Disponibilidad Horaria',
        count: totalAvailabilityBlocks,
        icon: <CalendarClock className="h-4 w-4" aria-hidden />,
      },
    ],
    [totalAvailabilityBlocks],
  );

  const markTouched = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const getVisibleError = (
    field: keyof FieldErrorMap,
  ): string | undefined => {
    if (!hasAttemptedSubmit && !touched[field]) return undefined;
    return validationErrors[field];
  };

  const toggleSpecialty = (specialty: CareSpecialty) => {
    setFormState((prev) => {
      if (!prev) return prev;
      const exists = prev.specialties.includes(specialty);
      return {
        ...prev,
        specialties: exists
          ? prev.specialties.filter((item) => item !== specialty)
          : [...prev.specialties, specialty],
      };
    });
  };

  const addNeighborhoods = () => {
    const rawParts = neighborhoodDraft
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
    if (rawParts.length === 0) return;

    setFormState((prev) => {
      if (!prev) return prev;
      const seen = new Set(prev.neighborhoods.map((item) => item.toLowerCase()));
      const additions: string[] = [];
      for (const candidate of rawParts) {
        const key = candidate.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          additions.push(candidate);
        }
      }
      if (additions.length === 0) return prev;
      return {
        ...prev,
        neighborhoods: [...prev.neighborhoods, ...additions],
      };
    });
    setNeighborhoodDraft('');
  };

  const removeNeighborhood = (index: number) => {
    setFormState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        neighborhoods: prev.neighborhoods.filter((_, idx) => idx !== index),
      };
    });
  };

  const handleDiscardChanges = () => {
    if (!savedFormState) return;
    setFormState(savedFormState);
    setNeighborhoodDraft('');
    setTouched({});
    setHasAttemptedSubmit(false);
    setSubmitError(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formState || isSaving) return;

    setHasAttemptedSubmit(true);
    setSubmitError(null);

    const errors = validateFormState(
      formState,
      initialBioWasPresent,
      initialHourlyRateWasPresent,
    );
    if (Object.keys(errors).length > 0) {
      setActiveTab('profile');
      setSubmitError(
        'Revisa los campos marcados antes de guardar tus cambios.',
      );
      return;
    }

    // Build strict UpdateCaregiverProfileDto payload (forbidNonWhitelisted: true)
    const payload: UpdateCaregiverProfilePayload = {
      specialties: formState.specialties,
      neighborhoods: formState.neighborhoods
        .map((item) => item.trim())
        .filter(Boolean),
      availability: formState.availability.filter(
        (slot) => Array.isArray(slot.shifts) && slot.shifts.length > 0,
      ),
    };

    const trimmedBio = formState.bio.trim();
    if (trimmedBio.length >= 50) {
      payload.bio = trimmedBio;
    }

    if (formState.city.trim()) {
      payload.city = formState.city.trim();
    }

    if (formState.yearsOfExperience.trim() !== '') {
      payload.yearsOfExperience = Number(formState.yearsOfExperience.trim());
    }

    if (formState.maxCoverageRadiusKm.trim() !== '') {
      payload.maxCoverageRadiusKm = Number(
        formState.maxCoverageRadiusKm.trim(),
      );
    }

    if (formState.hourlyRate.trim() !== '') {
      payload.hourlyRate = Number(formState.hourlyRate.trim());
    }
    if (formState.dailyRate8h.trim() !== '') {
      payload.dailyRate8h = Number(formState.dailyRate8h.trim());
    }
    if (formState.dailyRate12h.trim() !== '') {
      payload.dailyRate12h = Number(formState.dailyRate12h.trim());
    }
    if (formState.overnightRate.trim() !== '') {
      payload.overnightRate = Number(formState.overnightRate.trim());
    }

    setIsSaving(true);
    try {
      const updated = await caregiversApi.updateMe(payload);
      const nextForm = profileToFormState(updated);
      setProfile(updated);
      setFormState(nextForm);
      setSavedFormState(nextForm);
      setSavedSnapshot(serializeFormSnapshot(nextForm));
      setTouched({});
      setHasAttemptedSubmit(false);
      setSubmitError(null);

      if (user) {
        setUser({ ...user, caregiverProfile: updated });
      }

      toast.success(
        'Perfil actualizado',
        'Tus tarifas, cobertura y disponibilidad semanal se guardaron correctamente.',
      );
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message || extractErrorMessage(err.rawMessage, err.statusCode)
          : 'No pudimos guardar los cambios de tu perfil.';
      setSubmitError(msg);
      toast.apiError(err, msg);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <CaregiverSectionSkeleton rows={3} />;
  }

  if (loadError || !formState || !profile) {
    return (
      <CaregiverErrorBanner
        message={loadError ?? 'Perfil de cuidador no disponible.'}
        onRetry={triggerReload}
      />
    );
  }

  const bioLength = formState.bio.trim().length;
  const bioError = getVisibleError('bio');

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Mi Perfil Profesional
            </h1>
            <BadgeVerified
              verified={profile.isDocumentVerified}
              label={
                profile.isDocumentVerified
                  ? 'Insignia Activa'
                  : 'Verificación Pendiente'
              }
            />
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Configura tus tarifas, especialidades, zonas de cobertura y turnos
            semanales visibles para las familias.
          </p>
        </div>

        <Link
          href={`/caregivers/${profile.id}`}
          className={buttonVariants({ variant: 'secondary', size: 'sm' })}
        >
          Ver ficha pública
        </Link>
      </div>

      {/* Internal Tabs */}
      <div className="rounded-[12px] border border-slate-200 bg-white">
        <div className="px-4 sm:px-6">
          <TabsBar
            tabs={tabs}
            activeTab={activeTab}
            onChange={setActiveTab}
            ariaLabel="Secciones de edición de perfil"
          />
        </div>

        {submitError ? (
          <div
            role="alert"
            className="mx-4 mt-4 flex items-start gap-2.5 rounded-[8px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 sm:mx-6"
          >
            <AlertCircle
              className="mt-0.5 h-4 w-4 shrink-0 text-rose-600"
              aria-hidden
            />
            <span>{submitError}</span>
          </div>
        ) : null}

        {/* Tab 1: Perfil Profesional */}
        <div
          id="tabpanel-profile"
          role="tabpanel"
          aria-labelledby="tab-profile"
          hidden={activeTab !== 'profile'}
          className="space-y-8 p-5 sm:p-6"
        >
          {/* Tarifas y Experiencia */}
          <fieldset className="space-y-4">
            <legend className="text-base font-semibold text-slate-900">
              Tarifas y experiencia
            </legend>
            <p className="text-xs text-slate-500">
              Todas las tarifas se muestran en pesos colombianos (COP) y
              ayudan a las familias a filtrar según su presupuesto.
            </p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label
                  htmlFor="hourlyRate"
                  className="block text-sm font-medium text-slate-800"
                >
                  Tarifa por hora (COP)
                </label>
                <div className="relative mt-1.5">
                  <input
                    id="hourlyRate"
                    type="number"
                    min={1}
                    step={500}
                    inputMode="numeric"
                    value={formState.hourlyRate}
                    onChange={(e) =>
                      setFormState((prev) =>
                        prev ? { ...prev, hourlyRate: e.target.value } : prev,
                      )
                    }
                    onBlur={() => markTouched('hourlyRate')}
                    aria-invalid={Boolean(getVisibleError('hourlyRate'))}
                    placeholder="25000"
                    className="w-full rounded-[8px] border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 tabular-nums focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
                  />
                </div>
                {getVisibleError('hourlyRate') ? (
                  <p className="mt-1 text-xs font-medium text-rose-600">
                    {getVisibleError('hourlyRate')}
                  </p>
                ) : (
                  <p className="mt-1 font-mono text-xs text-slate-500 tabular-nums">
                    Vista previa:{' '}
                    {formState.hourlyRate
                      ? formatCOP(formState.hourlyRate)
                      : 'Por definir'}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="yearsOfExperience"
                  className="block text-sm font-medium text-slate-800"
                >
                  Años de experiencia
                </label>
                <input
                  id="yearsOfExperience"
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  value={formState.yearsOfExperience}
                  onChange={(e) =>
                    setFormState((prev) =>
                      prev
                        ? { ...prev, yearsOfExperience: e.target.value }
                        : prev,
                    )
                  }
                  onBlur={() => markTouched('yearsOfExperience')}
                  aria-invalid={Boolean(getVisibleError('yearsOfExperience'))}
                  placeholder="3"
                  className="mt-1.5 w-full rounded-[8px] border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 tabular-nums focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
                />
                {getVisibleError('yearsOfExperience') ? (
                  <p className="mt-1 text-xs font-medium text-rose-600">
                    {getVisibleError('yearsOfExperience')}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-slate-500">
                    Entero mayor o igual a 0
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="dailyRate8h"
                  className="block text-sm font-medium text-slate-800"
                >
                  Tarifa jornada 8h (opcional)
                </label>
                <input
                  id="dailyRate8h"
                  type="number"
                  min={1}
                  step={1000}
                  inputMode="numeric"
                  value={formState.dailyRate8h}
                  onChange={(e) =>
                    setFormState((prev) =>
                      prev ? { ...prev, dailyRate8h: e.target.value } : prev,
                    )
                  }
                  onBlur={() => markTouched('dailyRate8h')}
                  aria-invalid={Boolean(getVisibleError('dailyRate8h'))}
                  placeholder="120000"
                  className="mt-1.5 w-full rounded-[8px] border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 tabular-nums focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
                />
                {getVisibleError('dailyRate8h') ? (
                  <p className="mt-1 text-xs font-medium text-rose-600">
                    {getVisibleError('dailyRate8h')}
                  </p>
                ) : (
                  <p className="mt-1 font-mono text-xs text-slate-500 tabular-nums">
                    {formState.dailyRate8h
                      ? formatCOP(formState.dailyRate8h)
                      : 'Sin definir'}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="dailyRate12h"
                  className="block text-sm font-medium text-slate-800"
                >
                  Tarifa jornada 12h (opcional)
                </label>
                <input
                  id="dailyRate12h"
                  type="number"
                  min={1}
                  step={1000}
                  inputMode="numeric"
                  value={formState.dailyRate12h}
                  onChange={(e) =>
                    setFormState((prev) =>
                      prev ? { ...prev, dailyRate12h: e.target.value } : prev,
                    )
                  }
                  onBlur={() => markTouched('dailyRate12h')}
                  aria-invalid={Boolean(getVisibleError('dailyRate12h'))}
                  placeholder="170000"
                  className="mt-1.5 w-full rounded-[8px] border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 tabular-nums focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
                />
                {getVisibleError('dailyRate12h') ? (
                  <p className="mt-1 text-xs font-medium text-rose-600">
                    {getVisibleError('dailyRate12h')}
                  </p>
                ) : (
                  <p className="mt-1 font-mono text-xs text-slate-500 tabular-nums">
                    {formState.dailyRate12h
                      ? formatCOP(formState.dailyRate12h)
                      : 'Sin definir'}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="overnightRate"
                  className="block text-sm font-medium text-slate-800"
                >
                  Tarifa nocturna (opcional)
                </label>
                <input
                  id="overnightRate"
                  type="number"
                  min={1}
                  step={1000}
                  inputMode="numeric"
                  value={formState.overnightRate}
                  onChange={(e) =>
                    setFormState((prev) =>
                      prev ? { ...prev, overnightRate: e.target.value } : prev,
                    )
                  }
                  onBlur={() => markTouched('overnightRate')}
                  aria-invalid={Boolean(getVisibleError('overnightRate'))}
                  placeholder="190000"
                  className="mt-1.5 w-full rounded-[8px] border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 tabular-nums focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
                />
                {getVisibleError('overnightRate') ? (
                  <p className="mt-1 text-xs font-medium text-rose-600">
                    {getVisibleError('overnightRate')}
                  </p>
                ) : (
                  <p className="mt-1 font-mono text-xs text-slate-500 tabular-nums">
                    {formState.overnightRate
                      ? formatCOP(formState.overnightRate)
                      : 'Sin definir'}
                  </p>
                )}
              </div>
            </div>
          </fieldset>

          {/* Especialidades */}
          <fieldset className="space-y-3 border-t border-slate-100 pt-6">
            <legend className="text-base font-semibold text-slate-900">
              Especialidades de cuidado
            </legend>
            <p className="text-xs text-slate-500">
              Marca las áreas en las que cuentas con experiencia y formación.
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {CARE_SPECIALTY_OPTIONS.map((option) => {
                const checked = formState.specialties.includes(option.value);
                return (
                  <label
                    key={option.value}
                    className={`flex cursor-pointer items-start gap-3 rounded-[10px] border p-3.5 transition-colors ${
                      checked
                        ? 'border-teal-500 bg-teal-50/50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSpecialty(option.value)}
                      className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-teal-600"
                    />
                    <div className="min-w-0">
                      <span className="block text-sm font-semibold text-slate-900">
                        {option.label}
                      </span>
                      <span className="mt-0.5 block text-xs leading-5 text-slate-600">
                        {option.description}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {/* Biografía */}
          <fieldset className="space-y-2 border-t border-slate-100 pt-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label
                htmlFor="bio"
                className="text-base font-semibold text-slate-900"
              >
                Biografía profesional
              </label>
              <span
                className={`font-mono text-xs tabular-nums ${
                  bioLength > 1500
                    ? 'font-semibold text-rose-600'
                    : bioLength >= 50
                      ? 'font-semibold text-emerald-700'
                      : 'text-slate-500'
                }`}
              >
                {bioLength} / 1500 caracteres (mínimo 50)
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Describe tu formación, tipo de pacientes que has atendido,
              habilidades médicas o terapéuticas y enfoque de cuidado.
            </p>
            <textarea
              id="bio"
              rows={5}
              maxLength={1500}
              value={formState.bio}
              onChange={(e) =>
                setFormState((prev) =>
                  prev ? { ...prev, bio: e.target.value } : prev,
                )
              }
              onBlur={() => markTouched('bio')}
              aria-invalid={Boolean(bioError)}
              placeholder="Ej: Auxiliar de enfermería con 6 años de experiencia en cuidado geriátrico, manejo seguro de movilidad, control de signos vitales y acompañamiento postoperatorio en casa."
              className="mt-1 w-full rounded-[8px] border border-slate-300 bg-white px-3.5 py-2.5 text-sm leading-6 text-slate-900 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
            />
            {bioError ? (
              <p className="text-xs font-medium text-rose-600">{bioError}</p>
            ) : bioLength > 0 && bioLength < 50 ? (
              <p className="font-mono text-xs text-amber-700 tabular-nums">
                Te faltan {50 - bioLength} caracteres para alcanzar el mínimo
                requerido.
              </p>
            ) : null}
          </fieldset>

          {/* Ubicación y Cobertura */}
          <fieldset className="space-y-4 border-t border-slate-100 pt-6">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-teal-600" aria-hidden />
              <legend className="text-base font-semibold text-slate-900">
                Ciudad y cobertura geográfica
              </legend>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="city"
                  className="block text-sm font-medium text-slate-800"
                >
                  Ciudad principal
                </label>
                <input
                  id="city"
                  type="text"
                  list="cc-colombian-cities"
                  value={formState.city}
                  onChange={(e) =>
                    setFormState((prev) =>
                      prev ? { ...prev, city: e.target.value } : prev,
                    )
                  }
                  placeholder="Bogotá"
                  className="mt-1.5 w-full rounded-[8px] border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
                />
                <datalist id="cc-colombian-cities">
                  {COLOMBIAN_CITIES.map((city) => (
                    <option key={city} value={city} />
                  ))}
                </datalist>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {COLOMBIAN_CITIES.slice(0, 5).map((suggestedCity) => {
                    const isSelected =
                      formState.city.trim().toLowerCase() ===
                      suggestedCity.toLowerCase();
                    return (
                      <button
                        key={suggestedCity}
                        type="button"
                        onClick={() =>
                          setFormState((prev) =>
                            prev ? { ...prev, city: suggestedCity } : prev,
                          )
                        }
                        className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors cursor-pointer ${
                          isSelected
                            ? 'border-teal-600 bg-teal-50 font-semibold text-teal-800'
                            : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-teal-300 hover:text-teal-800'
                        }`}
                      >
                        {suggestedCity}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label
                  htmlFor="maxCoverageRadiusKm"
                  className="block text-sm font-medium text-slate-800"
                >
                  Radio máximo de desplazamiento (km)
                </label>
                <input
                  id="maxCoverageRadiusKm"
                  type="number"
                  min={1}
                  step={1}
                  inputMode="numeric"
                  value={formState.maxCoverageRadiusKm}
                  onChange={(e) =>
                    setFormState((prev) =>
                      prev
                        ? { ...prev, maxCoverageRadiusKm: e.target.value }
                        : prev,
                    )
                  }
                  onBlur={() => markTouched('maxCoverageRadiusKm')}
                  aria-invalid={Boolean(getVisibleError('maxCoverageRadiusKm'))}
                  placeholder="15"
                  className="mt-1.5 w-full rounded-[8px] border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 tabular-nums focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
                />
                {getVisibleError('maxCoverageRadiusKm') ? (
                  <p className="mt-1 text-xs font-medium text-rose-600">
                    {getVisibleError('maxCoverageRadiusKm')}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-slate-500">
                    Mínimo 1 km desde tu ubicación base.
                  </p>
                )}
              </div>
            </div>

            {/* Neighborhoods Tag/Chip Input */}
            <div>
              <label
                htmlFor="neighborhoodInput"
                className="block text-sm font-medium text-slate-800"
              >
                Barrios o sectores cubiertos
              </label>
              <p className="mt-0.5 text-xs text-slate-500">
                Escribe un barrio o varios separados por coma (ej: Usaquén,
                Chapinero, Suba) y presiona Enter o Agregar.
              </p>

              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <input
                  id="neighborhoodInput"
                  type="text"
                  value={neighborhoodDraft}
                  onChange={(e) => setNeighborhoodDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addNeighborhoods();
                    }
                  }}
                  placeholder="Ej: Chapinero, Cedritos, Laureles"
                  className="flex-1 rounded-[8px] border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
                />
                <Button
                  variant="secondary"
                  size="md"
                  onClick={addNeighborhoods}
                  disabled={!neighborhoodDraft.trim()}
                  leftIcon={<Plus className="h-4 w-4" aria-hidden />}
                >
                  Agregar barrio
                </Button>
              </div>

              {formState.neighborhoods.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {formState.neighborhoods.map((neighborhood, index) => (
                    <span
                      key={`${neighborhood}-${index}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-medium text-teal-900"
                    >
                      <span>{neighborhood}</span>
                      <button
                        type="button"
                        onClick={() => removeNeighborhood(index)}
                        aria-label={`Eliminar barrio ${neighborhood}`}
                        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-teal-700 transition-colors hover:bg-teal-200/70 hover:text-teal-950 cursor-pointer"
                      >
                        <X className="h-3 w-3" aria-hidden />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-xs text-slate-500">
                  Aún no has agregado barrios específicos.
                </p>
              )}
            </div>
          </fieldset>
        </div>

        {/* Tab 2: Disponibilidad Horaria */}
        <div
          id="tabpanel-availability"
          role="tabpanel"
          aria-labelledby="tab-availability"
          hidden={activeTab !== 'availability'}
          className="space-y-4 p-5 sm:p-6"
        >
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Agenda de disponibilidad semanal (7×3)
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Marca los días y jornadas en las que puedes aceptar servicios.
              Usa los atajos superiores para completar rápidamente tu semana.
            </p>
          </div>

          <SchedulePicker
            value={formState.availability}
            onChange={(nextSlots) =>
              setFormState((prev) =>
                prev ? { ...prev, availability: nextSlots } : prev,
              )
            }
          />
        </div>
      </div>

      {/* Sticky Bottom Save Bar */}
      <div className="sticky bottom-4 z-20 flex flex-col gap-3 rounded-[12px] border border-slate-200 bg-white/95 px-4 py-3.5 shadow-lg backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-2.5 text-sm">
          {isDirty ? (
            <>
              <span
                aria-hidden
                className="h-2.5 w-2.5 rounded-full bg-amber-500"
              />
              <span className="font-medium text-amber-900">
                Tienes cambios sin guardar
              </span>
            </>
          ) : (
            <>
              <Check className="h-4 w-4 text-emerald-600" aria-hidden />
              <span className="text-slate-600">
                Todos los cambios están guardados
              </span>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2.5">
          {isDirty ? (
            <Button
              variant="ghost"
              size="md"
              onClick={handleDiscardChanges}
              disabled={isSaving}
            >
              Descartar
            </Button>
          ) : null}
          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={isSaving}
            loadingText="Guardando..."
            disabled={!isDirty}
            leftIcon={<Save className="h-4 w-4" aria-hidden />}
          >
            Guardar Cambios
          </Button>
        </div>
      </div>
    </form>
  );
}
