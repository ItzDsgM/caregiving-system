'use client';

import React, { useState } from 'react';
import {
  AlertCircle,
  Code2,
  Plus,
  TableProperties,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ModalDialog } from '@/components/ui/ModalDialog';
import { TabsBar } from '@/components/ui/TabsBar';
import { adminApi, ApiError, extractErrorMessage } from '@/lib/api';
import { PASSWORD_REGEX, USER_ROLE_LABELS } from '@/lib/constants';
import type { AdminCreateUserItem, User, UserRole } from '@/lib/types';

export interface BulkCreateUsersModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (users: User[]) => void;
}

type EntryMode = 'rows' | 'json';

function createEmptyRow(): AdminCreateUserItem {
  return {
    firstName: '',
    lastName: '',
    email: '',
    phone: '+57',
    password: 'Password123!',
    role: 'CAREGIVER',
  };
}

const SAMPLE_JSON = JSON.stringify(
  [
    {
      email: 'laura.cuidadora@ejemplo.com',
      password: 'Password123!',
      firstName: 'Laura',
      lastName: 'Martínez',
      phone: '+573001112233',
      role: 'CAREGIVER',
    },
    {
      email: 'andres.cliente@ejemplo.com',
      password: 'Password123!',
      firstName: 'Andrés',
      lastName: 'Vargas',
      phone: '+573004445566',
      role: 'CLIENT',
    },
  ],
  null,
  2,
);

const VALID_ROLES: UserRole[] = ['CLIENT', 'CAREGIVER', 'ADMIN'];

function validateBatch(rows: AdminCreateUserItem[]): string | null {
  if (rows.length === 0) {
    return 'Debes incluir al menos 1 usuario.';
  }
  if (rows.length > 50) {
    return 'El lote no puede superar los 50 usuarios simultáneos.';
  }

  const seenEmails = new Set<string>();
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const idx = i + 1;
    const email = row.email.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return `Fila ${idx}: el correo electrónico no es válido.`;
    }
    if (seenEmails.has(email)) {
      return `Fila ${idx}: correo duplicado dentro del lote (${email}).`;
    }
    seenEmails.add(email);

    if (!row.firstName.trim()) {
      return `Fila ${idx}: el nombre es obligatorio.`;
    }
    if (!row.lastName.trim()) {
      return `Fila ${idx}: el apellido es obligatorio.`;
    }
    if (!row.phone.trim()) {
      return `Fila ${idx}: el teléfono es obligatorio.`;
    }
    if (!PASSWORD_REGEX.test(row.password)) {
      return `Fila ${idx}: la contraseña debe tener mínimo 8 caracteres, 1 mayúscula, 1 minúscula y 1 número.`;
    }
    if (!VALID_ROLES.includes(row.role)) {
      return `Fila ${idx}: el rol debe ser CLIENT, CAREGIVER o ADMIN.`;
    }
  }

  return null;
}

function BulkCreateUsersForm({
  onClose,
  onCreated,
}: Readonly<{
  onClose: () => void;
  onCreated: (users: User[]) => void;
}>) {
  const [mode, setMode] = useState<EntryMode>('rows');
  const [rows, setRows] = useState<AdminCreateUserItem[]>([createEmptyRow()]);
  const [jsonText, setJsonText] = useState(SAMPLE_JSON);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRowChange = <K extends keyof AdminCreateUserItem>(
    index: number,
    field: K,
    value: AdminCreateUserItem[K],
  ) => {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    );
  };

  const handleAddRow = () => {
    if (rows.length >= 50) return;
    setRows((prev) => [...prev, createEmptyRow()]);
  };

  const handleRemoveRow = (index: number) => {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const parseJsonRows = (): AdminCreateUserItem[] | null => {
    try {
      const parsed = JSON.parse(jsonText) as unknown;
      const arr = Array.isArray(parsed)
        ? parsed
        : parsed &&
            typeof parsed === 'object' &&
            'users' in parsed &&
            Array.isArray((parsed as { users: unknown }).users)
          ? (parsed as { users: unknown[] }).users
          : null;

      if (!arr) {
        setErrorMessage(
          'El JSON debe ser un arreglo de usuarios o un objeto con la propiedad "users".',
        );
        return null;
      }

      return arr.map((item) => {
        const obj = (item ?? {}) as Record<string, unknown>;
        return {
          email: String(obj.email ?? '').trim().toLowerCase(),
          password: String(obj.password ?? ''),
          firstName: String(obj.firstName ?? '').trim(),
          lastName: String(obj.lastName ?? '').trim(),
          phone: String(obj.phone ?? '').trim(),
          role: String(obj.role ?? 'CAREGIVER').toUpperCase() as UserRole,
        };
      });
    } catch {
      setErrorMessage('El texto JSON no tiene una sintaxis válida.');
      return null;
    }
  };

  const handleLoadJsonToRows = () => {
    setErrorMessage(null);
    const parsed = parseJsonRows();
    if (!parsed) return;
    if (parsed.length === 0 || parsed.length > 50) {
      setErrorMessage('El JSON debe contener entre 1 y 50 usuarios.');
      return;
    }
    setRows(parsed);
    setMode('rows');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage(null);

    const payloadRows =
      mode === 'json'
        ? parseJsonRows()
        : rows.map((r) => ({
            ...r,
            email: r.email.trim().toLowerCase(),
            firstName: r.firstName.trim(),
            lastName: r.lastName.trim(),
            phone: r.phone.trim(),
          }));

    if (!payloadRows) return;

    const validationError = validateBatch(payloadRows);
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await adminApi.bulkCreateUsers({ users: payloadRows });
      onCreated(response.users ?? []);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : extractErrorMessage(undefined, 500);
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <TabsBar<EntryMode>
        activeTab={mode}
        onChange={(next) => {
          setErrorMessage(null);
          setMode(next);
        }}
        ariaLabel="Modo de ingreso masivo"
        tabs={[
          {
            id: 'rows',
            label: 'Tabla por filas',
            count: rows.length,
            icon: <TableProperties className="h-4 w-4" aria-hidden />,
          },
          {
            id: 'json',
            label: 'Importación JSON',
            icon: <Code2 className="h-4 w-4" aria-hidden />,
          },
        ]}
      />

      {mode === 'rows' ? (
        <div
          role="tabpanel"
          id="tabpanel-rows"
          aria-labelledby="tab-rows"
          className="space-y-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
            <span>
              Máximo <span className="font-mono font-semibold">50</span> usuarios
              por lote. Contraseña mínima: 8 caracteres con mayúscula, minúscula y
              número.
            </span>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleAddRow}
              disabled={rows.length >= 50}
              leftIcon={<Plus className="h-3.5 w-3.5" aria-hidden />}
            >
              Agregar fila
            </Button>
          </div>

          <div className="max-h-[340px] space-y-2.5 overflow-y-auto pr-1">
            {rows.map((row, index) => (
              <div
                key={`bulk-row-${index}`}
                className="rounded-[10px] border border-slate-200 bg-slate-50/70 p-3"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-mono text-[11px] font-semibold text-slate-500 tabular-nums">
                    Usuario #{index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveRow(index)}
                    disabled={rows.length <= 1}
                    aria-label={`Eliminar fila ${index + 1}`}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-[6px] text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-35 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                  <div>
                    <label
                      htmlFor={`bulk-fn-${index}`}
                      className="block text-[11px] font-medium text-slate-600"
                    >
                      Nombre
                    </label>
                    <input
                      id={`bulk-fn-${index}`}
                      type="text"
                      required
                      value={row.firstName}
                      onChange={(e) =>
                        handleRowChange(index, 'firstName', e.target.value)
                      }
                      placeholder="Nombre"
                      className="mt-1 w-full rounded-[8px] border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-teal-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`bulk-ln-${index}`}
                      className="block text-[11px] font-medium text-slate-600"
                    >
                      Apellido
                    </label>
                    <input
                      id={`bulk-ln-${index}`}
                      type="text"
                      required
                      value={row.lastName}
                      onChange={(e) =>
                        handleRowChange(index, 'lastName', e.target.value)
                      }
                      placeholder="Apellido"
                      className="mt-1 w-full rounded-[8px] border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-teal-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`bulk-role-${index}`}
                      className="block text-[11px] font-medium text-slate-600"
                    >
                      Rol
                    </label>
                    <select
                      id={`bulk-role-${index}`}
                      value={row.role}
                      onChange={(e) =>
                        handleRowChange(
                          index,
                          'role',
                          e.target.value as UserRole,
                        )
                      }
                      className="mt-1 w-full rounded-[8px] border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-teal-600 focus:outline-none"
                    >
                      {VALID_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {USER_ROLE_LABELS[r]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor={`bulk-email-${index}`}
                      className="block text-[11px] font-medium text-slate-600"
                    >
                      Correo electrónico
                    </label>
                    <input
                      id={`bulk-email-${index}`}
                      type="email"
                      required
                      value={row.email}
                      onChange={(e) =>
                        handleRowChange(index, 'email', e.target.value)
                      }
                      placeholder="usuario@careconnect.com"
                      className="mt-1 w-full rounded-[8px] border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-teal-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`bulk-phone-${index}`}
                      className="block text-[11px] font-medium text-slate-600"
                    >
                      Teléfono
                    </label>
                    <input
                      id={`bulk-phone-${index}`}
                      type="tel"
                      required
                      value={row.phone}
                      onChange={(e) =>
                        handleRowChange(index, 'phone', e.target.value)
                      }
                      placeholder="+573001234567"
                      className="mt-1 w-full rounded-[8px] border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs text-slate-900 focus:border-teal-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`bulk-pass-${index}`}
                      className="block text-[11px] font-medium text-slate-600"
                    >
                      Contraseña inicial
                    </label>
                    <input
                      id={`bulk-pass-${index}`}
                      type="text"
                      required
                      value={row.password}
                      onChange={(e) =>
                        handleRowChange(index, 'password', e.target.value)
                      }
                      placeholder="Password123!"
                      className="mt-1 w-full rounded-[8px] border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs text-slate-900 focus:border-teal-600 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div
          role="tabpanel"
          id="tabpanel-json"
          aria-labelledby="tab-json"
          className="space-y-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
            <span>
              Pega un arreglo JSON de entre 1 y 50 objetos de usuario.
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setErrorMessage(null);
                  setJsonText(SAMPLE_JSON);
                }}
              >
                Cargar ejemplo
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleLoadJsonToRows}
              >
                Editar en filas
              </Button>
            </div>
          </div>

          <textarea
            rows={10}
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            aria-label="Arreglo JSON de usuarios para creación masiva"
            spellCheck={false}
            className="w-full rounded-[8px] border border-slate-300 bg-slate-950 p-3 font-mono text-xs leading-5 text-slate-100 focus:border-teal-500 focus:outline-none"
          />
        </div>
      )}

      {errorMessage ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-[8px] border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-800"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden />
          <span>{errorMessage}</span>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-slate-200 pt-4">
        <Button
          type="button"
          variant="secondary"
          onClick={onClose}
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          variant="primary"
          loading={isSubmitting}
          loadingText="Aprovisionando..."
          leftIcon={<UserPlus className="h-4 w-4" aria-hidden />}
        >
          Crear lote de usuarios
        </Button>
      </div>
    </form>
  );
}

/**
 * Modal supporting table-row and JSON batch user creation via `POST /admin/users/bulk`.
 */
export function BulkCreateUsersModal({
  open,
  onClose,
  onCreated,
}: Readonly<BulkCreateUsersModalProps>) {
  return (
    <ModalDialog
      open={open}
      onClose={onClose}
      title="Creación Masiva de Usuarios"
      description="Aprovisiona cuentas CLIENT, CAREGIVER o ADMIN en una transacción atómica y regístralas automáticamente en el directorio local."
      size="xl"
    >
      {open ? (
        <BulkCreateUsersForm onClose={onClose} onCreated={onCreated} />
      ) : null}
    </ModalDialog>
  );
}
