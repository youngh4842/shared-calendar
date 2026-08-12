import { neon } from "@neondatabase/serverless";

let schedulesReady: Promise<void> | null = null;
let settingsReady: Promise<void> | null = null;

export function getSql() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not set.");
  }

  return neon(databaseUrl);
}

export async function ensureSchedulesTable() {
  if (!schedulesReady) {
    const sql = getSql();
    schedulesReady = sql`
      CREATE TABLE IF NOT EXISTS schedules (
        id BIGSERIAL PRIMARY KEY,
        start_date DATE,
        end_date DATE,
        title VARCHAR(200) NOT NULL,
        schedule_type VARCHAR(10) NOT NULL,
        confirmation_status VARCHAR(10) NOT NULL DEFAULT 'CONFIRMED',
        memo TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT chk_schedule_type CHECK (schedule_type IN ('A', 'B', 'COMMON')),
        CONSTRAINT chk_confirmation_status CHECK (confirmation_status IN ('CONFIRMED', 'TENTATIVE'))
      )
    `.then(async () => {
      await sql`ALTER TABLE schedules ADD COLUMN IF NOT EXISTS start_date DATE`;
      await sql`ALTER TABLE schedules ADD COLUMN IF NOT EXISTS end_date DATE`;
      await sql`ALTER TABLE schedules ADD COLUMN IF NOT EXISTS confirmation_status VARCHAR(10) NOT NULL DEFAULT 'CONFIRMED'`;
      await sql`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'schedules'
              AND column_name = 'schedule_date'
          ) THEN
            EXECUTE 'UPDATE schedules
              SET start_date = COALESCE(start_date, schedule_date),
                  end_date = COALESCE(end_date, schedule_date)
              WHERE schedule_date IS NOT NULL';
          END IF;

          IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'schedules'
              AND column_name = 'start_at'
          ) THEN
            EXECUTE 'UPDATE schedules
              SET start_date = COALESCE(start_date, (start_at AT TIME ZONE ''Asia/Seoul'')::date),
                  end_date = COALESCE(end_date, (start_at AT TIME ZONE ''Asia/Seoul'')::date)
              WHERE start_date IS NULL OR end_date IS NULL';
          END IF;
        END $$;
      `;
      await sql`UPDATE schedules SET start_date = COALESCE(start_date, CURRENT_DATE) WHERE start_date IS NULL`;
      await sql`UPDATE schedules SET end_date = COALESCE(end_date, start_date) WHERE end_date IS NULL`;
      await sql`UPDATE schedules SET end_date = start_date WHERE end_date < start_date`;
      await sql`ALTER TABLE schedules ALTER COLUMN start_date SET NOT NULL`;
      await sql`ALTER TABLE schedules ALTER COLUMN end_date SET NOT NULL`;
      await sql`ALTER TABLE schedules ALTER COLUMN title TYPE VARCHAR(200)`;
      await sql`ALTER TABLE schedules ALTER COLUMN schedule_type TYPE VARCHAR(10)`;
      await sql`ALTER TABLE schedules ALTER COLUMN confirmation_status TYPE VARCHAR(10)`;
      await sql`UPDATE schedules SET confirmation_status = 'CONFIRMED' WHERE confirmation_status IS NULL`;
      await sql`ALTER TABLE schedules ALTER COLUMN confirmation_status SET DEFAULT 'CONFIRMED'`;
      await sql`ALTER TABLE schedules ALTER COLUMN confirmation_status SET NOT NULL`;
      await sql`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'chk_confirmation_status'
          ) THEN
            ALTER TABLE schedules
            ADD CONSTRAINT chk_confirmation_status
            CHECK (confirmation_status IN ('CONFIRMED', 'TENTATIVE'));
          END IF;
        END $$;
      `;
      await sql`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'chk_schedule_date_range'
          ) THEN
            ALTER TABLE schedules
            ADD CONSTRAINT chk_schedule_date_range
            CHECK (end_date >= start_date);
          END IF;
        END $$;
      `;
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
      await sql`ALTER TABLE schedules DROP COLUMN IF EXISTS schedule_date`;
      await sql`ALTER TABLE schedules DROP COLUMN IF EXISTS start_at`;
      await sql`ALTER TABLE schedules DROP COLUMN IF EXISTS end_at`;
      await sql`ALTER TABLE schedules DROP COLUMN IF EXISTS all_day`;
      await sql`ALTER TABLE schedules DROP COLUMN IF EXISTS created_by`;
      await sql`DROP INDEX IF EXISTS schedules_date_idx`;
      await sql`DROP INDEX IF EXISTS schedules_range_idx`;
      await sql`CREATE INDEX IF NOT EXISTS schedules_range_idx ON schedules (start_date, end_date, id)`;
    });
  }

  return schedulesReady;
}

export async function ensureCalendarSettingsTable() {
  if (!settingsReady) {
    const sql = getSql();
    settingsReady = sql`
      CREATE TABLE IF NOT EXISTS calendar_settings (
        id BIGSERIAL PRIMARY KEY,
        schedule_type VARCHAR(10) NOT NULL UNIQUE,
        display_name VARCHAR(40) NOT NULL,
        color_key VARCHAR(20) NOT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT chk_calendar_setting_type CHECK (schedule_type IN ('A', 'B', 'COMMON')),
        CONSTRAINT chk_calendar_setting_color CHECK (color_key IN ('sky', 'purple', 'pink', 'yellow', 'lime', 'gray'))
      )
    `.then(async () => {
      await sql`ALTER TABLE calendar_settings DROP CONSTRAINT IF EXISTS chk_calendar_setting_color`;
      await sql`
        UPDATE calendar_settings
        SET color_key = CASE color_key
          WHEN 'blue' THEN 'sky'
          WHEN 'orange' THEN 'yellow'
          WHEN 'green' THEN 'lime'
          ELSE color_key
        END
        WHERE color_key IN ('blue', 'orange', 'green')
      `;
      await sql`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'chk_calendar_setting_color'
          ) THEN
            ALTER TABLE calendar_settings
            ADD CONSTRAINT chk_calendar_setting_color
            CHECK (color_key IN ('sky', 'purple', 'pink', 'yellow', 'lime', 'gray'));
          END IF;
        END $$;
      `;
      await sql`
        INSERT INTO calendar_settings (schedule_type, display_name, color_key)
        VALUES
          ('A', 'A', 'sky'),
          ('B', 'B', 'purple'),
          ('COMMON', '같이', 'lime')
        ON CONFLICT (schedule_type) DO NOTHING
      `;
    });
  }

  return settingsReady;
}
