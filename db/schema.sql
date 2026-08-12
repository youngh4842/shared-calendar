CREATE TABLE IF NOT EXISTS schedules (
  id BIGSERIAL PRIMARY KEY,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  title VARCHAR(200) NOT NULL,
  schedule_type VARCHAR(10) NOT NULL,
  confirmation_status VARCHAR(10) NOT NULL DEFAULT 'CONFIRMED',
  memo TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_schedule_type CHECK (schedule_type IN ('A', 'B', 'COMMON')),
  CONSTRAINT chk_confirmation_status CHECK (confirmation_status IN ('CONFIRMED', 'TENTATIVE')),
  CONSTRAINT chk_schedule_date_range CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS schedules_range_idx ON schedules (start_date, end_date, id);

CREATE TABLE IF NOT EXISTS calendar_settings (
  id BIGSERIAL PRIMARY KEY,
  schedule_type VARCHAR(10) NOT NULL UNIQUE,
  display_name VARCHAR(40) NOT NULL,
  color_key VARCHAR(20) NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_calendar_setting_type CHECK (schedule_type IN ('A', 'B', 'COMMON')),
  CONSTRAINT chk_calendar_setting_color CHECK (color_key IN ('sky', 'purple', 'pink', 'yellow', 'lime', 'gray'))
);

INSERT INTO calendar_settings (schedule_type, display_name, color_key)
VALUES
  ('A', 'A', 'sky'),
  ('B', 'B', 'purple'),
  ('COMMON', '같이', 'lime')
ON CONFLICT (schedule_type) DO NOTHING;
