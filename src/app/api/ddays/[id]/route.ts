import { NextResponse } from "next/server";
import { mapDDayItem, parseDDayId, validateDDayInput } from "@/lib/dday";
import { ensureDDayItemsTable, getSql } from "@/lib/db";
import { logApiError } from "@/lib/log";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: RouteContext) {
  try {
    await ensureDDayItemsTable();
    const { id } = await context.params;
    const itemId = parseDDayId(id);
    if (!itemId) return NextResponse.json({ error: "D-Day ID가 올바르지 않습니다." }, { status: 400 });
    const validation = validateDDayInput((await request.json()) as Record<string, unknown>);
    if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 });
    const rows = await getSql()`
      UPDATE dday_items SET title = ${validation.title}, target_date = ${validation.targetDate}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${itemId}
      RETURNING id, title, target_date::text AS target_date, sort_order, created_at, updated_at
    `;
    if (!rows[0]) return NextResponse.json({ error: "D-Day를 찾을 수 없습니다." }, { status: 404 });
    return NextResponse.json(mapDDayItem(rows[0]));
  } catch (error) {
    logApiError("[api/ddays/:id] PUT failed", error);
    return NextResponse.json({ error: "D-Day를 수정하지 못했습니다." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    await ensureDDayItemsTable();
    const { id } = await context.params;
    const itemId = parseDDayId(id);
    if (!itemId) return NextResponse.json({ error: "D-Day ID가 올바르지 않습니다." }, { status: 400 });
    const rows = await getSql()`DELETE FROM dday_items WHERE id = ${itemId} RETURNING id`;
    if (!rows[0]) return NextResponse.json({ error: "D-Day를 찾을 수 없습니다." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    logApiError("[api/ddays/:id] DELETE failed", error);
    return NextResponse.json({ error: "D-Day를 삭제하지 못했습니다." }, { status: 500 });
  }
}
