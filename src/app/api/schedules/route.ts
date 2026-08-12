import { NextResponse } from "next/server";
import { ensureSchedulesTable, getSql } from "@/lib/db";
import { logApiError } from "@/lib/log";
import { mapSchedule, validateScheduleInput } from "@/lib/schedule";
import { isValidScheduleDate } from "@/utils/date";

export async function GET(request: Request) {
  try {
    await ensureSchedulesTable();

    const { searchParams } = new URL(request.url);
    const start = searchParams.get("start");
    const end = searchParams.get("end");
    const sql = getSql();

    if ((start && !isValidScheduleDate(start)) || (end && !isValidScheduleDate(end))) {
      return NextResponse.json({ error: "조회 날짜 범위가 올바르지 않습니다." }, { status: 400 });
    }

    const rows = start && end
      ? await sql`
          SELECT *
          FROM schedules
          WHERE start_date <= ${end}::date
            AND end_date >= ${start}::date
          ORDER BY start_date ASC, end_date ASC, id ASC
        `
      : await sql`
          SELECT *
          FROM schedules
          ORDER BY start_date ASC, end_date ASC, id ASC
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
      INSERT INTO schedules (start_date, end_date, title, schedule_type, confirmation_status, memo)
      VALUES (
        ${data.startDate}::date,
        ${data.endDate}::date,
        ${data.title},
        ${data.scheduleType},
        ${data.confirmationStatus},
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
