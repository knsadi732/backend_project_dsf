-- Marketplace/channel master (Meesho, Flipkart, Amazon, Myntra, ...).
-- default_cost_per_unit is the bootstrap-mode blended marketplace cost
-- assumption (courier + return/RTO-weighted + ads + GST, all-in, per pair
-- sold) used by the Pricing Calculator until enough real
-- marketplace_settlements accumulate to replace it with an actual average
-- (see marketplaceSettlement.service.js).
CREATE TABLE IF NOT EXISTS marketplace_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies (id),

  name VARCHAR(100) NOT NULL,
  default_commission_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
  default_cost_per_unit NUMERIC(14, 2) NOT NULL DEFAULT 0,
  assumed_customer_return_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
  assumed_rto_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
  margin_min NUMERIC(14, 2) NOT NULL DEFAULT 0,
  margin_max NUMERIC(14, 2) NOT NULL DEFAULT 0,

  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  remarks TEXT NULL,
  created_by UUID NULL,
  updated_by UUID NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE NULL,
  deleted_by UUID NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_marketplace_channels_company_name ON marketplace_channels (company_id, name) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_marketplace_channels_company_id ON marketplace_channels (company_id) WHERE is_deleted = FALSE;
