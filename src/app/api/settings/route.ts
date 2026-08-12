import { NextResponse } from "next/server";
import { ensureCalendarSettingsTable, getSql } from "@/lib/db";
import { logApiError } from "@/lib/log";
import { mapCalendarSetting, validateCalendarSettingsInput } from "@/lib/schedule";

export async function GET() {
  try {
    await ensureCalendarSettingsTable();

    const sql = getSql();
    const rows = await sql`
      SELECT schedule_type, display_name, color_key
      FROM calendar_settings
      ORDER BY CASE schedule_type
        WHEN 'A' THEN 1
        WHEN 'B' THEN 2
        WHEN 'COMMON' THEN 3
        ELSE 4
      END
    `;

    return NextResponse.json(rows.map(mapCalendarSetting));
  } catch (error) {
    logApiError("[api/settings] GET failed", error);
    return NextResponse.json({ error: "설정을 불러오지 못했습니다." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await ensureCalendarSettingsTable();

    const validation = validateCalendarSettingsInput(await request.json());
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const sql = getSql();
    await Promise.all(
      validation.data.map((setting) =>
        sql`
          INSERT INTO calendar_settings (schedule_type, display_name, color_key, updated_at)
          VALUES (${setting.scheduleType}, ${setting.displayName}, ${setting.colorKey}, CURRENT_TIMESTAMP)
          ON CONFLICT (schedule_type) DO UPDATE
          SET display_name = EXCLUDED.display_name,
              color_key = EXCLUDED.color_key,
              updated_at = CURRENT_TIMESTAMP
        `
      )
    );

    const rows = await sql`
      SELECT schedule_type, display_name, color_key
      FROM calendar_settings
      ORDER BY CASE schedule_type
        WHEN 'A' THEN 1
        WHEN 'B' THEN 2
        WHEN 'COMMON' THEN 3
        ELSE 4
      END
    `;

    return NextResponse.json(rows.map(mapCalendarSetting));
  } catch (error) {
    logApiError("[api/settings] PUT failed", error);
    return NextResponse.json({ error: "설정을 저장하지 못했습니다." }, { status: 500 });
  }
}
