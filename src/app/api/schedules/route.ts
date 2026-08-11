import { NextResponse } from "next/server";
import { ensureSchedulesTable, getSql } from "@/lib/db";
import { logApiError } from "@/lib/log";
import { mapSchedule, validateScheduleInput } from "@/lib/schedule";

export async function GET(request: Request) {
  try {
    await ensureSchedulesTable();

    const { searchParams } = new URL(request.url);
    const start = searchParams.get("start");
    const end = searchParams.get("end");
    const sql = getSql();

    const rows = start && end
      ? await sql`
          SELECT *
          FROM schedules
          WHERE start_at < ${end}::timestamptz
            AND end_at > ${start}::timestamptz
          ORDER BY start_at ASC
        `
      : await sql`
          SELECT *
          FROM schedules
          ORDER BY start_at ASC
        `;

    return NextResponse.json(rows.map(mapSchedule));
  } catch (error) {
    logApiError("[api/schedules] GET failed", error);
    return NextResponse.json({ error: "일정을 불러오지 못했습니다." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureSchedulesTable();

    const validation = validateScheduleInput(await request.json());
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const data = validation.data;
    const sql = getSql();
    const rows = await sql`
      INSERT INTO schedules (title, start_at, end_at, all_day, schedule_type, created_by, memo)
      VALUES (
        ${data.title},
        ${data.startAt}::timestamptz,
        ${data.endAt}::timestamptz,
        ${data.allDay},
        ${data.scheduleType},
        ${data.createdBy},
        ${data.memo}
      )
      RETURNING *
    `;

    return NextResponse.json(mapSchedule(rows[0]), { status: 201 });
  } catch (error) {
    logApiError("[api/schedules] POST failed", error);
    return NextResponse.json({ error: "일정을 등록하지 못했습니다." }, { status: 500 });
  }
}
