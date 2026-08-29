-- Forecasting bootstrap: DS Footwear has no sales history yet, so a market-
-- assumption-based forecast (forecast.service.js) needs a baseline to scale
-- from until 15+ days of the company's own sales data accumulates. This is
-- a business decision the owner sets deliberately — never invented by the
-- system — hence a plain settings field, not a computed/derived value.
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS monthly_sales_target NUMERIC(14, 2) NULL;
