-- Per-design (piece-rate) manufacturing labour cost and per-unit packaging
-- material cost (box + poly/wrap) — both direct/variable costs, not part of
-- the shared overhead pool (see overheadAllocation.service.js). Manpower here
-- is paid per pair produced for a given design, not a fixed salary — see
-- workOrder.service.js's auto labour_cost calc on work order completion.
ALTER TABLE product_variants
  ADD COLUMN IF NOT EXISTS manufacturing_rate_per_unit NUMERIC(14, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS packaging_material_cost_per_unit NUMERIC(14, 2) NOT NULL DEFAULT 0;
