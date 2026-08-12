import type { CalendarSetting, ColorKey, ConfirmationStatus, Schedule, ScheduleInput, ScheduleType } from "@/types/schedule";

const scheduleTypes = new Set<ScheduleType>(["A", "B", "COMMON"]);
const confirmationStatuses = new Set<ConfirmationStatus>(["CONFIRMED", "TENTATIVE"]);
const colorKeys = new Set<ColorKey>(["sky", "purple", "pink", "yellow", "lime", "gray"]);
const legacyColorKeys: Record<string, ColorKey> = {
  blue: "sky",
  orange: "yellow",
  green: "lime",
  sky: "sky",
  purple: "purple",
  pink: "pink",
  yellow: "yellow",
  lime: "lime",
  gray: "gray"
};
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const koreaDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
});

function toDateString(value: unknown): string {
  if (value instanceof Date) {
    return koreaDateFormatter.format(value);
  }

  return String(value).slice(0, 10);
}

function toTimestampString(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value);
}

function isValidDate(value: string) {
  return datePattern.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00+09:00`));
}

export function mapSchedule(row: Record<string, unknown>): Schedule {
  return {
    id: Number(row.id),
    startDate: toDateString(row.start_date),
    endDate: toDateString(row.end_date),
    title: String(row.title),
    scheduleType: row.schedule_type ? (row.schedule_type as ScheduleType) : null,
    confirmationStatus: row.confirmation_status as ConfirmationStatus,
    colorKey: row.color_key ? (legacyColorKeys[String(row.color_key)] ?? "gray") : null,
    memo: typeof row.memo === "string" ? row.memo : null,
    createdAt: toTimestampString(row.created_at),
    updatedAt: toTimestampString(row.updated_at)
  };
}

export function mapCalendarSetting(row: Record<string, unknown>): CalendarSetting {
  return {
    scheduleType: row.schedule_type as ScheduleType,
    displayName: String(row.display_name),
    colorKey: legacyColorKeys[String(row.color_key)] ?? "gray"
  };
}

export function validateScheduleInput(value: unknown): { ok: true; data: ScheduleInput } | { ok: false; error: string } {
  if (!value || typeof value !== "object") {
    return { ok: false, error: "요청 본문이 올바르지 않습니다." };
  }

  const body = value as Record<string, unknown>;
  const legacyScheduleDate = typeof body.scheduleDate === "string" ? body.scheduleDate : "";
  const startDate = typeof body.startDate === "string" ? body.startDate : legacyScheduleDate;
  const endDate = typeof body.endDate === "string" ? body.endDate : legacyScheduleDate;
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const scheduleType = body.scheduleType === null || body.scheduleType === undefined || body.scheduleType === "" ? null : (body.scheduleType as ScheduleType);
  const confirmationStatus = body.confirmationStatus as ConfirmationStatus;
  const colorKey = body.colorKey === null || body.colorKey === undefined || body.colorKey === "" ? "gray" : legacyColorKeys[String(body.colorKey)];
  const memo = typeof body.memo === "string" && body.memo.trim() ? body.memo.trim() : null;

  if (!startDate) return { ok: false, error: "날짜를 선택해주세요." };
  if (!endDate) return { ok: false, error: "날짜를 선택해주세요." };
  if (!isValidDate(startDate) || !isValidDate(endDate)) {
    return { ok: false, error: "일정 날짜가 올바르지 않습니다." };
  }
  if (endDate < startDate) return { ok: false, error: "종료일은 시작일 이후 날짜를 선택해주세요." };
  if (!title) return { ok: false, error: "제목을 입력해주세요." };
  if (scheduleType !== null && !scheduleTypes.has(scheduleType)) return { ok: false, error: "일정 구분을 선택해주세요." };
  if (!confirmationStatuses.has(confirmationStatus)) return { ok: false, error: "확정 여부를 선택해주세요." };
  if (!colorKey || !colorKeys.has(colorKey)) return { ok: false, error: "색상을 선택해주세요." };

  return {
    ok: true,
    data: {
      startDate,
      endDate,
      title,
      scheduleType,
      confirmationStatus,
      colorKey,
      memo
    }
  };
}

export function validateCalendarSettingsInput(
  value: unknown
): { ok: true; data: CalendarSetting[] } | { ok: false; error: string } {
  if (!Array.isArray(value)) {
    return { ok: false, error: "설정값이 올바르지 않습니다." };
  }

  const settings = value as Record<string, unknown>[];
  const requiredTypes: ScheduleType[] = ["A", "B", "COMMON"];
  const validated = requiredTypes.map((scheduleType) => {
    const item = settings.find((setting) => setting.scheduleType === scheduleType);
    const displayName = typeof item?.displayName === "string" ? item.displayName.trim() : "";
    const colorKey = item?.colorKey as ColorKey;

    if (!displayName) {
      return { ok: false as const, error: "표시 이름을 입력해주세요." };
    }

    if (!colorKeys.has(colorKey)) {
      return { ok: false as const, error: "색상을 선택해주세요." };
    }

    return {
      ok: true as const,
      data: {
        scheduleType,
        displayName,
        colorKey
      }
    };
  });

  const failed = validated.find((item) => !item.ok);
  if (failed) {
    return { ok: false, error: failed.error };
  }

  return {
    ok: true,
    data: validated.flatMap((item) => (item.ok ? [item.data] : []))
  };
}
