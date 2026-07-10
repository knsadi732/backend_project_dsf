-- Product catalog — read-heavy, backed by the Product Cache tier (plan.md Chapter 6).
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies (id),
  category_id UUID NULL REFERENCES product_categories (id),
  image_document_id UUID NULL REFERENCES documents (id),

  sku VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  uom VARCHAR(20) NOT NULL DEFAULT 'pair', -- unit of measure (footwear default)
  unit_price NUMERIC(14, 2) NOT NULL DEFAULT 0,
  cost_price NUMERIC(14, 2) NOT NULL DEFAULT 0,
  tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 0, -- GST %

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

CREATE UNIQUE INDEX IF NOT EXISTS uq_products_company_sku ON products (company_id, sku) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_products_company_id ON products (company_id) WHERE is_deleted = FALSE;
