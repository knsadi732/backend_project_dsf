-- 1:1 GST breakdown for a single finance_transactions row. Kept as a direct FK
-- companion table rather than the polymorphic reference_type/reference_id pattern
-- (used by finance_transactions itself and approval_requests) because tax detail
-- always belongs to exactly one ledger row — a direct FK keeps GSTR-1/3B queries a
-- simple join instead of a branch-by-reference_type union.
CREATE TABLE IF NOT EXISTS finance_transaction_tax_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  finance_transaction_id UUID NOT NULL REFERENCES finance_transactions (id),

  is_gst_applicable BOOLEAN NOT NULL DEFAULT FALSE,
  taxable_value NUMERIC(14, 2) NOT NULL DEFAULT 0,
  gst_rate NUMERIC(5, 2) NOT NULL DEFAULT 0,
  cgst_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  sgst_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  igst_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  hsn_code VARCHAR(20) NULL,
  place_of_supply_state_code VARCHAR(2) NULL,
  party_gstin VARCHAR(20) NULL,
  party_type VARCHAR(10) NOT NULL DEFAULT 'b2c', -- 'b2b' | 'b2c'

  created_by UUID NULL,
  updated_by UUID NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE NULL,
  deleted_by UUID NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_fin_tx_tax_details_tx_id ON finance_transaction_tax_details (finance_transaction_id) WHERE is_deleted = FALSE;
