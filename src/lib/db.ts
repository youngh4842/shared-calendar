import { neon } from "@neondatabase/serverless";

let tableReady: Promise<void> | null = null;

export function getSql() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not set.");
  }

  return neon(databaseUrl);
}

export async function ensureSchedulesTable() {
  if (!tableReady) {
    const sql = getSql();
    tableReady = sql`
      CREATE TABLE IF NOT EXISTS schedules (
        id BIGSERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        start_at TIMESTAMPTZ NOT NULL,
        end_at TIMESTAMPTZ NOT NULL,
        all_day BOOLEAN NOT NULL DEFAULT FALSE,
        schedule_type TEXT NOT NULL CHECK (schedule_type IN ('A', 'B', 'COMMON')),
        created_by TEXT NOT NULL CHECK (created_by IN ('A', 'B')),
        memo TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `.then(async () => {
      await sql`CREATE INDEX IF NOT EXISTS schedules_range_idx ON schedules (start_at, end_at)`;
    });
  }

  return tableReady;
}
