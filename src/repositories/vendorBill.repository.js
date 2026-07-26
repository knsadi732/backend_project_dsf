const { query } = require('../config/db');

/** Resolves vendor/PO/PR/GRN details alongside the bill — raw query rather than
 * buildListQuery since the joins make bare column names ambiguous. */
const SELECT_WITH_NAMES = `
  SELECT vb.*,
         v.name AS vendor_name, v.phone AS vendor_phone, v.email AS vendor_email,
         v.gstin AS vendor_gstin, v.bank_account_number AS vendor_bank_account_number,
         v.bank_ifsc AS vendor_bank_ifsc, v.bank_name AS vendor_bank_name,
         po.po_number, pr.pr_number, g.grn_number, g.vendor_invoice_document_id
  FROM vendor_bills vb
  LEFT JOIN vendors v ON v.id = vb.vendor_id
  LEFT JOIN purchase_orders po ON po.id = vb.purchase_order_id
  LEFT JOIN purchase_requests pr ON pr.id = po.purchase_request_id
  LEFT JOIN grns g ON g.id = vb.grn_id`;

/** Reserves and returns the next vendor bill number, e.g. 'DSF-VBILL-0001'. */
async function generateInvoiceNumber(runner = query) {
  const { rows } = await runner(
    `SELECT 'DSF-VBILL-' || LPAD(nextval('vendor_bills_seq')::text, 4, '0') AS invoice_number`,
  );
  return rows[0].invoice_number;
}

async function create(
  client,
  companyId,
  { branchId, warehouseId, vendorId, grnId, purchaseOrderId, totalAmount, paymentDueDate },
  createdBy,
) {
  const invoiceNumber = await generateInvoiceNumber((text, params) => client.query(text, params));
  const { rows } = await client.query(
    `INSERT INTO vendor_bills (
       company_id, branch_id, warehouse_id, vendor_id, grn_id, purchase_order_id,
       invoice_number, total_amount, payment_due_date, created_by, updated_by
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
     RETURNING *`,
    [companyId, branchId, warehouseId, vendorId, grnId, purchaseOrderId, invoiceNumber, totalAmount, paymentDueDate || null, createdBy],
  );
  return rows[0];
}

async function findById(companyId, id) {
  const { rows } = await query(
    `${SELECT_WITH_NAMES} WHERE vb.id = $1 AND vb.company_id = $2 AND vb.is_deleted = FALSE`,
    [id, companyId],
  );
  return rows[0] || null;
}

async function findByIdForUpdate(client, companyId, id) {
  const { rows } = await client.query(
    `SELECT * FROM vendor_bills WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE FOR UPDATE`,
    [id, companyId],
  );
  return rows[0] || null;
}

async function list(companyId, pagination, { status, vendorId } = {}) {
  const conditions = ['vb.company_id = $1', 'vb.is_deleted = FALSE'];
  const params = [companyId];

  if (status) {
    params.push(status);
    conditions.push(`vb.status = $${params.length}`);
  }
  if (vendorId) {
    params.push(vendorId);
    conditions.push(`vb.vendor_id = $${params.length}`);
  }
  if (pagination.search) {
    params.push(`%${pagination.search}%`);
    conditions.push(`vb.invoice_number ILIKE $${params.length}`);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;
  const safeSortBy = /^[a-zA-Z_]+$/.test(pagination.sortBy) ? pagination.sortBy : 'created_at';
  const safeSortOrder = pagination.sortOrder === 'asc' ? 'ASC' : 'DESC';

  const dataSql = `${SELECT_WITH_NAMES} ${whereClause} ORDER BY vb.${safeSortBy} ${safeSortOrder} LIMIT $${
    params.length + 1
  } OFFSET $${params.length + 2}`;
  const dataParams = [...params, pagination.limit, pagination.offset];
  const countSql = `SELECT COUNT(*) FROM vendor_bills vb ${whereClause}`;

  const [data, count] = await Promise.all([query(dataSql, dataParams), query(countSql, params)]);
  return { rows: data.rows, totalRecords: parseInt(count.rows[0].count, 10) };
}

async function recordPayment(client, companyId, id, expectedVersion, { amountPaid, utrNumber, status, paidAt }, updatedBy) {
  const { rows } = await client.query(
    `UPDATE vendor_bills
     SET amount_paid = $3, utr_number = $4, status = $5, paid_at = $6, version = version + 1, updated_by = $7, updated_at = now()
     WHERE id = $1 AND version = $2
     RETURNING *`,
    [id, expectedVersion, amountPaid, utrNumber, status, paidAt, updatedBy],
  );
  return rows[0] || null;
}

module.exports = { generateInvoiceNumber, create, findById, findByIdForUpdate, list, recordPayment };
