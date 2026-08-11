import { NextResponse } from "next/server";
import { ensureSchedulesTable, getSql } from "@/lib/db";
import { logApiError } from "@/lib/log";
import { mapSchedule, validateScheduleInput } from "@/lib/schedule";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function parseId(id: string) {
  const value = Number(id);
  return Number.isInteger(value) && value > 0 ? value : null;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    await ensureSchedulesTable();

    const { id } = await context.params;
    const scheduleId = parseId(id);
    if (!scheduleId) {
      return NextResponse.json({ error: "일정 ID가 올바르지 않습니다." }, { status: 400 });
    }

    const sql = getSql();
    const rows = await sql`SELECT * FROM schedules WHERE id = ${scheduleId}`;

    if (!rows[0]) {
      return NextResponse.json({ error: "일정을 찾을 수 없습니다." }, { status: 404 });
    }

    return NextResponse.json(mapSchedule(rows[0]));
  } catch (error) {
    logApiError("[api/schedules/:id] GET failed", error);
    return NextResponse.json({ error: "일정을 불러오지 못했습니다." }, { status: 500 });
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    await ensureSchedulesTable();

    const { id } = await context.params;
    const scheduleId = parseId(id);
    if (!scheduleId) {
      return NextResponse.json({ error: "일정 ID가 올바르지 않습니다." }, { status: 400 });
    }

    const validation = validateScheduleInput(await request.json());
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const data = validation.data;
    const sql = getSql();
    const rows = await sql`
      UPDATE schedules
      SET schedule_date = ${data.scheduleDate}::date,
          title = ${data.title},
          schedule_type = ${data.scheduleType},
          created_by = ${data.createdBy},
          memo = ${data.memo},
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${scheduleId}
      RETURNING *
    `;

    if (!rows[0]) {
      return NextResponse.json({ error: "일정을 찾을 수 없습니다." }, { status: 404 });
    }

    return NextResponse.json(mapSchedule(rows[0]));
  } catch (error) {
    logApiError("[api/schedules/:id] PUT failed", error);
    return NextResponse.json({ error: "일정을 수정하지 못했습니다." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    await ensureSchedulesTable();

    const { id } = await context.params;
    const scheduleId = parseId(id);
    if (!scheduleId) {
      return NextResponse.json({ error: "일정 ID가 올바르지 않습니다." }, { status: 400 });
    }

    const sql = getSql();
    const rows = await sql`DELETE FROM schedules WHERE id = ${scheduleId} RETURNING id`;

    if (!rows[0]) {
      return NextResponse.json({ error: "일정을 찾을 수 없습니다." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    logApiError("[api/schedules/:id] DELETE failed", error);
    return NextResponse.json({ error: "일정을 삭제하지 못했습니다." }, { status: 500 });
  }
}
