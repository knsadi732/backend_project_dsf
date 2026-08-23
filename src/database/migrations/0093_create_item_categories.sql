-- Item & Material Master Domain (Business_Data_Model.md Chapter 8): parent-child
-- hierarchy for non-sellable items the company purchases/consumes (raw material,
-- packaging, consumables, spare parts, fixed assets, tools, services). Mirrors the
-- product_categories self-referencing pattern (Chapter 9 / migration 0014) but is a
-- separate table since Product and Item/Material are deliberately separate masters.
CREATE TABLE IF NOT EXISTS item_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies (id),
  parent_category_id UUID NULL REFERENCES item_categories (id),

  category_code VARCHAR(50) NOT NULL,
  category_name VARCHAR(255) NOT NULL,
  -- Determines downstream routing after receipt (Chapter 8 §8.7):
  -- 'raw_material' | 'packaging_material' | 'consumable' | 'spare_part' |
  -- 'fixed_asset' | 'tool' | 'service'. Tools are treated as company-owned Fixed
  -- Assets (individually tracked in the Fixed Asset Register), not as stock.
  stock_kind VARCHAR(30) NOT NULL DEFAULT 'raw_material',

  status VARCHAR(30) NOT NULL DEFAULT 'active',
  remarks TEXT NULL,
  created_by UUID NULL,
  updated_by UUID NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE NULL,
  deleted_by UUID NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_item_categories_company_code ON item_categories (company_id, category_code) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_item_categories_company_id ON item_categories (company_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_item_categories_parent ON item_categories (parent_category_id) WHERE is_deleted = FALSE;
