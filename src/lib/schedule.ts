import type { CalendarUser, Schedule, ScheduleInput, ScheduleType } from "@/types/schedule";

const scheduleTypes = new Set<ScheduleType>(["A", "B", "COMMON"]);
const users = new Set<CalendarUser>(["A", "B"]);
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function toDateString(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return String(value).slice(0, 10);
}

function toTimestampString(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value);
}

export function mapSchedule(row: Record<string, unknown>): Schedule {
  return {
    id: Number(row.id),
    scheduleDate: toDateString(row.schedule_date),
    title: String(row.title),
    scheduleType: row.schedule_type as ScheduleType,
    createdBy: row.created_by as CalendarUser,
    memo: typeof row.memo === "string" ? row.memo : null,
    createdAt: toTimestampString(row.created_at),
    updatedAt: toTimestampString(row.updated_at)
  };
}

export function validateScheduleInput(value: unknown): { ok: true; data: ScheduleInput } | { ok: false; error: string } {
  if (!value || typeof value !== "object") {
    return { ok: false, error: "요청 본문이 올바르지 않습니다." };
  }

  const body = value as Record<string, unknown>;
  const scheduleDate = typeof body.scheduleDate === "string" ? body.scheduleDate : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const scheduleType = body.scheduleType as ScheduleType;
  const createdBy = body.createdBy as CalendarUser;
  const memo = typeof body.memo === "string" && body.memo.trim() ? body.memo.trim() : null;

  if (!datePattern.test(scheduleDate) || Number.isNaN(Date.parse(`${scheduleDate}T00:00:00+09:00`))) {
    return { ok: false, error: "일정 날짜가 올바르지 않습니다." };
  }
  if (!title) return { ok: false, error: "제목을 입력해주세요." };
  if (!scheduleTypes.has(scheduleType)) return { ok: false, error: "일정 구분이 올바르지 않습니다." };
  if (!users.has(createdBy)) return { ok: false, error: "등록한 사용자가 올바르지 않습니다." };

  if (scheduleType !== "COMMON" && scheduleType !== createdBy) {
    return { ok: false, error: "내 일정은 현재 사용자와 같은 일정 구분이어야 합니다." };
  }

  return {
    ok: true,
    data: {
      scheduleDate,
      title,
      scheduleType,
      createdBy,
      memo
    }
  };
}
