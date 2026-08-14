import { NextResponse } from "next/server";
import { ensureChecklistItemsTable, getSql } from "@/lib/db";
import { logApiError } from "@/lib/log";

type ReorderItem = {
  id: number;
  sortOrder: number;
};

function validateReorderItems(value: unknown): { ok: true; items: ReorderItem[] } | { ok: false; error: string } {
  if (!value || typeof value !== "object") {
    return { ok: false, error: "요청 본문이 올바르지 않습니다." };
  }

  const items = (value as Record<string, unknown>).items;
  if (!Array.isArray(items) || items.length === 0) {
    return { ok: false, error: "정렬할 항목이 없습니다." };
  }

  const validated = items.map((item) => {
    const record = item as Record<string, unknown>;
    return {
      id: Number(record.id),
      sortOrder: Number(record.sortOrder)
    };
  });

  const hasInvalid = validated.some((item) => !Number.isInteger(item.id) || item.id <= 0 || !Number.isInteger(item.sortOrder) || item.sortOrder <= 0);
  if (hasInvalid) {
    return { ok: false, error: "정렬값이 올바르지 않습니다." };
  }

  const ids = new Set(validated.map((item) => item.id));
  if (ids.size !== validated.length) {
    return { ok: false, error: "중복된 항목이 있습니다." };
  }

  return { ok: true, items: validated };
}

export async function PUT(request: Request) {
  try {
    await ensureChecklistItemsTable();

    const validation = validateReorderItems(await request.json());
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const sql = getSql();
    const ids = validation.items.map((item) => item.id);
    const existing = await sql`
      SELECT id, is_completed
      FROM checklist_items
      WHERE id = ANY(${ids})
    `;

    if (existing.length !== ids.length) {
      return NextResponse.json({ error: "체크리스트를 찾을 수 없습니다." }, { status: 404 });
    }

    const groups = new Set(existing.map((row) => Boolean(row.is_completed)));
    if (groups.size > 1) {
      return NextResponse.json({ error: "같은 완료 상태의 항목끼리만 정렬할 수 있습니다." }, { status: 400 });
    }

    await sql.transaction((txn) =>
      validation.items.map((item) => txn`
        UPDATE checklist_items
        SET sort_order = ${item.sortOrder},
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ${item.id}
      `)
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    logApiError("[api/checklist/reorder] PUT failed", error);
    return NextResponse.json({ error: "체크리스트 순서를 저장하지 못했습니다." }, { status: 500 });
  }
}
