const { pool, withTransaction } = require('../config/db');
const logger = require('../utils/logger');
const { SYSTEM_ROLES } = require('../constants/enums');

/**
 * Seeds the system-level (company_id NULL) roles and the permission catalogue
 * referenced by plan.md Service-01, plus the role -> permission grants for the
 * Accountant/CA scopes described there. Idempotent — safe to re-run.
 */
const PERMISSIONS = [
  ['company.manage', 'company', 'Manage company hierarchy (company/branch/warehouse).'],
  ['settings.manage', 'settings', 'Manage tenant configuration (GST, invoice prefixes, fiscal year, theme, locale).'],
  ['user.manage', 'user', 'Manage user profiles and role assignments.'],
  ['role.manage', 'user', 'Manage roles and permission grants.'],
  ['audit.log.view', 'audit', 'View operator action / login / session audit trails.'],
  ['document.manage', 'document', 'Upload, list, and delete documents.'],
  ['product.manage', 'product', 'Manage product catalog, categories, and stock.'],
  ['warehouse_structure.manage', 'inventory', 'Manage warehouse zones, racks, shelves, and bins (physical storage hierarchy).'],
  ['inventory_movement.view', 'inventory', 'View the stock movement audit trail (receive/reserve/issue/adjust events).'],
  ['product_variant.manage', 'product', 'Manage product variants (SKU, barcode, size, color, pricing).'],
  ['brand.manage', 'product', 'Manage brand master list.'],
  ['department.manage', 'department', 'Manage department master list.'],
  ['designation.manage', 'designation', 'Manage designation master list.'],
  ['attendance.view', 'attendance', 'View employee attendance records.'],
  ['customer.manage', 'customer', 'Manage customer records.'],
  ['vendor.manage', 'vendor', 'Manage vendor records.'],
  ['order.manage', 'order', 'Create orders and drive order lifecycle transitions.'],
  ['work_order.manage', 'production', 'Create and manage manufacturing work orders.'],
  ['bom.manage', 'production', 'Define bill-of-materials (raw material per product) for manufacturing.'],
  ['material_issue_request.view', 'production', 'View raw-material issue requests raised against work orders.'],
  ['material_issue_request.approve', 'production', 'Approve/reject raw-material issue requests (Production Manager).'],
  ['material_issue_request.issue', 'production', 'Mark an approved material issue request as physically issued (warehouse staff) — deducts on-hand stock.'],
  ['machine.view', 'production', 'View machines and their downtime history.'],
  ['machine.manage', 'production', 'Create/edit machines, report and resolve downtime.'],
  ['approval_request.view', 'approval', 'View the one-click approval queue (vendor payments, credit-limit overrides).'],
  ['approval_request.create', 'approval', 'Raise a vendor-payment or credit-limit-override approval request.'],
  ['approval_request.approve', 'approval', 'Approve/reject queued approval requests (Owner/Superadmin).'],
  ['purchase_order.manage', 'purchase_order', 'Create purchase orders and drive PO lifecycle transitions.'],
  ['purchase_request.view', 'purchase_request', 'View purchase requests.'],
  ['purchase_request.create', 'purchase_request', 'Raise purchase requests.'],
  ['purchase_request.approve', 'purchase_request', 'Decide (approve/reject) purchase requests — manager-level.'],
  ['rfq.view', 'rfq', 'View RFQs, vendor quotations, and quotation comparisons.'],
  ['rfq.manage', 'rfq', 'Raise RFQs, record vendor quotations, and select the winning vendor.'],
  ['grn.view', 'grn', 'View GRNs (Goods Receipt Notes) auto-generated on purchase order completion.'],
  ['grn.manage', 'grn', 'Upload vendor invoices against a GRN.'],
  ['vendor_bill.view', 'vendor_bill', 'View vendor bills/payables auto-generated on GRN creation.'],
  ['vendor_bill.manage', 'vendor_bill', 'Record vendor payments (UTR, amount) against a vendor bill.'],
  ['notification.manage', 'notification', 'Send and view notifications.'],
  ['analytics.view', 'analytics', 'View dashboard analytics widgets.'],
  ['finance.transaction.create', 'finance', 'Log daily transaction entries.'],
  ['finance.payment_slip.issue', 'finance', 'Issue instant client payment slips.'],
  ['finance.expense.record', 'finance', 'Record warehouse expenses.'],
  ['finance.bill.print', 'finance', 'Print operational client bills.'],
  ['finance.ledger.view', 'finance', 'View GST balance calculations and ledgers.'],
  ['finance.gst.view', 'finance', 'View GST compliance profiles.'],
  ['finance.audit.view', 'finance', 'View statutory audit records.'],
  ['finance.period.close', 'finance', 'Conclude financial periods.'],
  ['finance.ledger.cross_verify', 'finance', 'Cross-verify multi-tenant ledgers.'],
  ['loan.view', 'finance', 'View company loans/debt records (read-only).'],
  ['loan.manage', 'finance', 'Create loans and record repayments/write-offs.'],
  ['payable.view', 'finance', 'View payables/dues owed to any party (read-only).'],
  ['payable.manage', 'finance', 'Create payables and record payments/write-offs.'],
  ['item.manage', 'item', 'Manage Item & Material Master (categories and items — raw material, packaging, consumables, spare parts, tools, fixed assets, services).'],
  ['item.stock.view', 'item', 'View Item & Material stock levels and movement history.'],
  ['item.stock.manage', 'item', 'Receive and consume Item & Material stock.'],
  ['fixed_asset.view', 'fixed_asset', 'View the Fixed Asset Register and maintenance logs.'],
  ['fixed_asset.manage', 'fixed_asset', 'Register, reassign, maintain, and dispose Fixed Assets.'],
];

const ROLES = [
  [SYSTEM_ROLES.ADMIN, 'Administrator', 'Full system access.'],
  [SYSTEM_ROLES.ACCOUNTANT, 'Accountant', 'Operational financial interactions.'],
  [SYSTEM_ROLES.CA, 'Certified Auditor', 'Compliance and audit oversight.'],
];

const NOTIFICATION_TEMPLATES = [
  ['order.confirmed', 'email', 'Your order {{orderNumber}} is confirmed', 'Hi {{customerName}}, your order {{orderNumber}} totalling {{totalAmount}} has been confirmed.'],
  ['user.welcome', 'email', 'Welcome to DS Footwear ERP', 'Hi {{fullName}}, your account has been created. Your role is {{roleName}}.'],
  ['vendor_bill.paid', 'email', 'Payment received for {{invoiceNumber}}', 'Hi {{vendorName}}, we have paid {{invoiceNumber}} in full. Amount: {{amount}}, UTR: {{utrNumber}}, Paid on: {{paidAt}}.'],
];

const ROLE_PERMISSIONS = {
  [SYSTEM_ROLES.ADMIN]: PERMISSIONS.map((p) => p[0]),
  [SYSTEM_ROLES.ACCOUNTANT]: [
    'finance.transaction.create',
    'finance.payment_slip.issue',
    'finance.expense.record',
    'finance.bill.print',
    'loan.view',
    'loan.manage',
    'payable.view',
    'payable.manage',
    'approval_request.view',
    'approval_request.create',
    'item.manage',
    'item.stock.view',
    'item.stock.manage',
    'fixed_asset.view',
    'fixed_asset.manage',
  ],
  [SYSTEM_ROLES.CA]: [
    'finance.ledger.view',
    'finance.gst.view',
    'finance.audit.view',
    'finance.period.close',
    'finance.ledger.cross_verify',
    'loan.view',
    'payable.view',
    'audit.log.view',
    'item.stock.view',
    'fixed_asset.view',
  ],
};

async function seed() {
  await withTransaction(async (client) => {
    for (const [key, module, description] of PERMISSIONS) {
      await client.query(
        `INSERT INTO permissions (key, module, description) VALUES ($1, $2, $3)
         ON CONFLICT (key) DO NOTHING`,
        [key, module, description],
      );
    }

    for (const [key, name, description] of ROLES) {
      await client.query(
        `INSERT INTO roles (company_id, key, name, description) VALUES (NULL, $1, $2, $3)
         ON CONFLICT (COALESCE(company_id, '00000000-0000-0000-0000-000000000000'), key)
         WHERE is_deleted = FALSE DO NOTHING`,
        [key, name, description],
      );
    }

    for (const [key, channel, subject, bodyTemplate] of NOTIFICATION_TEMPLATES) {
      await client.query(
        `INSERT INTO notification_templates (key, channel, subject, body_template) VALUES ($1, $2, $3, $4)
         ON CONFLICT (key) DO NOTHING`,
        [key, channel, subject, bodyTemplate],
      );
    }

    for (const [roleKey, permissionKeys] of Object.entries(ROLE_PERMISSIONS)) {
      await client.query(
        `INSERT INTO role_permissions (role_id, permission_id)
         SELECT r.id, p.id
         FROM roles r, permissions p
         WHERE r.key = $1 AND r.company_id IS NULL AND p.key = ANY($2::text[])
         ON CONFLICT (role_id, permission_id) DO NOTHING`,
        [roleKey, permissionKeys],
      );
    }
  });

  logger.info('Seed complete: system roles, permissions, role grants, and notification templates.');
}

if (require.main === module) {
  seed()
    .catch((err) => {
      logger.error('Seed failed', err);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}

module.exports = { seed };
