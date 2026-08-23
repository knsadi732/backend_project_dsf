-- actual_quantity: units actually produced, filled when a work order
-- reaches "completed" (may differ from the planned `quantity`) — needed to
-- compute Material Waste Variance (actual material issued vs
-- BOM-implied need for what was ACTUALLY made, not what was planned) and
-- Daily Production Output.
-- completed_at: when the work order actually reached "completed" — actual
-- production-output-by-day needs a real timestamp, not updated_at (which
-- moves on any field edit, not just the stage transition).
-- floor_stage: fine-grained shop-floor position while `stage = 'in_progress'`
-- (the coarse pending/in_progress/completed/cancelled pipeline says nothing
-- about where on the floor a batch physically is). Sequential:
-- cutting -> stitching -> lasting -> finishing, advanced independently of
-- the main `stage` transition endpoint.
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS actual_quantity NUMERIC(14, 3) NULL;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE NULL;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS floor_stage VARCHAR(30) NULL;

CREATE INDEX IF NOT EXISTS idx_work_orders_floor_stage ON work_orders (floor_stage) WHERE is_deleted = FALSE;
