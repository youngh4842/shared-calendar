import type { ConfirmationStatus, Schedule, ScheduleInput, ScheduleType } from "@/types/schedule";

const scheduleTypes = new Set<ScheduleType>(["A", "B", "COMMON"]);
const confirmationStatuses = new Set<ConfirmationStatus>(["CONFIRMED", "TENTATIVE"]);
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
    confirmationStatus: row.confirmation_status as ConfirmationStatus,
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
  const confirmationStatus = body.confirmationStatus as ConfirmationStatus;
  const memo = typeof body.memo === "string" && body.memo.trim() ? body.memo.trim() : null;

  if (!datePattern.test(scheduleDate) || Number.isNaN(Date.parse(`${scheduleDate}T00:00:00+09:00`))) {
    return { ok: false, error: "일정 날짜가 올바르지 않습니다." };
  }
  if (!title) return { ok: false, error: "제목을 입력해주세요." };
  if (!scheduleTypes.has(scheduleType)) return { ok: false, error: "일정 구분을 선택해주세요." };
  if (!confirmationStatuses.has(confirmationStatus)) return { ok: false, error: "확정 여부를 선택해주세요." };

  return {
    ok: true,
    data: {
      scheduleDate,
      title,
      scheduleType,
      confirmationStatus,
      memo
    }
  };
}
