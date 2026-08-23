-- In-app notification feed (bell icon) — distinct from `notifications`
-- (an outbound email/SMS/push delivery queue keyed by a registered
-- template). This table backs the frontend's NotificationList: a plain
-- title/message the app itself generates on business events (order
-- created, employee onboarded, approval needed, etc.), with its own
-- read/unread/archived lifecycle instead of a delivery status.
-- `user_id NULL` = broadcast to the whole company (every user with
-- `notification.view` sees it in their list).
CREATE TABLE IF NOT EXISTS app_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies (id),
  user_id UUID NULL REFERENCES users (id),

  title VARCHAR(255) NOT NULL,
  message TEXT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'information', -- information | success | warning | error | approval | reminder
  category VARCHAR(100) NULL, -- e.g. 'sales_order_review' — used by the frontend to decide inline action buttons
  entity_id UUID NULL, -- the record the notification is about (shape depends on category)

  status VARCHAR(20) NOT NULL DEFAULT 'unread', -- unread | read | archived

  created_by UUID NULL,
  updated_by UUID NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE NULL,
  deleted_by UUID NULL
);

CREATE INDEX IF NOT EXISTS idx_app_notifications_company_id ON app_notifications (company_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_app_notifications_user_id ON app_notifications (user_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_app_notifications_status ON app_notifications (status) WHERE is_deleted = FALSE;
