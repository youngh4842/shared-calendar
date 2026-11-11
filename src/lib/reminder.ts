import type { Reminder } from "@/types/reminder";

const SEOUL_OFFSET_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+09:00$/;

function toTimestamp(value: unknown): string {
  return value instanceof Date ? value.toISOString() : new Date(String(value)).toISOString();
}
export function mapReminder(row: Record<string, unknown>): Reminder {
  return {
    id: Number(row.id),
    title: String(row.title),
    body: String(row.body),
    scheduledAt: toTimestamp(row.scheduled_at),
    scheduleId: row.schedule_id == null ? null : Number(row.schedule_id),
    scheduleTitle: row.schedule_title == null ? null : String(row.schedule_title),
    sentAt: row.sent_at == null ? null : toTimestamp(row.sent_at),
    createdAt: toTimestamp(row.created_at),
    updatedAt: toTimestamp(row.updated_at)
  };
}

export function validateReminderInput(body: Record<string, unknown>) {
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const content = typeof body.body === "string" ? body.body.trim() : "";
  const scheduledAt = typeof body.scheduledAt === "string" ? body.scheduledAt : "";
  const rawScheduleId = body.scheduleId;
  const scheduleId = rawScheduleId == null || rawScheduleId === "" ? null : Number(rawScheduleId);

  if (!title) return { ok: false as const, error: "알림 제목을 입력해주세요." };
  if (title.length > 120) return { ok: false as const, error: "알림 제목은 120자 이내로 입력해주세요." };
  if (!content) return { ok: false as const, error: "알림 내용을 입력해주세요." };
  if (content.length > 500) return { ok: false as const, error: "알림 내용은 500자 이내로 입력해주세요." };
  if (!SEOUL_OFFSET_PATTERN.test(scheduledAt) || Number.isNaN(Date.parse(scheduledAt))) {
    return { ok: false as const, error: "알림 날짜와 시간을 올바르게 입력해주세요." };
  }
  if (scheduleId !== null && (!Number.isInteger(scheduleId) || scheduleId <= 0)) {
    return { ok: false as const, error: "선택한 일정이 올바르지 않습니다." };
  }

  return { ok: true as const, data: { title, body: content, scheduledAt, scheduleId } };
}

export function parseReminderId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

