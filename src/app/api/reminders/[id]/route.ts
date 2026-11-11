import { NextResponse } from "next/server";
import { ensureRemindersTable, getSql } from "@/lib/db";
import { logApiError } from "@/lib/log";
import { mapReminder, parseReminderId, validateReminderInput } from "@/lib/reminder";

type Context = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: Context) {
  try {
    await ensureRemindersTable();
    const id = parseReminderId((await context.params).id);
    if (!id) return NextResponse.json({ error: "알림 ID가 올바르지 않습니다." }, { status: 400 });
    const validation = validateReminderInput((await request.json()) as Record<string, unknown>);
    if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 });

    const data = validation.data;
    const sql = getSql();
    if (data.scheduleId !== null) {
      const scheduleRows = await sql`SELECT id FROM schedules WHERE id = ${data.scheduleId}`;
      if (scheduleRows.length === 0) return NextResponse.json({ error: "선택한 일정을 찾지 못했습니다." }, { status: 400 });
    }
    const rows = await sql`
      UPDATE notification_reminders
      SET title = ${data.title}, body = ${data.body}, scheduled_at = ${data.scheduledAt}::timestamptz,
          schedule_id = ${data.scheduleId}, sent_at = NULL, claimed_at = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING id, title, body, scheduled_at, schedule_id, sent_at, created_at, updated_at
    `;
    if (rows.length === 0) return NextResponse.json({ error: "알림을 찾지 못했습니다." }, { status: 404 });
    const scheduleTitle = data.scheduleId === null ? null : (await sql`SELECT title FROM schedules WHERE id = ${data.scheduleId}`)[0]?.title;
    return NextResponse.json(mapReminder({ ...rows[0], schedule_title: scheduleTitle }));
  } catch (error) {
    logApiError("[api/reminders/[id]] PUT failed", error);
    return NextResponse.json({ error: "알림을 수정하지 못했습니다." }, { status: 500 });
  }
}
export async function DELETE(_request: Request, context: Context) {
  try {
    await ensureRemindersTable();
    const id = parseReminderId((await context.params).id);
    if (!id) return NextResponse.json({ error: "알림 ID가 올바르지 않습니다." }, { status: 400 });
    const rows = await getSql()`DELETE FROM notification_reminders WHERE id = ${id} RETURNING id`;
    if (rows.length === 0) return NextResponse.json({ error: "알림을 찾지 못했습니다." }, { status: 404 });
    return NextResponse.json({ id });
  } catch (error) {
    logApiError("[api/reminders/[id]] DELETE failed", error);
    return NextResponse.json({ error: "알림을 삭제하지 못했습니다." }, { status: 500 });
  }
}

