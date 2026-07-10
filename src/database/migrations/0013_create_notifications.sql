-- Service-06: outbound notification instances — always queued (BullMQ),
-- never sent synchronously inline (plan.md Chapter 3, Service-06).
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies (id),
  user_id UUID NULL REFERENCES users (id),

  channel VARCHAR(20) NOT NULL,
  template_key VARCHAR(150) NOT NULL,
  recipient VARCHAR(255) NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,

  status VARCHAR(30) NOT NULL DEFAULT 'pending', -- pending | sent | failed
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NULL,

  remarks TEXT NULL,
  created_by UUID NULL,
  updated_by UUID NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE NULL,
  deleted_by UUID NULL
);

CREATE INDEX IF NOT EXISTS idx_notifications_company_id ON notifications (company_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications (status);
