-- Service-01/03: additional roles a user can act as, beyond users.role_id (the primary
-- role used for JWT issuance / display). RBAC checks union permissions across both.
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users (id),
  role_id UUID NOT NULL REFERENCES roles (id),

  created_by UUID NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_user_roles ON user_roles (user_id, role_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles (user_id);
