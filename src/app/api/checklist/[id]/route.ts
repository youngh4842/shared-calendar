import { NextResponse } from "next/server";
import { mapChecklistItem, parseChecklistId } from "@/lib/checklist";
import { ensureChecklistItemsTable, getSql } from "@/lib/db";
import { logApiError } from "@/lib/log";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, context: RouteContext) {
  try {
    await ensureChecklistItemsTable();

    const { id } = await context.params;
    const itemId = parseChecklistId(id);
    if (!itemId) {
      return NextResponse.json({ error: "체크리스트 ID가 올바르지 않습니다." }, { status: 400 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    if (typeof body.isCompleted !== "boolean") {
      return NextResponse.json({ error: "완료 여부가 올바르지 않습니다." }, { status: 400 });
    }

    const sql = getSql();
    const rows = await sql.transaction((txn) => [
      txn`
        UPDATE checklist_items
        SET is_completed = ${body.isCompleted},
            sort_order = (
              SELECT COALESCE(MAX(sort_order), 0) + 1
              FROM checklist_items
              WHERE is_completed = ${body.isCompleted}
                AND id <> ${itemId}
            ),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ${itemId}
        RETURNING *
      `
    ]);
    const updatedRows = rows[0];

    if (!updatedRows[0]) {
      return NextResponse.json({ error: "체크리스트를 찾을 수 없습니다." }, { status: 404 });
    }

    return NextResponse.json(mapChecklistItem(updatedRows[0]));
  } catch (error) {
    logApiError("[api/checklist/:id] PUT failed", error);
    return NextResponse.json({ error: "체크리스트를 수정하지 못했습니다." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    await ensureChecklistItemsTable();

    const { id } = await context.params;
    const itemId = parseChecklistId(id);
    if (!itemId) {
      return NextResponse.json({ error: "체크리스트 ID가 올바르지 않습니다." }, { status: 400 });
    }

    const sql = getSql();
    const rows = await sql`DELETE FROM checklist_items WHERE id = ${itemId} RETURNING id`;

    if (!rows[0]) {
      return NextResponse.json({ error: "체크리스트를 찾을 수 없습니다." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    logApiError("[api/checklist/:id] DELETE failed", error);
    return NextResponse.json({ error: "체크리스트를 삭제하지 못했습니다." }, { status: 500 });
  }
}
