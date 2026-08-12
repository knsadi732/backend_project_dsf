-- Tracks how much was actually reserved per line at approval time (may be
-- less than quantity_required if stock was short) — this is exactly what
-- "Mark Issued" later deducts from on-hand, not quantity_required, since
-- the shortfall portion was never reserved in the first place.
ALTER TABLE material_issue_request_items ADD COLUMN IF NOT EXISTS quantity_reserved NUMERIC(14, 4) NOT NULL DEFAULT 0;
