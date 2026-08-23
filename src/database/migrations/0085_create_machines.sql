-- Equipment master + downtime log — Superadmin alert widget: "is a major
-- machine offline right now."
CREATE TABLE IF NOT EXISTS machines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies (id),
  warehouse_id UUID NULL REFERENCES warehouses (id),

  name VARCHAR(150) NOT NULL,
  machine_type VARCHAR(50) NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'running', -- running | down | maintenance

  remarks TEXT NULL,
  created_by UUID NULL,
  updated_by UUID NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE NULL,
  deleted_by UUID NULL
);

CREATE INDEX IF NOT EXISTS idx_machines_company_id ON machines (company_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_machines_status ON machines (status) WHERE is_deleted = FALSE;

-- One open (ended_at IS NULL) event per machine at a time — closing an event
-- (PATCH .../resolve) stamps ended_at and flips the machine back to running.
CREATE TABLE IF NOT EXISTS machine_downtime_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies (id),
  machine_id UUID NOT NULL REFERENCES machines (id),

  reason TEXT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE NULL,

  created_by UUID NULL,
  updated_by UUID NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE NULL,
  deleted_by UUID NULL
);

CREATE INDEX IF NOT EXISTS idx_mde_machine_id ON machine_downtime_events (machine_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_mde_open ON machine_downtime_events (machine_id) WHERE ended_at IS NULL AND is_deleted = FALSE;
