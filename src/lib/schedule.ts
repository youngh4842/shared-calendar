import type { CalendarUser, Schedule, ScheduleInput, ScheduleType } from "@/types/schedule";

const scheduleTypes = new Set<ScheduleType>(["A", "B", "COMMON"]);
const users = new Set<CalendarUser>(["A", "B"]);

function toIsoString(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value);
}

export function mapSchedule(row: Record<string, unknown>): Schedule {
  return {
    id: Number(row.id),
    title: String(row.title),
    startAt: toIsoString(row.start_at),
    endAt: toIsoString(row.end_at),
    allDay: Boolean(row.all_day),
    scheduleType: row.schedule_type as ScheduleType,
    createdBy: row.created_by as CalendarUser,
    memo: typeof row.memo === "string" ? row.memo : null,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at)
  };
}

export function validateScheduleInput(value: unknown): { ok: true; data: ScheduleInput } | { ok: false; error: string } {
  if (!value || typeof value !== "object") {
    return { ok: false, error: "요청 본문이 올바르지 않습니다." };
  }

  const body = value as Record<string, unknown>;
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const startAt = typeof body.startAt === "string" ? body.startAt : "";
  const endAt = typeof body.endAt === "string" ? body.endAt : "";
  const scheduleType = body.scheduleType as ScheduleType;
  const createdBy = body.createdBy as CalendarUser;
  const allDay = Boolean(body.allDay);
  const memo = typeof body.memo === "string" && body.memo.trim() ? body.memo.trim() : null;

  if (!title) return { ok: false, error: "일정 제목을 입력해주세요." };
  if (!startAt || Number.isNaN(Date.parse(startAt))) return { ok: false, error: "시작 일시가 올바르지 않습니다." };
  if (!endAt || Number.isNaN(Date.parse(endAt))) return { ok: false, error: "종료 일시가 올바르지 않습니다." };
  if (new Date(endAt).getTime() <= new Date(startAt).getTime()) {
    return { ok: false, error: "종료 일시는 시작 일시보다 늦어야 합니다." };
  }
  if (!scheduleTypes.has(scheduleType)) return { ok: false, error: "일정 구분이 올바르지 않습니다." };
  if (!users.has(createdBy)) return { ok: false, error: "등록한 사용자가 올바르지 않습니다." };

  if (scheduleType !== "COMMON" && scheduleType !== createdBy) {
    return { ok: false, error: "내 일정은 현재 사용자와 같은 일정 구분이어야 합니다." };
  }

  return {
    ok: true,
    data: {
      title,
      startAt,
      endAt,
      allDay,
      scheduleType,
      createdBy,
      memo
    }
  };
}
