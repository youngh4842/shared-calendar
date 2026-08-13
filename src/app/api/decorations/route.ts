import { NextResponse } from "next/server";
import { ensureDateDecorationsTable, getSql } from "@/lib/db";
import { logApiError } from "@/lib/log";
import { isValidScheduleDate } from "@/utils/date";

const koreaDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
});

function toDateString(value: unknown): string {
  if (value instanceof Date) {
    return koreaDateFormatter.format(value);
  }

  return String(value).slice(0, 10);
}

function mapDecoration(row: Record<string, unknown>) {
  return {
    date: toDateString(row.decoration_date)
  };
}

export async function GET(request: Request) {
  try {
    await ensureDateDecorationsTable();

    const { searchParams } = new URL(request.url);
    const start = searchParams.get("start");
    const end = searchParams.get("end");

    if (!isValidScheduleDate(start) || !isValidScheduleDate(end) || end < start) {
      return NextResponse.json({ error: "조회 날짜 범위가 올바르지 않습니다." }, { status: 400 });
    }

    const sql = getSql();
    const rows = await sql`
      SELECT decoration_date
      FROM date_decorations
      WHERE decoration_date BETWEEN ${start}::date AND ${end}::date
      ORDER BY decoration_date ASC
    `;

    return NextResponse.json(rows.map(mapDecoration));
  } catch (error) {
    logApiError("[api/decorations] GET failed", error);
    return NextResponse.json({ error: "날짜 꾸미기를 불러오지 못했습니다." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureDateDecorationsTable();

    const body = (await request.json()) as Record<string, unknown>;
    const date = typeof body.date === "string" ? body.date : null;

    if (!isValidScheduleDate(date)) {
      return NextResponse.json({ error: "날짜가 올바르지 않습니다." }, { status: 400 });
    }

    const sql = getSql();
    const rows = await sql`
      INSERT INTO date_decorations (decoration_date)
      VALUES (${date}::date)
      ON CONFLICT (decoration_date) DO UPDATE
      SET decoration_date = EXCLUDED.decoration_date
      RETURNING decoration_date
    `;

    return NextResponse.json(mapDecoration(rows[0]), { status: 201 });
  } catch (error) {
    logApiError("[api/decorations] POST failed", error);
    return NextResponse.json({ error: "날짜 꾸미기를 저장하지 못했습니다." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await ensureDateDecorationsTable();

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");

    if (!isValidScheduleDate(date)) {
      return NextResponse.json({ error: "날짜가 올바르지 않습니다." }, { status: 400 });
    }

    const sql = getSql();
    await sql`DELETE FROM date_decorations WHERE decoration_date = ${date}::date`;

    return NextResponse.json({ date });
  } catch (error) {
    logApiError("[api/decorations] DELETE failed", error);
    return NextResponse.json({ error: "날짜 꾸미기를 삭제하지 못했습니다." }, { status: 500 });
  }
}
