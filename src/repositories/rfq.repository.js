const { query } = require('../config/db');

/** Resolves branch/PR ids to display names alongside the RFQ — raw query rather than
 * buildListQuery since the joins make bare column names ambiguous. */
const SELECT_WITH_NAMES = `
  SELECT r.*, b.name AS branch_name, pr.pr_number, pr.warehouse_id
  FROM rfqs r
  LEFT JOIN branches b ON b.id = r.branch_id
  LEFT JOIN purchase_requests pr ON pr.id = r.purchase_request_id`;

/** Reserves and returns the next RFQ number, e.g. 'DSF-RFQ-0001'. Each call consumes the sequence. */
async function generateRfqNumber(runner = query) {
  const { rows } = await runner(
    `SELECT 'DSF-RFQ-' || LPAD(nextval('rfqs_rfq_seq')::text, 4, '0') AS rfq_number`,
  );
  return rows[0].rfq_number;
}

/** Previews the next RFQ number without consuming the sequence — safe to call repeatedly. */
async function peekRfqNumber(runner = query) {
  const { rows } = await runner(
    `SELECT 'DSF-RFQ-' || LPAD((CASE WHEN is_called THEN last_value + 1 ELSE last_value END)::text, 4, '0') AS rfq_number
     FROM rfqs_rfq_seq`,
  );
  return rows[0].rfq_number;
}

async function create(
  client,
  companyId,
  { branchId, purchaseRequestId, deliveryLocation, deliveryDate, paymentTerms, technicalSpecifications, remarks },
  createdBy,
) {
  const rfqNumber = await generateRfqNumber((text, params) => client.query(text, params));
  const { rows } = await client.query(
    `INSERT INTO rfqs (
       company_id, branch_id, purchase_request_id, rfq_number,
       delivery_location, delivery_date, payment_terms, technical_specifications, remarks, created_by, updated_by
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
     RETURNING *`,
    [
      companyId,
      branchId || null,
      purchaseRequestId,
      rfqNumber,
      deliveryLocation || null,
      deliveryDate || null,
      paymentTerms || null,
      technicalSpecifications || null,
      remarks || null,
      createdBy,
    ],
  );
  return rows[0];
}

async function addVendors(client, rfqId, vendorIds) {
  for (const vendorId of vendorIds) {
    await client.query(
      `INSERT INTO rfq_vendors (rfq_id, vendor_id, sent_at) VALUES ($1, $2, now())`,
      [rfqId, vendorId],
    );
  }
}

async function findVendors(rfqId, runner = query) {
  const { rows } = await runner(
    `SELECT rv.vendor_id, rv.sent_at, v.name AS vendor_name, v.email AS vendor_email, v.quality_rating
     FROM rfq_vendors rv
     LEFT JOIN vendors v ON v.id = rv.vendor_id
     WHERE rv.rfq_id = $1`,
    [rfqId],
  );
  return rows;
}

/** Vendor selection / quotation capture may only involve vendors the RFQ was actually sent to. */
async function isVendorInvited(client, rfqId, vendorId) {
  const { rows } = await client.query(
    `SELECT 1 FROM rfq_vendors WHERE rfq_id = $1 AND vendor_id = $2`,
    [rfqId, vendorId],
  );
  return rows.length > 0;
}

async function findById(companyId, id) {
  const { rows } = await query(
    `${SELECT_WITH_NAMES} WHERE r.id = $1 AND r.company_id = $2 AND r.is_deleted = FALSE`,
    [id, companyId],
  );
  return rows[0] || null;
}

async function findByIdForUpdate(client, companyId, id) {
  const { rows } = await client.query(
    `SELECT * FROM rfqs WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE FOR UPDATE`,
    [id, companyId],
  );
  return rows[0] || null;
}

async function list(companyId, pagination, { status, purchaseRequestId } = {}) {
  const conditions = ['r.company_id = $1', 'r.is_deleted = FALSE'];
  const params = [companyId];

  if (status) {
    params.push(status);
    conditions.push(`r.status = $${params.length}`);
  }
  if (purchaseRequestId) {
    params.push(purchaseRequestId);
    conditions.push(`r.purchase_request_id = $${params.length}`);
  }
  if (pagination.search) {
    params.push(`%${pagination.search}%`);
    conditions.push(`r.rfq_number ILIKE $${params.length}`);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;
  const safeSortBy = /^[a-zA-Z_]+$/.test(pagination.sortBy) ? pagination.sortBy : 'created_at';
  const safeSortOrder = pagination.sortOrder === 'asc' ? 'ASC' : 'DESC';

  const dataSql = `${SELECT_WITH_NAMES} ${whereClause} ORDER BY r.${safeSortBy} ${safeSortOrder} LIMIT $${
    params.length + 1
  } OFFSET $${params.length + 2}`;
  const dataParams = [...params, pagination.limit, pagination.offset];
  const countSql = `SELECT COUNT(*) FROM rfqs r ${whereClause}`;

  const [data, count] = await Promise.all([query(dataSql, dataParams), query(countSql, params)]);
  return { rows: data.rows, totalRecords: parseInt(count.rows[0].count, 10) };
}

async function updateStatus(client, id, expectedVersion, status, updatedBy) {
  const { rows } = await client.query(
    `UPDATE rfqs
     SET status = $3, version = version + 1, updated_by = $4, updated_at = now()
     WHERE id = $1 AND version = $2
     RETURNING *`,
    [id, expectedVersion, status, updatedBy],
  );
  return rows[0] || null;
}

async function setSelectedQuotation(client, id, expectedVersion, vendorQuotationId, updatedBy) {
  const { rows } = await client.query(
    `UPDATE rfqs
     SET selected_vendor_quotation_id = $3, status = 'vendor_selected', version = version + 1, updated_by = $4, updated_at = now()
     WHERE id = $1 AND version = $2
     RETURNING *`,
    [id, expectedVersion, vendorQuotationId, updatedBy],
  );
  return rows[0] || null;
}

module.exports = {
  create,
  addVendors,
  findVendors,
  isVendorInvited,
  findById,
  findByIdForUpdate,
  list,
  updateStatus,
  setSelectedQuotation,
  generateRfqNumber,
  peekRfqNumber,
};
