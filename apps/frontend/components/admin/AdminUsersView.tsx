'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Ban,
  Check,
  Copy,
  Database,
  Info,
  KeyRound,
  RefreshCw,
  RotateCcw,
  Search,
  UserPlus,
  Users,
} from 'lucide-react';
import { BulkCreateUsersModal } from '@/components/admin/BulkCreateUsersModal';
import {
  RoleChangeModal,
  type RoleChangeTarget,
} from '@/components/admin/RoleChangeModal';
import {
  SuspendUserModal,
  type SuspendUserTarget,
} from '@/components/admin/SuspendUserModal';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/ToastRegion';
import {
  adminApi,
  discoverAdminUsersFromSources,
  getAdminUsersRegistry,
  upsertAdminUsersRegistry,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { USER_ROLE_LABELS } from '@/lib/constants';
import { formatFullName } from '@/lib/format';
import type {
  AdminSeedResponse,
  TrackedAdminUserRecord,
  User,
  UserRole,
} from '@/lib/types';

type SortKey = 'name' | 'email' | 'role' | 'status';
type SortDir = 'asc' | 'desc';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SOURCE_LABELS: Record<TrackedAdminUserRecord['source'], string> = {
  bulk_create: 'Creación masiva',
  pending_docs: 'Cola documental',
  caregiver_search: 'Catálogo público',
  manual_lookup: 'Gestión directa',
};

function UsersSkeleton() {
  return (
    <div className="space-y-4 animate-pulse" aria-busy="true">
      <div className="h-20 rounded-[12px] border border-slate-200 bg-white" />
      <div className="h-24 rounded-[12px] border border-slate-200 bg-white" />
      <div className="h-72 rounded-[12px] border border-slate-200 bg-white" />
    </div>
  );
}

/**
 * F3 User & Role Console (Linear / Vercel style).
 * Uses local registry + multi-source discovery since backend exposes no GET /admin/users endpoint.
 */
export function AdminUsersView() {
  const toast = useToast();
  const { user: currentUser } = useAuth();

  const [records, setRecords] = useState<TrackedAdminUserRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>(
    'ALL',
  );
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // Direct UUID operation bar
  const [directUuid, setDirectUuid] = useState('');
  const [directRole, setDirectRole] = useState<UserRole>('CAREGIVER');
  const [directUuidError, setDirectUuidError] = useState<string | null>(null);

  // Modals & action states
  const [isBulkCreateOpen, setIsBulkCreateOpen] = useState(false);
  const [suspendTarget, setSuspendTarget] = useState<SuspendUserTarget | null>(
    null,
  );
  const [roleTarget, setRoleTarget] = useState<RoleChangeTarget | null>(null);
  const [reactivatingId, setReactivatingId] = useState<string | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [lastSeedResult, setLastSeedResult] = useState<AdminSeedResponse | null>(
    null,
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const syncWithCurrentAdmin = useCallback(
    (list: TrackedAdminUserRecord[]): TrackedAdminUserRecord[] => {
      if (!currentUser) return list;
      return upsertAdminUsersRegistry([
        {
          id: currentUser.id,
          email: currentUser.email,
          firstName: currentUser.firstName,
          lastName: currentUser.lastName,
          phone: currentUser.phone,
          role: currentUser.role,
          isActive: currentUser.isActive,
          suspensionReason: currentUser.suspensionReason,
          source: 'manual_lookup',
          updatedAt: currentUser.updatedAt,
        },
      ]);
    },
    [currentUser],
  );

  useEffect(() => {
    let active = true;

    discoverAdminUsersFromSources()
      .then((discovered) => {
        if (!active) return;
        const synced = syncWithCurrentAdmin(discovered);
        setRecords(synced);
      })
      .catch(() => {
        if (!active) return;
        setRecords(syncWithCurrentAdmin(getAdminUsersRegistry()));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [syncWithCurrentAdmin]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const discovered = await discoverAdminUsersFromSources();
      setRecords(syncWithCurrentAdmin(discovered));
    } catch (err) {
      toast.apiError(err, 'No pudimos sincronizar las fuentes locales.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCopyUuid = async (uuid: string) => {
    try {
      await navigator.clipboard.writeText(uuid);
      setCopiedId(uuid);
      setTimeout(() => {
        setCopiedId((prev) => (prev === uuid ? null : prev));
      }, 1800);
    } catch {
      toast.info('UUID de usuario', uuid);
    }
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const knownActiveAdminCount = useMemo(
    () =>
      records.filter((r) => r.role === 'ADMIN' && r.isActive !== false).length,
    [records],
  );

  const filteredAndSorted = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = records.filter((rec) => {
      if (roleFilter !== 'ALL' && rec.role !== roleFilter) return false;
      if (statusFilter === 'ACTIVE' && !rec.isActive) return false;
      if (statusFilter === 'SUSPENDED' && rec.isActive) return false;
      if (!q) return true;

      const name = formatFullName(rec.firstName, rec.lastName).toLowerCase();
      const email = (rec.email || '').toLowerCase();
      const id = rec.id.toLowerCase();
      return name.includes(q) || email.includes(q) || id.includes(q);
    });

    const mult = sortDir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (sortKey === 'name') {
        const na = formatFullName(a.firstName, a.lastName);
        const nb = formatFullName(b.firstName, b.lastName);
        return na.localeCompare(nb, 'es') * mult;
      }
      if (sortKey === 'email') {
        return (a.email || '').localeCompare(b.email || '', 'es') * mult;
      }
      if (sortKey === 'role') {
        return a.role.localeCompare(b.role) * mult;
      }
      const sa = a.isActive ? 1 : 0;
      const sb = b.isActive ? 1 : 0;
      return (sa - sb) * mult;
    });
  }, [records, searchQuery, roleFilter, statusFilter, sortKey, sortDir]);

  const validateDirectUuid = (): string | null => {
    const trimmed = directUuid.trim();
    if (!UUID_REGEX.test(trimmed)) {
      setDirectUuidError(
        'Ingresa un UUID v4 válido (ej: 3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b).',
      );
      return null;
    }
    setDirectUuidError(null);
    return trimmed;
  };

  const handleDirectRoleClick = () => {
    const uuid = validateDirectUuid();
    if (!uuid) return;
    const existing = records.find((r) => r.id === uuid);
    setRoleTarget({
      id: uuid,
      label: existing
        ? formatFullName(existing.firstName, existing.lastName)
        : 'Usuario por UUID directo',
      email: existing?.email,
      currentRole: existing?.role,
      nextRole: directRole,
    });
  };

  const handleDirectSuspendClick = () => {
    const uuid = validateDirectUuid();
    if (!uuid) return;
    const existing = records.find((r) => r.id === uuid);
    if (existing?.role === 'ADMIN') {
      toast.warning(
        'Acción bloqueada',
        'Las cuentas con rol ADMIN no pueden ser suspendidas.',
      );
      return;
    }
    setSuspendTarget({
      id: uuid,
      label: existing
        ? formatFullName(existing.firstName, existing.lastName)
        : 'Usuario por UUID directo',
      email: existing?.email,
      role: existing?.role,
    });
  };

  const handleReactivate = async (uuid: string, label?: string) => {
    setReactivatingId(uuid);
    try {
      const updated = await adminApi.updateUserStatus(uuid, { isActive: true });
      setRecords(getAdminUsersRegistry());
      toast.success(
        'Cuenta reactivada',
        `${label || formatFullName(updated.firstName, updated.lastName)} volvió a estar activa.`,
      );
    } catch (err) {
      toast.apiError(err, 'No pudimos reactivar la cuenta.');
    } finally {
      setReactivatingId(null);
    }
  };

  const handleDirectReactivateClick = () => {
    const uuid = validateDirectUuid();
    if (!uuid) return;
    void handleReactivate(uuid);
  };

  const handleSeedDemo = async () => {
    setIsSeeding(true);
    try {
      const res = await adminApi.seedDatabase();
      setLastSeedResult(res);
      const discovered = await discoverAdminUsersFromSources();
      setRecords(syncWithCurrentAdmin(discovered));
      toast.success(
        'Base de datos sembrada',
        `${res.counts.users} usuarios totales (${res.counts.caregivers} cuidadores, ${res.counts.clients} clientes, ${res.counts.jobOffers} ofertas).`,
      );
    } catch (err) {
      toast.apiError(err, 'No se pudo ejecutar Seed Demo.');
    } finally {
      setIsSeeding(false);
    }
  };

  const handleBulkCreated = (createdUsers: User[]) => {
    setIsBulkCreateOpen(false);
    setRecords(getAdminUsersRegistry());
    toast.success(
      'Usuarios creados en lote',
      `Se aprovisionaron ${createdUsers.length} cuenta(s) y se añadieron al directorio.`,
    );
  };

  const handleSuspended = (updatedUser: User) => {
    setSuspendTarget(null);
    setRecords(getAdminUsersRegistry());
    toast.info(
      'Usuario suspendido',
      `${formatFullName(updatedUser.firstName, updatedUser.lastName)} fue desactivado.`,
    );
  };

  const handleRoleUpdated = (updatedUser: User) => {
    setRoleTarget(null);
    setRecords(getAdminUsersRegistry());
    toast.success(
      'Rol actualizado',
      `${formatFullName(updatedUser.firstName, updatedUser.lastName)} ahora tiene rol ${USER_ROLE_LABELS[updatedUser.role]}.`,
    );
  };

  const renderSortIcon = (key: SortKey) => {
    if (sortKey !== key) {
      return <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" aria-hidden />;
    }
    return sortDir === 'asc' ? (
      <ArrowUp className="h-3.5 w-3.5 text-teal-700" aria-hidden />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-teal-700" aria-hidden />
    );
  };

  if (isLoading) {
    return <UsersSkeleton />;
  }

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Gestión de Usuarios y Roles
          </h1>
          <p className="mt-0.5 text-sm text-slate-600">
            Administra cuentas, permisos RBAC, aprovisionamiento masivo y
            suspensiones en cascada.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleRefresh}
            loading={isRefreshing}
            leftIcon={<RefreshCw className="h-3.5 w-3.5" aria-hidden />}
          >
            Sincronizar fuentes
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSeedDemo}
            loading={isSeeding}
            loadingText="Sembrando..."
            leftIcon={<Database className="h-3.5 w-3.5" aria-hidden />}
          >
            Seed Demo
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => setIsBulkCreateOpen(true)}
            leftIcon={<UserPlus className="h-3.5 w-3.5" aria-hidden />}
          >
            Creación Masiva
          </Button>
        </div>
      </div>

      {/* Informational Registry Notice */}
      <div className="flex items-start gap-3 rounded-[12px] border border-slate-200 bg-white px-4 py-3 text-xs leading-5 text-slate-700 shadow-2xs">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" aria-hidden />
        <div>
          <p className="font-semibold text-slate-900">
            Directorio consolidado de cuentas rastreadas localmente
          </p>
          <p className="mt-0.5 text-slate-600">
            El backend actual no expone un listado global{' '}
            <code className="font-mono text-[11px] text-slate-800">
              GET /api/v1/admin/users
            </code>
            . Esta consola consolida cuentas descubiertas desde aprovisionamiento
            masivo, seed de demostración, cola documental pendiente, perfiles
            públicos de cuidadores y operaciones directas por UUID.
          </p>
        </div>
      </div>

      {/* Seed Result Banner */}
      {lastSeedResult ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-900">
          <div>
            <span className="font-semibold">{lastSeedResult.message}:</span>{' '}
            <span className="font-mono tabular-nums">
              {lastSeedResult.counts.users} usuarios ·{' '}
              {lastSeedResult.counts.caregivers} cuidadores ·{' '}
              {lastSeedResult.counts.clients} clientes ·{' '}
              {lastSeedResult.counts.jobOffers} ofertas ·{' '}
              {lastSeedResult.counts.reviews} reseñas
            </span>
          </div>
          <button
            type="button"
            onClick={() => setLastSeedResult(null)}
            className="text-xs font-medium text-emerald-800 hover:underline cursor-pointer"
          >
            Ocultar
          </button>
        </div>
      ) : null}

      {/* Direct UUID Management Bar */}
      <section
        aria-label="Operación directa por UUID"
        className="rounded-[12px] border border-slate-200 bg-white p-4 shadow-2xs"
      >
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-teal-600" aria-hidden />
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-700">
            Operación directa sobre cualquier UUID de usuario
          </h2>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2.5 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-5">
            <label htmlFor="direct-uuid-input" className="sr-only">
              UUID del usuario
            </label>
            <input
              id="direct-uuid-input"
              type="text"
              value={directUuid}
              onChange={(e) => {
                setDirectUuid(e.target.value);
                if (directUuidError) setDirectUuidError(null);
              }}
              aria-invalid={directUuidError ? 'true' : undefined}
              placeholder="Ej: 3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b"
              spellCheck={false}
              className="h-9 w-full rounded-[8px] border border-slate-300 bg-slate-50 px-3 font-mono text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:col-span-7">
            <select
              value={directRole}
              onChange={(e) => setDirectRole(e.target.value as UserRole)}
              aria-label="Rol destino para UUID directo"
              className="h-9 rounded-[8px] border border-slate-300 bg-white px-2.5 text-xs text-slate-800 focus:border-teal-600 focus:outline-none"
            >
              <option value="CLIENT">{USER_ROLE_LABELS.CLIENT}</option>
              <option value="CAREGIVER">{USER_ROLE_LABELS.CAREGIVER}</option>
              <option value="ADMIN">{USER_ROLE_LABELS.ADMIN}</option>
            </select>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleDirectRoleClick}
            >
              Cambiar rol
            </Button>
            <Button
              type="button"
              variant="danger-outline"
              size="sm"
              onClick={handleDirectSuspendClick}
              leftIcon={<Ban className="h-3.5 w-3.5" aria-hidden />}
            >
              Suspender
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDirectReactivateClick}
              loading={reactivatingId === directUuid.trim()}
              leftIcon={<RotateCcw className="h-3.5 w-3.5" aria-hidden />}
            >
              Reactivar
            </Button>
          </div>
        </div>

        {directUuidError ? (
          <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-rose-600">
            <AlertCircle className="h-3.5 w-3.5" aria-hidden />
            {directUuidError}
          </p>
        ) : null}
      </section>

      {/* Filters Toolbar */}
      <section
        aria-label="Filtros del directorio"
        className="flex flex-col gap-2.5 rounded-[12px] border border-slate-200 bg-white p-3.5 shadow-2xs sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filtrar por nombre, correo o UUID..."
            aria-label="Buscar usuarios"
            className="h-9 w-full rounded-[8px] border border-slate-200 bg-slate-50 pr-3 pl-9 text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:bg-white focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as 'ALL' | UserRole)}
            aria-label="Filtrar por rol"
            className="h-9 rounded-[8px] border border-slate-200 bg-white px-2.5 text-xs text-slate-700 focus:border-teal-600 focus:outline-none"
          >
            <option value="ALL">Todos los roles</option>
            <option value="CLIENT">Cliente</option>
            <option value="CAREGIVER">Cuidador</option>
            <option value="ADMIN">Administrador</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(
                e.target.value as 'ALL' | 'ACTIVE' | 'SUSPENDED',
              )
            }
            aria-label="Filtrar por estado"
            className="h-9 rounded-[8px] border border-slate-200 bg-white px-2.5 text-xs text-slate-700 focus:border-teal-600 focus:outline-none"
          >
            <option value="ALL">Todos los estados</option>
            <option value="ACTIVE">Activos</option>
            <option value="SUSPENDED">Suspendidos</option>
          </select>

          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-xs text-slate-600 tabular-nums">
            {filteredAndSorted.length} cuenta
            {filteredAndSorted.length === 1 ? '' : 's'}
          </span>
        </div>
      </section>

      {/* Sortable Responsive Table */}
      {filteredAndSorted.length === 0 ? (
        <EmptyState
          icon={<Users className="h-6 w-6" aria-hidden />}
          title="No hay cuentas que coincidan"
          description={
            records.length === 0
              ? 'Ejecuta "Seed Demo", crea usuarios con "Creación Masiva" o gestiona una cuenta ingresando su UUID arriba.'
              : 'Prueba limpiando los filtros de búsqueda, rol o estado.'
          }
          action={
            records.length > 0 ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setRoleFilter('ALL');
                  setStatusFilter('ALL');
                }}
              >
                Limpiar filtros
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="cc-table-container rounded-[12px] border border-slate-200 bg-white shadow-2xs">
          <table className="cc-responsive-table text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <th
                  scope="col"
                  aria-sort={
                    sortKey === 'name'
                      ? sortDir === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : undefined
                  }
                  className="px-4 py-3"
                >
                  <button
                    type="button"
                    onClick={() => handleSort('name')}
                    className="inline-flex items-center gap-1.5 font-semibold text-slate-700 hover:text-slate-900 cursor-pointer"
                  >
                    <span>Usuario</span>
                    {renderSortIcon('name')}
                  </button>
                </th>

                <th
                  scope="col"
                  aria-sort={
                    sortKey === 'email'
                      ? sortDir === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : undefined
                  }
                  className="px-4 py-3"
                >
                  <button
                    type="button"
                    onClick={() => handleSort('email')}
                    className="inline-flex items-center gap-1.5 font-semibold text-slate-700 hover:text-slate-900 cursor-pointer"
                  >
                    <span>Correo</span>
                    {renderSortIcon('email')}
                  </button>
                </th>

                <th scope="col" className="px-4 py-3">
                  UUID
                </th>

                <th
                  scope="col"
                  aria-sort={
                    sortKey === 'role'
                      ? sortDir === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : undefined
                  }
                  className="px-4 py-3"
                >
                  <button
                    type="button"
                    onClick={() => handleSort('role')}
                    className="inline-flex items-center gap-1.5 font-semibold text-slate-700 hover:text-slate-900 cursor-pointer"
                  >
                    <span>Rol RBAC</span>
                    {renderSortIcon('role')}
                  </button>
                </th>

                <th
                  scope="col"
                  aria-sort={
                    sortKey === 'status'
                      ? sortDir === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : undefined
                  }
                  className="px-4 py-3"
                >
                  <button
                    type="button"
                    onClick={() => handleSort('status')}
                    className="inline-flex items-center gap-1.5 font-semibold text-slate-700 hover:text-slate-900 cursor-pointer"
                  >
                    <span>Estado</span>
                    {renderSortIcon('status')}
                  </button>
                </th>

                <th scope="col" className="px-4 py-3 text-right">
                  Acciones
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {filteredAndSorted.map((rec) => {
                const fullName = formatFullName(rec.firstName, rec.lastName);
                const isSelf = currentUser?.id === rec.id;
                const isAdminRole = rec.role === 'ADMIN';
                const isCopied = copiedId === rec.id;

                return (
                  <tr
                    key={rec.id}
                    className="transition-colors hover:bg-slate-50/80"
                  >
                    <td data-label="Usuario" className="px-4 py-2.5">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">
                          {fullName}
                          {isSelf ? (
                            <span className="ml-1.5 rounded-full bg-teal-50 px-1.5 py-0.5 text-[10px] font-semibold text-teal-700">
                              Tú
                            </span>
                          ) : null}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {SOURCE_LABELS[rec.source]}
                        </p>
                      </div>
                    </td>

                    <td data-label="Correo" className="px-4 py-2.5">
                      {rec.email ? (
                        <span className="text-slate-700">{rec.email}</span>
                      ) : (
                        <span className="italic text-slate-400">
                          No expuesto en catálogo público
                        </span>
                      )}
                    </td>

                    <td data-label="UUID" className="px-4 py-2.5">
                      <div className="inline-flex items-center gap-1.5">
                        <code
                          title={rec.id}
                          className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-700 tabular-nums"
                        >
                          {rec.id.slice(0, 8)}…{rec.id.slice(-4)}
                        </code>
                        <button
                          type="button"
                          onClick={() => handleCopyUuid(rec.id)}
                          aria-label={`Copiar UUID de ${fullName}`}
                          className="inline-flex h-6 w-6 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                        >
                          {isCopied ? (
                            <Check
                              className="h-3.5 w-3.5 text-emerald-600"
                              aria-hidden
                            />
                          ) : (
                            <Copy className="h-3.5 w-3.5" aria-hidden />
                          )}
                        </button>
                      </div>
                    </td>

                    <td data-label="Rol RBAC" className="px-4 py-2.5">
                      <div className="inline-flex items-center gap-1.5">
                        <select
                          aria-label={`Rol de ${fullName}`}
                          value={rec.role}
                          onChange={(e) => {
                            const nextRole = e.target.value as UserRole;
                            if (nextRole === rec.role) return;
                            setRoleTarget({
                              id: rec.id,
                              label: fullName,
                              email: rec.email,
                              currentRole: rec.role,
                              nextRole,
                            });
                          }}
                          className={`h-8 rounded-[8px] border px-2 text-xs font-medium focus:border-teal-600 focus:outline-none ${
                            isAdminRole
                              ? 'border-amber-300 bg-amber-50/70 text-amber-900'
                              : 'border-slate-200 bg-white text-slate-800'
                          }`}
                        >
                          <option value="CLIENT">
                            {USER_ROLE_LABELS.CLIENT}
                          </option>
                          <option value="CAREGIVER">
                            {USER_ROLE_LABELS.CAREGIVER}
                          </option>
                          <option value="ADMIN">
                            {USER_ROLE_LABELS.ADMIN}
                          </option>
                        </select>
                      </div>
                    </td>

                    <td data-label="Estado" className="px-4 py-2.5">
                      <div className="space-y-1">
                        <StatusBadge
                          status={rec.isActive ? 'ACTIVE' : 'INACTIVE'}
                          domain="account"
                          label={rec.isActive ? 'Activo' : 'Suspendido'}
                        />
                        {!rec.isActive && rec.suspensionReason ? (
                          <p
                            title={rec.suspensionReason}
                            className="max-w-[200px] truncate text-[11px] text-rose-700"
                          >
                            {rec.suspensionReason}
                          </p>
                        ) : null}
                      </div>
                    </td>

                    <td data-label="Acciones" className="px-4 py-2.5 text-right">
                      {rec.isActive ? (
                        <Button
                          type="button"
                          variant="danger-outline"
                          size="sm"
                          disabled={isAdminRole}
                          title={
                            isAdminRole
                              ? 'Las cuentas ADMIN no pueden ser suspendidas'
                              : 'Suspender usuario'
                          }
                          onClick={() =>
                            setSuspendTarget({
                              id: rec.id,
                              label: fullName,
                              email: rec.email,
                              role: rec.role,
                            })
                          }
                          leftIcon={<Ban className="h-3.5 w-3.5" aria-hidden />}
                        >
                          Suspender
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          loading={reactivatingId === rec.id}
                          onClick={() => handleReactivate(rec.id, fullName)}
                          leftIcon={
                            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                          }
                        >
                          Reactivar
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <BulkCreateUsersModal
        open={isBulkCreateOpen}
        onClose={() => setIsBulkCreateOpen(false)}
        onCreated={handleBulkCreated}
      />

      <SuspendUserModal
        open={suspendTarget !== null}
        target={suspendTarget}
        onClose={() => setSuspendTarget(null)}
        onSuspended={handleSuspended}
      />

      <RoleChangeModal
        open={roleTarget !== null}
        target={roleTarget}
        knownActiveAdminCount={knownActiveAdminCount}
        onClose={() => setRoleTarget(null)}
        onUpdated={handleRoleUpdated}
      />
    </div>
  );
}
