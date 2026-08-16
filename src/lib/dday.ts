import type { DDayItem } from "@/types/dday";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function toTimestampString(value: unknown): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

function toDateKey(value: unknown): string {
  const text = String(value);
  if (!DATE_PATTERN.test(text)) {
    throw new Error("D-Day target_date must be returned as YYYY-MM-DD text.");
  }
  return text;
}

export function mapDDayItem(row: Record<string, unknown>): DDayItem {
  return {
    id: Number(row.id),
    title: String(row.title),
    targetDate: toDateKey(row.target_date),
    sortOrder: Number(row.sort_order),
    createdAt: toTimestampString(row.created_at),
    updatedAt: toTimestampString(row.updated_at)
  };
}

export function validateDDayInput(body: Record<string, unknown>) {
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const targetDate = typeof body.targetDate === "string" ? body.targetDate : "";

  if (!title) return { ok: false as const, error: "제목을 입력해주세요." };
  if (title.length > 100) return { ok: false as const, error: "제목은 100자 이내로 입력해주세요." };
  if (!DATE_PATTERN.test(targetDate)) return { ok: false as const, error: "날짜를 입력해주세요." };

  const [year, month, day] = targetDate.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) {
    return { ok: false as const, error: "올바른 날짜를 입력해주세요." };
  }

  return { ok: true as const, title, targetDate };
}

export function parseDDayId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}
