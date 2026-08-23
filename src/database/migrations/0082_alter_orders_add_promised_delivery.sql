-- OTIF (On Time In Full): the customer/sales-committed delivery date, set at
-- order creation — compared against dispatched_at/delivered timing to
-- compute "delivered on time" %.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS promised_delivery_date DATE NULL;
