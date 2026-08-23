-- Daily production target (pairs/units) an owner sets once per company —
-- compared against today's actual completed Work Order quantity on the
-- dashboard's top KPI row.
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS daily_production_target INTEGER NULL;
