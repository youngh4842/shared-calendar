import { NextResponse } from "next/server";
import { mapDDayItem, validateDDayInput } from "@/lib/dday";
import { ensureDDayItemsTable, getSql } from "@/lib/db";
import { logApiError } from "@/lib/log";

export async function GET() {
  try {
    await ensureDDayItemsTable();
    const rows = await getSql()`
      SELECT id, title, target_date::text AS target_date, sort_order, created_at, updated_at
      FROM dday_items
      ORDER BY sort_order ASC, id ASC
    `;
    return NextResponse.json(rows.map(mapDDayItem));
  } catch (error) {
    logApiError("[api/ddays] GET failed", error);
    return NextResponse.json({ error: "D-Day를 불러오지 못했습니다." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureDDayItemsTable();
    const validation = validateDDayInput((await request.json()) as Record<string, unknown>);
    if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 });
    const rows = await getSql()`
      INSERT INTO dday_items (title, target_date, sort_order)
      VALUES (${validation.title}, ${validation.targetDate}, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM dday_items))
      RETURNING id, title, target_date::text AS target_date, sort_order, created_at, updated_at
    `;
    return NextResponse.json(mapDDayItem(rows[0]), { status: 201 });
  } catch (error) {
    logApiError("[api/ddays] POST failed", error);
    return NextResponse.json({ error: "D-Day를 저장하지 못했습니다." }, { status: 500 });
  }
}
