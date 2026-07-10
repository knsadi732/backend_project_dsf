-- Service-06: Notification & Queuing — template core engine source rows.
CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(150) NOT NULL UNIQUE, -- e.g. 'order.confirmed', 'invoice.generated'
  channel VARCHAR(20) NOT NULL, -- 'email' | 'sms' | 'push'
  subject VARCHAR(255) NULL,
  body_template TEXT NOT NULL, -- {{variable}} interpolation placeholders

  status VARCHAR(30) NOT NULL DEFAULT 'active',
  remarks TEXT NULL,

  created_by UUID NULL,
  updated_by UUID NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE NULL,
  deleted_by UUID NULL
);
