-- Service-03: Core Audit Module — append-only trace of operator actions, logins,
-- API payloads, and session activity. Never mixed into operational tables.
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NULL REFERENCES companies (id),
  user_id UUID NULL REFERENCES users (id),

  action VARCHAR(150) NOT NULL, -- e.g. 'auth.login', 'order.state_transition'
  http_method VARCHAR(10),
  route VARCHAR(255),
  request_payload JSONB,
  status_code INTEGER,
  ip_address VARCHAR(64),
  user_agent TEXT,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_company_id ON audit_logs (company_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at);
