CREATE TABLE IF NOT EXISTS schedules (
  id BIGSERIAL PRIMARY KEY,
  schedule_date DATE NOT NULL,
  title VARCHAR(200) NOT NULL,
  schedule_type VARCHAR(10) NOT NULL,
  created_by VARCHAR(1) NOT NULL,
  memo TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_schedule_type CHECK (schedule_type IN ('A', 'B', 'COMMON')),
  CONSTRAINT chk_created_by CHECK (created_by IN ('A', 'B'))
);

CREATE INDEX IF NOT EXISTS schedules_date_idx ON schedules (schedule_date, id);
