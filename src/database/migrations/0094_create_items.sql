-- Item Master (Chapter 8 §8.5): everything the company buys or internally consumes
-- that is NOT a sellable/manufactured Product (Chapter 7's products table). Never
-- stores quantity itself — that lives in item_stock (0095) for stock-kind categories,
-- or the fixed_assets register (0096) for fixed_asset/tool categories.
CREATE SEQUENCE IF NOT EXISTS items_item_seq START 1;

CREATE TABLE IF NOT EXISTS items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies (id),
  item_category_id UUID NOT NULL REFERENCES item_categories (id),
  preferred_vendor_id UUID NULL REFERENCES vendors (id),

  item_code VARCHAR(50) NOT NULL,
  item_name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  uom VARCHAR(30) NOT NULL DEFAULT 'unit', -- unit | kg | sheet | ream | litre | each ...
  hsn_code VARCHAR(20) NULL,
  gst_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0,
  standard_cost NUMERIC(14, 2) NOT NULL DEFAULT 0,
  reorder_level NUMERIC(14, 2) NOT NULL DEFAULT 0,
  specification JSONB NOT NULL DEFAULT '{}', -- free-form technical attributes (thickness, GSM, voltage, model...)

  status VARCHAR(30) NOT NULL DEFAULT 'active', -- active | inactive | discontinued
  remarks TEXT NULL,
  created_by UUID NULL,
  updated_by UUID NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE NULL,
  deleted_by UUID NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_items_company_code ON items (company_id, item_code) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_items_company_id ON items (company_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_items_category_id ON items (item_category_id) WHERE is_deleted = FALSE;
