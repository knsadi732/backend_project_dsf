-- Old lifecycle was draft/approved/ordered/received/completed; map the renamed
-- states onto the new plan.md Chapter 11.10 lifecycle (see enums.js PURCHASE_ORDER_STATUS).
UPDATE purchase_orders SET status = 'sent' WHERE status = 'ordered';
UPDATE purchase_orders SET status = 'partially_received' WHERE status = 'received';
