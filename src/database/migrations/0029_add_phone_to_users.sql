-- Service-03: allow phone-based login alongside email.
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_phone ON users (phone) WHERE is_deleted = FALSE AND phone IS NOT NULL;
