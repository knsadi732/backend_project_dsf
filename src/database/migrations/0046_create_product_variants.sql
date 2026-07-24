-- plan.md Chapter 9: the sellable/purchasable/inventory-managed unit. Product
-- Master (products) never stores stock or SKU-level pricing; every downstream
-- domain (Inventory, Purchase, Sales) references product_variants, not products.
CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies (id),
  product_id UUID NOT NULL REFERENCES products (id),

  sku VARCHAR(100) NOT NULL,
  barcode VARCHAR(100) NULL,
  size VARCHAR(30) NULL,
  color VARCHAR(50) NULL,
  weight NUMERIC(10, 3) NULL,

  mrp NUMERIC(14, 2) NOT NULL DEFAULT 0,
  selling_price NUMERIC(14, 2) NOT NULL DEFAULT 0,
  wholesale_price NUMERIC(14, 2) NULL,
  dealer_price NUMERIC(14, 2) NULL,
  cost_price NUMERIC(14, 2) NOT NULL DEFAULT 0,

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

CREATE UNIQUE INDEX IF NOT EXISTS uq_product_variants_company_sku ON product_variants (company_id, sku) WHERE is_deleted = FALSE;
CREATE UNIQUE INDEX IF NOT EXISTS uq_product_variants_company_barcode ON product_variants (company_id, barcode) WHERE is_deleted = FALSE AND barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants (product_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_product_variants_company_id ON product_variants (company_id) WHERE is_deleted = FALSE;
