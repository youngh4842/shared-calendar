import type { CalendarSetting, ColorKey, ConfirmationStatus, ScheduleType } from "@/types/schedule";

export const scheduleTypeOptions: ScheduleType[] = ["A", "B", "COMMON"];

export const colorKeyOptions: ColorKey[] = ["blue", "purple", "pink", "orange", "green", "gray"];

export const defaultCalendarSettings: Record<ScheduleType, CalendarSetting> = {
  A: {
    scheduleType: "A",
    displayName: "A",
    colorKey: "blue"
  },
  B: {
    scheduleType: "B",
    displayName: "B",
    colorKey: "purple"
  },
  COMMON: {
    scheduleType: "COMMON",
    displayName: "같이",
    colorKey: "green"
  }
};

export const colorLabels: Record<ColorKey, string> = {
  blue: "파랑",
  purple: "보라",
  pink: "핑크",
  orange: "주황",
  green: "초록",
  gray: "회색"
};

export const confirmationLabels: Record<ConfirmationStatus, string> = {
  CONFIRMED: "확정",
  TENTATIVE: "예정"
};

export const colorPalettes: Record<
  ColorKey,
  {
    confirmedBackground: string;
    confirmedBorder: string;
    confirmedText: string;
    tentativeBackground: string;
    tentativeBorder: string;
    tentativeText: string;
  }
> = {
  blue: {
    confirmedBackground: "#93c5fd",
    confirmedBorder: "#3b82f6",
    confirmedText: "#0f172a",
    tentativeBackground: "#eff6ff",
    tentativeBorder: "#93c5fd",
    tentativeText: "#1e40af"
  },
  purple: {
    confirmedBackground: "#c4b5fd",
    confirmedBorder: "#8b5cf6",
    confirmedText: "#2e1065",
    tentativeBackground: "#f5f3ff",
    tentativeBorder: "#c4b5fd",
    tentativeText: "#6d28d9"
  },
  pink: {
    confirmedBackground: "#f9a8d4",
    confirmedBorder: "#ec4899",
    confirmedText: "#831843",
    tentativeBackground: "#fdf2f8",
    tentativeBorder: "#f9a8d4",
    tentativeText: "#be185d"
  },
  orange: {
    confirmedBackground: "#fdba74",
    confirmedBorder: "#f97316",
    confirmedText: "#7c2d12",
    tentativeBackground: "#fff7ed",
    tentativeBorder: "#fdba74",
    tentativeText: "#c2410c"
  },
  green: {
    confirmedBackground: "#86efac",
    confirmedBorder: "#22c55e",
    confirmedText: "#064e3b",
    tentativeBackground: "#f0fdf4",
    tentativeBorder: "#86efac",
    tentativeText: "#166534"
  },
  gray: {
    confirmedBackground: "#cbd5e1",
    confirmedBorder: "#94a3b8",
    confirmedText: "#0f172a",
    tentativeBackground: "#f8fafc",
    tentativeBorder: "#cbd5e1",
    tentativeText: "#334155"
  }
};

export function toSettingsRecord(settings: CalendarSetting[]): Record<ScheduleType, CalendarSetting> {
  return scheduleTypeOptions.reduce<Record<ScheduleType, CalendarSetting>>((record, scheduleType) => {
    const setting = settings.find((item) => item.scheduleType === scheduleType);
    record[scheduleType] = setting ?? defaultCalendarSettings[scheduleType];
    return record;
  }, { ...defaultCalendarSettings });
}

export function getScheduleTypeLabel(settings: Record<ScheduleType, CalendarSetting>, scheduleType: ScheduleType) {
  return settings[scheduleType]?.displayName || defaultCalendarSettings[scheduleType].displayName;
}

export function getSchedulePalette(settings: Record<ScheduleType, CalendarSetting>, scheduleType: ScheduleType) {
  return colorPalettes[settings[scheduleType]?.colorKey ?? defaultCalendarSettings[scheduleType].colorKey];
}
