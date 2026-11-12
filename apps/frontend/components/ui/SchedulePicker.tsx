'use client';

import React from 'react';
import { Check, Sparkles, Trash2 } from 'lucide-react';
import {
  DAY_OF_WEEK_LABELS,
  DAY_OF_WEEK_ORDER,
  DAY_OF_WEEK_SHORT_LABELS,
  MATRIX_SHIFT_TYPES,
  SHIFT_TYPE_LABELS,
  WEEKDAYS_ORDER,
  WEEKEND_DAYS_ORDER,
} from '@/lib/constants';
import type { AvailabilitySlot, DayOfWeek, ShiftType } from '@/lib/types';

export interface SchedulePickerProps {
  value: AvailabilitySlot[];
  onChange?: (nextSlots: AvailabilitySlot[]) => void;
  readOnly?: boolean;
  compact?: boolean;
  showPresets?: boolean;
  className?: string;
}

const SHIFT_HINT: Record<(typeof MATRIX_SHIFT_TYPES)[number], string> = {
  MORNING: '6am – 12pm',
  AFTERNOON: '12pm – 6pm',
  NIGHT: '6pm – 6am',
};

function buildSlotMap(
  slots: ReadonlyArray<AvailabilitySlot>,
): Map<DayOfWeek, Set<ShiftType>> {
  const map = new Map<DayOfWeek, Set<ShiftType>>();
  for (const day of DAY_OF_WEEK_ORDER) {
    map.set(day, new Set<ShiftType>());
  }
  for (const slot of slots) {
    const existing = map.get(slot.day) ?? new Set<ShiftType>();
    for (const shift of slot.shifts) {
      if (shift === 'FULL_TIME') {
        existing.add('MORNING');
        existing.add('AFTERNOON');
        existing.add('NIGHT');
      } else {
        existing.add(shift);
      }
    }
    map.set(slot.day, existing);
  }
  return map;
}

function serializeSlotMap(
  map: Map<DayOfWeek, Set<ShiftType>>,
): AvailabilitySlot[] {
  const result: AvailabilitySlot[] = [];

  for (const day of DAY_OF_WEEK_ORDER) {
    const shiftSet = map.get(day);
    if (!shiftSet || shiftSet.size === 0) {
      continue;
    }

    const orderedShifts: ShiftType[] = MATRIX_SHIFT_TYPES.filter((shift) =>
      shiftSet.has(shift),
    );

    if (orderedShifts.length > 0) {
      result.push({
        day,
        shifts: orderedShifts,
      });
    }
  }

  return result;
}

export function SchedulePicker({
  value,
  onChange,
  readOnly = false,
  compact = false,
  showPresets = true,
  className = '',
}: Readonly<SchedulePickerProps>) {
  const slotMap = buildSlotMap(value);
  const totalSelectedCount = Array.from(slotMap.values()).reduce(
    (sum, set) => sum + set.size,
    0,
  );

  const toggleCell = (day: DayOfWeek, shift: ShiftType) => {
    if (readOnly || !onChange) {
      return;
    }

    const nextMap = buildSlotMap(value);
    const daySet = new Set(nextMap.get(day) ?? []);
    if (daySet.has(shift)) {
      daySet.delete(shift);
    } else {
      daySet.add(shift);
    }
    nextMap.set(day, daySet);
    onChange(serializeSlotMap(nextMap));
  };

  const applyAllMornings = () => {
    if (readOnly || !onChange) return;
    const nextMap = buildSlotMap(value);
    const allHaveMorning = DAY_OF_WEEK_ORDER.every((day) =>
      nextMap.get(day)?.has('MORNING'),
    );

    for (const day of DAY_OF_WEEK_ORDER) {
      const daySet = new Set(nextMap.get(day) ?? []);
      if (allHaveMorning) {
        daySet.delete('MORNING');
      } else {
        daySet.add('MORNING');
      }
      nextMap.set(day, daySet);
    }
    onChange(serializeSlotMap(nextMap));
  };

  const applyWeekdays = () => {
    if (readOnly || !onChange) return;
    const nextMap = buildSlotMap(value);
    const allWeekdaysActive = WEEKDAYS_ORDER.every((day) => {
      const set = nextMap.get(day);
      return set?.has('MORNING') && set?.has('AFTERNOON');
    });

    for (const day of WEEKDAYS_ORDER) {
      const daySet = new Set(nextMap.get(day) ?? []);
      if (allWeekdaysActive) {
        daySet.delete('MORNING');
        daySet.delete('AFTERNOON');
      } else {
        daySet.add('MORNING');
        daySet.add('AFTERNOON');
      }
      nextMap.set(day, daySet);
    }
    onChange(serializeSlotMap(nextMap));
  };

  const applyWeekends = () => {
    if (readOnly || !onChange) return;
    const nextMap = buildSlotMap(value);
    const allWeekendsActive = WEEKEND_DAYS_ORDER.every((day) => {
      const set = nextMap.get(day);
      return set?.has('MORNING') && set?.has('AFTERNOON');
    });

    for (const day of WEEKEND_DAYS_ORDER) {
      const daySet = new Set(nextMap.get(day) ?? []);
      if (allWeekendsActive) {
        daySet.delete('MORNING');
        daySet.delete('AFTERNOON');
      } else {
        daySet.add('MORNING');
        daySet.add('AFTERNOON');
      }
      nextMap.set(day, daySet);
    }
    onChange(serializeSlotMap(nextMap));
  };

  const clearAll = () => {
    if (readOnly || !onChange) return;
    onChange([]);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {!readOnly && showPresets ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
              <Sparkles className="h-3.5 w-3.5 text-teal-600" aria-hidden />
              Atajos:
            </span>
            <button
              type="button"
              onClick={applyWeekdays}
              className="rounded-[8px] border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800 cursor-pointer"
            >
              Lunes a Viernes
            </button>
            <button
              type="button"
              onClick={applyAllMornings}
              className="rounded-[8px] border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800 cursor-pointer"
            >
              Todo Mañanas
            </button>
            <button
              type="button"
              onClick={applyWeekends}
              className="rounded-[8px] border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800 cursor-pointer"
            >
              Fines de semana
            </button>
          </div>
          {totalSelectedCount > 0 ? (
            <button
              type="button"
              onClick={clearAll}
              className="inline-flex items-center gap-1 rounded-[8px] px-2 py-1 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-50 cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
              Limpiar
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-[12px] border border-slate-200 bg-white">
        <table className="w-full min-w-[460px] border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th
                scope="col"
                className={`${
                  compact ? 'px-2.5 py-2' : 'px-3.5 py-2.5'
                } text-xs font-semibold uppercase tracking-wide text-slate-500`}
              >
                Jornada
              </th>
              {DAY_OF_WEEK_ORDER.map((day) => (
                <th
                  key={day}
                  scope="col"
                  className={`${
                    compact ? 'px-1.5 py-2' : 'px-2 py-2.5'
                  } text-center text-xs font-semibold text-slate-700`}
                >
                  <span title={DAY_OF_WEEK_LABELS[day]}>
                    {DAY_OF_WEEK_SHORT_LABELS[day]}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {MATRIX_SHIFT_TYPES.map((shift) => (
              <tr key={shift}>
                <th
                  scope="row"
                  className={`${
                    compact ? 'px-2.5 py-2' : 'px-3.5 py-2.5'
                  } align-middle font-normal`}
                >
                  <div className="text-xs font-semibold text-slate-800">
                    {SHIFT_TYPE_LABELS[shift]}
                  </div>
                  {!compact ? (
                    <div className="text-[11px] text-slate-500">
                      {SHIFT_HINT[shift]}
                    </div>
                  ) : null}
                </th>
                {DAY_OF_WEEK_ORDER.map((day) => {
                  const isActive = slotMap.get(day)?.has(shift) ?? false;
                  const cellLabel = `${DAY_OF_WEEK_LABELS[day]} - ${SHIFT_TYPE_LABELS[shift]}`;

                  return (
                    <td
                      key={`${day}-${shift}`}
                      className={`${compact ? 'p-1' : 'p-1.5'} text-center`}
                    >
                      {readOnly ? (
                        <div
                          aria-label={`${cellLabel}: ${
                            isActive ? 'Disponible' : 'No disponible'
                          }`}
                          className={`mx-auto flex ${
                            compact ? 'h-7 w-9' : 'h-8 w-full max-w-[44px]'
                          } items-center justify-center rounded-[8px] border text-xs transition-colors ${
                            isActive
                              ? 'border-teal-200 bg-teal-50 text-teal-700'
                              : 'border-slate-100 bg-slate-50/70 text-slate-300'
                          }`}
                        >
                          {isActive ? (
                            <Check className="h-3.5 w-3.5" aria-hidden />
                          ) : (
                            <span aria-hidden>—</span>
                          )}
                        </div>
                      ) : (
                        <button
                          type="button"
                          aria-pressed={isActive}
                          aria-label={cellLabel}
                          onClick={() => toggleCell(day, shift)}
                          className={`mx-auto flex ${
                            compact ? 'h-7 w-9' : 'h-9 w-full max-w-[48px]'
                          } items-center justify-center rounded-[8px] border text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 cursor-pointer ${
                            isActive
                              ? 'border-teal-600 bg-teal-600 text-white shadow-xs hover:bg-teal-700'
                              : 'border-slate-200 bg-slate-50 text-slate-400 hover:border-teal-300 hover:bg-teal-50/50 hover:text-teal-700'
                          }`}
                        >
                          {isActive ? (
                            <Check className="h-4 w-4" aria-hidden />
                          ) : (
                            <span aria-hidden>·</span>
                          )}
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!readOnly ? (
        <p className="tabular-nums text-xs text-slate-500">
          {totalSelectedCount === 0
            ? 'Selecciona al menos un bloque horario para mostrar tu disponibilidad.'
            : `${totalSelectedCount} ${
                totalSelectedCount === 1
                  ? 'bloque horario seleccionado'
                  : 'bloques horarios seleccionados'
              }.`}
        </p>
      ) : null}
    </div>
  );
}
