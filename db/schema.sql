CREATE TABLE IF NOT EXISTS schedules (
  id BIGSERIAL PRIMARY KEY,
  schedule_date DATE NOT NULL,
  title VARCHAR(200) NOT NULL,
  schedule_type VARCHAR(10) NOT NULL,
  confirmation_status VARCHAR(10) NOT NULL DEFAULT 'CONFIRMED',
  memo TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_schedule_type CHECK (schedule_type IN ('A', 'B', 'COMMON')),
  CONSTRAINT chk_confirmation_status CHECK (confirmation_status IN ('CONFIRMED', 'TENTATIVE'))
);

CREATE INDEX IF NOT EXISTS schedules_date_idx ON schedules (schedule_date, id);
