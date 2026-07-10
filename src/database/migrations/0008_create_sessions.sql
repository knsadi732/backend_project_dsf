-- Service-03/05: structural JWT trace records backing the Redis Session Cache tier.
-- Service-05's "Expired Session Cleanup" cron discards rows here once past expires_at.
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies (id),
  user_id UUID NOT NULL REFERENCES users (id),

  refresh_token_hash VARCHAR(255) NOT NULL,
  device_signature VARCHAR(255),
  ip_address VARCHAR(64),
  user_agent TEXT,

  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  revoked_at TIMESTAMP WITH TIME ZONE NULL,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions (expires_at);
