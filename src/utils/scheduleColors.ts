import type { CalendarSetting, ColorKey, ConfirmationStatus, ScheduleType } from "@/types/schedule";

export const scheduleTypeOptions: ScheduleType[] = ["A", "B", "COMMON"];

export const colorKeyOptions: ColorKey[] = ["sky", "purple", "pink", "yellow", "lime", "gray"];

export const defaultCalendarSettings: Record<ScheduleType, CalendarSetting> = {
  A: {
    scheduleType: "A",
    displayName: "A",
    colorKey: "sky"
  },
  B: {
    scheduleType: "B",
    displayName: "B",
    colorKey: "purple"
  },
  COMMON: {
    scheduleType: "COMMON",
    displayName: "같이",
    colorKey: "lime"
  }
};

export const legacyColorKeyMap: Record<string, ColorKey> = {
  blue: "sky",
  purple: "purple",
  pink: "pink",
  orange: "yellow",
  green: "lime",
  gray: "gray",
  sky: "sky",
  yellow: "yellow",
  lime: "lime"
};

export const colorLabels: Record<ColorKey, string> = {
  sky: "하늘",
  purple: "보라",
  pink: "핑크",
  yellow: "노랑",
  lime: "연두",
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
  sky: {
    confirmedBackground: "#CFEFFF",
    confirmedBorder: "#9FD3F2",
    confirmedText: "#3F6F8C",
    tentativeBackground: "#F2FBFF",
    tentativeBorder: "#7FC4E8",
    tentativeText: "#4E7B96"
  },
  purple: {
    confirmedBackground: "#E6D9F7",
    confirmedBorder: "#C5AEE8",
    confirmedText: "#6C5A8E",
    tentativeBackground: "#F7F2FC",
    tentativeBorder: "#B79DDF",
    tentativeText: "#7A6898"
  },
  pink: {
    confirmedBackground: "#F8D8E8",
    confirmedBorder: "#E8AFCB",
    confirmedText: "#8C5870",
    tentativeBackground: "#FFF3F8",
    tentativeBorder: "#E29BBC",
    tentativeText: "#946174"
  },
  yellow: {
    confirmedBackground: "#FCEEB8",
    confirmedBorder: "#E7D47A",
    confirmedText: "#8A7740",
    tentativeBackground: "#FFFBEA",
    tentativeBorder: "#DABD5F",
    tentativeText: "#8E7A34"
  },
  lime: {
    confirmedBackground: "#DDF2C8",
    confirmedBorder: "#B9DB98",
    confirmedText: "#5F7F49",
    tentativeBackground: "#F5FBEF",
    tentativeBorder: "#A7CF7C",
    tentativeText: "#68894E"
  },
  gray: {
    confirmedBackground: "#E7E7EB",
    confirmedBorder: "#C9CAD3",
    confirmedText: "#666A78",
    tentativeBackground: "#F8F8FA",
    tentativeBorder: "#B8BAC5",
    tentativeText: "#707483"
  }
};

export function normalizeColorKey(value: string | null | undefined): ColorKey {
  if (!value) {
    return "gray";
  }

  return legacyColorKeyMap[value] ?? "gray";
}

export function toSettingsRecord(settings: CalendarSetting[]): Record<ScheduleType, CalendarSetting> {
  return scheduleTypeOptions.reduce<Record<ScheduleType, CalendarSetting>>((record, scheduleType) => {
    const setting = settings.find((item) => item.scheduleType === scheduleType);
    record[scheduleType] = setting
      ? {
          ...setting,
          colorKey: normalizeColorKey(setting.colorKey)
        }
      : defaultCalendarSettings[scheduleType];
    return record;
  }, { ...defaultCalendarSettings });
}

export function getScheduleTypeLabel(settings: Record<ScheduleType, CalendarSetting>, scheduleType: ScheduleType | null) {
  if (!scheduleType) {
    return "";
  }

  return settings[scheduleType]?.displayName || defaultCalendarSettings[scheduleType].displayName;
}

export function getSchedulePalette(
  settings: Record<ScheduleType, CalendarSetting>,
  scheduleType: ScheduleType | null,
  colorKey?: ColorKey | null
) {
  const resolvedColorKey = colorKey ?? (scheduleType ? settings[scheduleType]?.colorKey : null) ?? "sky";
  return colorPalettes[normalizeColorKey(resolvedColorKey)];
}
