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
        schedule_date DATE,
        title VARCHAR(200) NOT NULL,
        schedule_type VARCHAR(10) NOT NULL,
        created_by VARCHAR(1) NOT NULL,
        memo TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT chk_schedule_type CHECK (schedule_type IN ('A', 'B', 'COMMON')),
        CONSTRAINT chk_created_by CHECK (created_by IN ('A', 'B'))
      )
    `.then(async () => {
      await sql`ALTER TABLE schedules ADD COLUMN IF NOT EXISTS schedule_date DATE`;
      await sql`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'schedules'
              AND column_name = 'start_at'
          ) THEN
            EXECUTE 'UPDATE schedules
              SET schedule_date = COALESCE(schedule_date, (start_at AT TIME ZONE ''Asia/Seoul'')::date)
              WHERE schedule_date IS NULL';
          END IF;
        END $$;
      `;
      await sql`UPDATE schedules SET schedule_date = COALESCE(schedule_date, CURRENT_DATE) WHERE schedule_date IS NULL`;
      await sql`ALTER TABLE schedules ALTER COLUMN schedule_date SET NOT NULL`;
      await sql`ALTER TABLE schedules ALTER COLUMN title TYPE VARCHAR(200)`;
      await sql`ALTER TABLE schedules ALTER COLUMN schedule_type TYPE VARCHAR(10)`;
      await sql`ALTER TABLE schedules ALTER COLUMN created_by TYPE VARCHAR(1)`;
      await sql`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'schedules'
              AND column_name = 'created_at'
              AND data_type = 'timestamp with time zone'
          ) THEN
            EXECUTE 'ALTER TABLE schedules ALTER COLUMN created_at TYPE TIMESTAMP USING created_at AT TIME ZONE ''Asia/Seoul''';
          END IF;

          IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'schedules'
              AND column_name = 'updated_at'
              AND data_type = 'timestamp with time zone'
          ) THEN
            EXECUTE 'ALTER TABLE schedules ALTER COLUMN updated_at TYPE TIMESTAMP USING updated_at AT TIME ZONE ''Asia/Seoul''';
          END IF;
        END $$;
      `;
      await sql`ALTER TABLE schedules DROP COLUMN IF EXISTS start_at`;
      await sql`ALTER TABLE schedules DROP COLUMN IF EXISTS end_at`;
      await sql`ALTER TABLE schedules DROP COLUMN IF EXISTS all_day`;
      await sql`DROP INDEX IF EXISTS schedules_range_idx`;
      await sql`CREATE INDEX IF NOT EXISTS schedules_date_idx ON schedules (schedule_date, id)`;
    });
  }

  return tableReady;
}
