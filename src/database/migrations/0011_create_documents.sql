-- Service-04: Document Management — uploads for product images, GST
-- certificates, vendor/employee docs, invoice PDFs. Private files are served
-- only through pre-signed URLs (plan.md Chapter 3, Service-04).
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies (id),
  branch_id UUID NULL REFERENCES branches (id),
  warehouse_id UUID NULL REFERENCES warehouses (id),

  entity_type VARCHAR(50) NOT NULL, -- 'product' | 'vendor' | 'employee' | 'invoice' | 'gst_certificate'
  entity_id UUID NULL,

  file_key VARCHAR(500) NOT NULL, -- storage-relative path/object key
  file_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(150) NOT NULL,
  size_bytes BIGINT NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  uploaded_by UUID NULL,

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

CREATE INDEX IF NOT EXISTS idx_documents_company_id ON documents (company_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_documents_entity ON documents (entity_type, entity_id) WHERE is_deleted = FALSE;
