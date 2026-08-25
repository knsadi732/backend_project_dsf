-- One row per marketplace Payment Advice line item — the real, itemized
-- actual cost data (courier/return/RTO/ads/TCS/TDS) that Stage-2 of the
-- pricing plan uses to replace marketplace_channels.default_cost_per_unit
-- with a real per-channel average once enough of these accumulate (see
-- marketplaceSettlement.service.js#getMonthlyChannelCost). TCS/TDS are kept
-- separate from the cost fields — they are advance tax, credited back
-- against GST/income-tax liability, not a real cost.
CREATE SEQUENCE IF NOT EXISTS marketplace_settlements_seq START 1;

CREATE TABLE IF NOT EXISTS marketplace_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies (id),
  channel_id UUID NOT NULL REFERENCES marketplace_channels (id),
  order_id UUID NULL REFERENCES orders (id),

  settlement_number VARCHAR(50) NOT NULL,
  settlement_date DATE NOT NULL,
  return_type VARCHAR(20) NOT NULL DEFAULT 'none', -- none | customer (CR) | courier (RTO)

  gross_sale_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  commission_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  shipping_charge NUMERIC(14, 2) NOT NULL DEFAULT 0,
  return_charge NUMERIC(14, 2) NOT NULL DEFAULT 0,
  ads_charge NUMERIC(14, 2) NOT NULL DEFAULT 0,
  tcs_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  tds_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  net_amount_received NUMERIC(14, 2) NOT NULL DEFAULT 0,

  remarks TEXT NULL,
  created_by UUID NULL,
  updated_by UUID NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE NULL,
  deleted_by UUID NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_marketplace_settlements_company_number ON marketplace_settlements (company_id, settlement_number) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_marketplace_settlements_company_id ON marketplace_settlements (company_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_marketplace_settlements_channel_id ON marketplace_settlements (channel_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_marketplace_settlements_date ON marketplace_settlements (settlement_date) WHERE is_deleted = FALSE;
