import { NextResponse } from "next/server";
import { ensureRemindersTable, getSql } from "@/lib/db";
import { logApiError } from "@/lib/log";
import { mapReminder, validateReminderInput } from "@/lib/reminder";

const SELECT_COLUMNS = `
  SELECT r.id, r.title, r.body, r.scheduled_at, r.schedule_id,
         s.title AS schedule_title, r.sent_at, r.created_at, r.updated_at
  FROM notification_reminders r
  LEFT JOIN schedules s ON s.id = r.schedule_id
`;

export async function GET() {
  try {
    await ensureRemindersTable();
    const rows = await getSql().query(`${SELECT_COLUMNS}
      WHERE r.sent_at IS NULL AND r.scheduled_at > CURRENT_TIMESTAMP
      ORDER BY r.scheduled_at ASC, r.id ASC`);
    return NextResponse.json(rows.map(mapReminder));
  } catch (error) {
    logApiError("[api/reminders] GET failed", error);
    return NextResponse.json({ error: "알림 목록을 불러오지 못했습니다." }, { status: 500 });
  }
}
export async function POST(request: Request) {
  try {
    await ensureRemindersTable();
    const validation = validateReminderInput((await request.json()) as Record<string, unknown>);
    if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 });

    const data = validation.data;
    const sql = getSql();
    if (data.scheduleId !== null) {
      const scheduleRows = await sql`SELECT id FROM schedules WHERE id = ${data.scheduleId}`;
      if (scheduleRows.length === 0) return NextResponse.json({ error: "선택한 일정을 찾지 못했습니다." }, { status: 400 });
    }
    const inserted = await sql`
      INSERT INTO notification_reminders (title, body, scheduled_at, schedule_id)
      VALUES (${data.title}, ${data.body}, ${data.scheduledAt}::timestamptz, ${data.scheduleId})
      RETURNING id
    `;
    const rows = await sql.query(`${SELECT_COLUMNS} WHERE r.id = $1`, [inserted[0].id]);
    return NextResponse.json(mapReminder(rows[0]), { status: 201 });
  } catch (error) {
    logApiError("[api/reminders] POST failed", error);
    return NextResponse.json({ error: "알림을 저장하지 못했습니다." }, { status: 500 });
  }
}

