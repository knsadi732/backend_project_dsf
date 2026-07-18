-- Attendance is auto-marked on an employee's first login of each day (see auth.service.js).
-- One row per user per calendar day; the unique index makes repeat logins same-day a no-op.
CREATE TABLE IF NOT EXISTS attendances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies (id),
  user_id UUID NOT NULL REFERENCES users (id),

  attendance_date DATE NOT NULL,
  check_in_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  device_signature VARCHAR(255),
  user_agent TEXT,
  ip_address VARCHAR(64),
  latitude NUMERIC(10, 6),
  longitude NUMERIC(10, 6),
  location_label VARCHAR(255),

  status VARCHAR(30) NOT NULL DEFAULT 'present',

  created_by UUID NULL,
  updated_by UUID NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE NULL,
  deleted_by UUID NULL
);

CREATE INDEX IF NOT EXISTS idx_attendances_company_id ON attendances (company_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_attendances_user_id ON attendances (user_id) WHERE is_deleted = FALSE;
CREATE UNIQUE INDEX IF NOT EXISTS uq_attendances_company_user_date ON attendances (company_id, user_id, attendance_date) WHERE is_deleted = FALSE;
