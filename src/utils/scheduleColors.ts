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
    confirmedBackground: "#2f80ed",
    confirmedBorder: "#1d63c7",
    confirmedText: "#ffffff",
    tentativeBackground: "#dbeafe",
    tentativeBorder: "#60a5fa",
    tentativeText: "#1d4ed8"
  },
  purple: {
    confirmedBackground: "#8b5cf6",
    confirmedBorder: "#6d3fe0",
    confirmedText: "#ffffff",
    tentativeBackground: "#ede9fe",
    tentativeBorder: "#a78bfa",
    tentativeText: "#6d28d9"
  },
  pink: {
    confirmedBackground: "#db2777",
    confirmedBorder: "#be185d",
    confirmedText: "#ffffff",
    tentativeBackground: "#fce7f3",
    tentativeBorder: "#f472b6",
    tentativeText: "#be185d"
  },
  orange: {
    confirmedBackground: "#ea580c",
    confirmedBorder: "#c2410c",
    confirmedText: "#ffffff",
    tentativeBackground: "#ffedd5",
    tentativeBorder: "#fb923c",
    tentativeText: "#c2410c"
  },
  green: {
    confirmedBackground: "#22a06b",
    confirmedBorder: "#178052",
    confirmedText: "#ffffff",
    tentativeBackground: "#dcfce7",
    tentativeBorder: "#4ade80",
    tentativeText: "#166534"
  },
  gray: {
    confirmedBackground: "#64748b",
    confirmedBorder: "#475569",
    confirmedText: "#ffffff",
    tentativeBackground: "#f1f5f9",
    tentativeBorder: "#94a3b8",
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
