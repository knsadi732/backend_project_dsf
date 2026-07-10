-- Service-07: precomputed reporting context — raw tables are aggregated into
-- these snapshots on a schedule; dashboard widgets read from here, never
-- from live aggregation queries on hot paths (plan.md Chapter 3, Service-07).
CREATE TABLE IF NOT EXISTS analytics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies (id),

  widget_key VARCHAR(100) NOT NULL, -- e.g. 'sales_summary', 'inventory_status'
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,

  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_analytics_snapshots_widget
  ON analytics_snapshots (company_id, widget_key, period_start, period_end);
