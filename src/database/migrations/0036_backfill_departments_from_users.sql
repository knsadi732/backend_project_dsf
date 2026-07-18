-- Backfills the departments master with every distinct department value already
-- used on users.department (free text), scoped per company. Safe to re-run.
INSERT INTO departments (company_id, name)
SELECT DISTINCT u.company_id, TRIM(u.department)
FROM users u
WHERE u.department IS NOT NULL
  AND TRIM(u.department) <> ''
  AND u.is_deleted = FALSE
ON CONFLICT (company_id, name) WHERE is_deleted = FALSE DO NOTHING;
