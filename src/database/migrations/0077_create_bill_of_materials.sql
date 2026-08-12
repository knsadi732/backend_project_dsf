-- Bill of Materials: how much of a raw-material variant goes into producing
-- ONE unit of a finished product. Consumed the moment a work order for that
-- product is created (workOrder.service.js consumeBomForWorkOrder) to
-- reserve available raw stock and flag any shortfall via an auto-raised
-- Purchase Request.
CREATE TABLE IF NOT EXISTS bill_of_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies (id),
  product_id UUID NOT NULL REFERENCES products (id),
  raw_material_variant_id UUID NOT NULL REFERENCES product_variants (id),
  quantity_per_unit NUMERIC(14, 4) NOT NULL,

  remarks TEXT NULL,
  created_by UUID NULL,
  updated_by UUID NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE NULL,
  deleted_by UUID NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_bom_company_product_material ON bill_of_materials (company_id, product_id, raw_material_variant_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_bom_product_id ON bill_of_materials (product_id) WHERE is_deleted = FALSE;

-- Work orders need a warehouse to reserve raw material stock against.
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS warehouse_id UUID NULL REFERENCES warehouses (id);
