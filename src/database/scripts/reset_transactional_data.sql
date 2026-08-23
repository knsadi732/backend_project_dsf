-- Wipes all transactional/master data used to bootstrap a clean slate for the
-- simplified expense/sale quick-entry ledger, while leaving the employee/org/RBAC
-- module (companies, branches, warehouses, departments, designations, employees/users,
-- sessions, roles, permissions, user_roles, attendances, audit_logs, company_settings,
-- notification_templates/notifications) untouched.
--
-- CASCADE truncates any table with an FK into the ones listed below too (e.g.
-- work_orders.sales_order_id -> orders), which is intended here since every such
-- table is itself transactional data covered by this reset.
--
-- Local dev use only — src/database/scripts/reset_transactional_data.js guards this
-- against running outside PGHOST=localhost.

BEGIN;

TRUNCATE TABLE
  analytics_snapshots,
  approval_requests,
  material_issue_request_items,
  material_issue_requests,
  bill_of_materials,
  work_orders,
  machines,
  recurring_charges,
  loan_repayments,
  loans,
  statutory_audits,
  fiscal_periods,
  finance_transaction_tax_details,
  finance_transactions,
  expenses,
  payment_slips,
  bills,
  order_items,
  orders,
  customers,
  vendor_quotation_items,
  vendor_quotations,
  rfq_vendors,
  rfqs,
  grn_items,
  grns,
  purchase_request_items,
  purchase_requests,
  purchase_order_items,
  purchase_orders,
  vendor_bills,
  vendors,
  warehouse_stock,
  product_variants,
  products,
  product_categories,
  brands,
  funding_sources
CASCADE;

-- Invoice/GST-certificate/product/vendor documents belonged to now-cleared entities;
-- employee documents (entity_type = 'employee') are kept.
DELETE FROM documents WHERE entity_type <> 'employee';

-- Resync numbered sequences used by the truncated tables so numbering restarts at 1.
SELECT setval('loans_ln_seq', 1, FALSE);
SELECT setval('purchase_orders_po_seq', 1, FALSE);
SELECT setval('purchase_requests_pr_seq', 1, FALSE);
SELECT setval('product_variants_sku_seq', 1, FALSE);
SELECT setval('grns_grn_seq', 1, FALSE);
SELECT setval('vendor_bills_seq', 1, FALSE);
SELECT setval('rfqs_rfq_seq', 1, FALSE);

COMMIT;
