import {
  DAY_OF_WEEK_ORDER,
  DAY_OF_WEEK_SHORT_LABELS,
  MATRIX_SHIFT_TYPES,
  SHIFT_TYPE_SHORT_LABELS,
} from "@/lib/constants";
import type { AvailabilitySlot, DayOfWeek, ShiftType } from "@/lib/types";

export interface ScheduleSummary {
  activeDays: DayOfWeek[];
  activeShifts: Set<"MORNING" | "AFTERNOON" | "NIGHT">;
  totalSlotCount: number;
  daysLabel: string;
  shiftTags: Array<{
    shift: "MORNING" | "AFTERNOON" | "NIGHT";
    short: string;
    label: string;
    active: boolean;
  }>;
}

const SHIFT_FULL_NAMES: Record<"MORNING" | "AFTERNOON" | "NIGHT", string> = {
  MORNING: "Mañana",
  AFTERNOON: "Tarde",
  NIGHT: "Noche",
};

export function summarizeAvailability(
  slots: AvailabilitySlot[] | null | undefined,
): ScheduleSummary {
  const dayShiftMap = new Map<DayOfWeek, Set<ShiftType>>();
  const activeShifts = new Set<"MORNING" | "AFTERNOON" | "NIGHT">();
  let totalSlotCount = 0;

  for (const slot of slots ?? []) {
    if (!slot?.day || !Array.isArray(slot.shifts) || slot.shifts.length === 0) {
      continue;
    }
    const existing = dayShiftMap.get(slot.day) ?? new Set<ShiftType>();
    for (const shift of slot.shifts) {
      if (shift === "FULL_TIME") {
        existing.add("MORNING");
        existing.add("AFTERNOON");
        existing.add("NIGHT");
        activeShifts.add("MORNING");
        activeShifts.add("AFTERNOON");
        activeShifts.add("NIGHT");
      } else if (
        shift === "MORNING" ||
        shift === "AFTERNOON" ||
        shift === "NIGHT"
      ) {
        existing.add(shift);
        activeShifts.add(shift);
      }
    }
    if (existing.size > 0) {
      dayShiftMap.set(slot.day, existing);
    }
  }

  const activeDays = DAY_OF_WEEK_ORDER.filter((day) => dayShiftMap.has(day));
  for (const set of dayShiftMap.values()) {
    totalSlotCount += set.size;
  }

  let daysLabel = "Horario por convenir";
  if (activeDays.length === 7) {
    daysLabel = "Lun – Dom";
  } else if (
    activeDays.length === 5 &&
    activeDays.every((d) =>
      ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"].includes(d),
    )
  ) {
    daysLabel = "Lun – Vie";
  } else if (activeDays.length > 0) {
    const preview = activeDays
      .slice(0, 3)
      .map((d) => DAY_OF_WEEK_SHORT_LABELS[d]);
    daysLabel =
      activeDays.length > 3
        ? `${preview.join(", ")} +${activeDays.length - 3}`
        : preview.join(", ");
  }

  const shiftTags = MATRIX_SHIFT_TYPES.map((shift) => ({
    shift,
    short: SHIFT_TYPE_SHORT_LABELS[shift],
    label: SHIFT_FULL_NAMES[shift],
    active: activeShifts.has(shift),
  }));

  return {
    activeDays,
    activeShifts,
    totalSlotCount,
    daysLabel,
    shiftTags,
  };
}
