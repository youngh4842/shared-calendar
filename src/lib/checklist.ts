import type { ChecklistItem } from "@/types/checklist";

function toTimestampString(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value);
}

export function mapChecklistItem(row: Record<string, unknown>): ChecklistItem {
  return {
    id: Number(row.id),
    content: String(row.content),
    isCompleted: Boolean(row.is_completed),
    sortOrder: Number(row.sort_order),
    createdAt: toTimestampString(row.created_at),
    updatedAt: toTimestampString(row.updated_at)
  };
}

export function sortChecklistItems(items: ChecklistItem[]) {
  return [...items].sort((left, right) => {
    if (left.isCompleted !== right.isCompleted) {
      return left.isCompleted ? 1 : -1;
    }

    return left.sortOrder - right.sortOrder || left.id - right.id;
  });
}

export function validateChecklistContent(value: unknown): { ok: true; content: string } | { ok: false; error: string } {
  const content = typeof value === "string" ? value.trim() : "";

  if (!content) {
    return { ok: false, error: "내용을 입력해주세요." };
  }

  if (content.length > 300) {
    return { ok: false, error: "내용은 300자 이내로 입력해주세요." };
  }

  return { ok: true, content };
}

export function parseChecklistId(id: string) {
  const value = Number(id);
  return Number.isInteger(value) && value > 0 ? value : null;
}
