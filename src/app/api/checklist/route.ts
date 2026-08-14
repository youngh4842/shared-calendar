import { NextResponse } from "next/server";
import { mapChecklistItem, sortChecklistItems, validateChecklistContent } from "@/lib/checklist";
import { ensureChecklistItemsTable, getSql } from "@/lib/db";
import { logApiError } from "@/lib/log";

export async function GET() {
  try {
    await ensureChecklistItemsTable();

    const sql = getSql();
    const rows = await sql`
      SELECT *
      FROM checklist_items
      ORDER BY
        CASE WHEN is_completed THEN 1 ELSE 0 END ASC,
        sort_order ASC,
        id ASC
    `;

    return NextResponse.json(sortChecklistItems(rows.map(mapChecklistItem)));
  } catch (error) {
    logApiError("[api/checklist] GET failed", error);
    return NextResponse.json({ error: "체크리스트를 불러오지 못했습니다." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureChecklistItemsTable();

    const body = (await request.json()) as Record<string, unknown>;
    const validation = validateChecklistContent(body.content);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const sql = getSql();
    const rows = await sql`
      INSERT INTO checklist_items (content, is_completed, sort_order)
      VALUES (
        ${validation.content},
        FALSE,
        (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM checklist_items WHERE is_completed = FALSE)
      )
      RETURNING *
    `;

    return NextResponse.json(mapChecklistItem(rows[0]), { status: 201 });
  } catch (error) {
    logApiError("[api/checklist] POST failed", error);
    return NextResponse.json({ error: "체크리스트를 등록하지 못했습니다." }, { status: 500 });
  }
}
