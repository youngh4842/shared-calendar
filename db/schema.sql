CREATE TABLE IF NOT EXISTS schedules (
  id BIGSERIAL PRIMARY KEY,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  title VARCHAR(200) NOT NULL,
  schedule_type VARCHAR(10),
  confirmation_status VARCHAR(10) NOT NULL DEFAULT 'CONFIRMED',
  color_key VARCHAR(20),
  memo TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_schedule_type CHECK (schedule_type IS NULL OR schedule_type IN ('A', 'B', 'COMMON')),
  CONSTRAINT chk_confirmation_status CHECK (confirmation_status IN ('CONFIRMED', 'TENTATIVE')),
  CONSTRAINT chk_schedule_color CHECK (color_key IS NULL OR color_key IN ('sky', 'purple', 'pink', 'yellow', 'lime', 'gray')),
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

CREATE TABLE IF NOT EXISTS date_decorations (
  id BIGSERIAL PRIMARY KEY,
  decoration_date DATE NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS date_decorations_date_idx ON date_decorations (decoration_date);

CREATE TABLE IF NOT EXISTS checklist_items (
  id BIGSERIAL PRIMARY KEY,
  content VARCHAR(300) NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS checklist_items_order_idx ON checklist_items (is_completed, sort_order, id);

CREATE TABLE IF NOT EXISTS dday_items (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(100) NOT NULL,
  target_date DATE NOT NULL,
  sort_order INTEGER NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS dday_items_order_idx ON dday_items (sort_order, id);
