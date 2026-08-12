require('dotenv').config();
const { pool } = require('./src/config/db');
const purchaseRequestService = require('./src/services/purchaseRequest.service');
const rfqService = require('./src/services/rfq.service');
const vendorQuotationService = require('./src/services/vendorQuotation.service');
const purchaseOrderService = require('./src/services/purchaseOrder.service');

function assert(cond, msg) {
  if (!cond) throw new Error('ASSERTION FAILED: ' + msg);
  console.log('OK:', msg);
}

async function main() {
  const { rows: companyRows } = await pool.query('SELECT id FROM companies LIMIT 1');
  const companyId = companyRows[0].id;
  const { rows: userRows } = await pool.query('SELECT id FROM users WHERE company_id = $1 LIMIT 1', [companyId]);
  const actorId = userRows[0].id;
  const { rows: warehouseRows } = await pool.query('SELECT id FROM warehouses WHERE company_id = $1 LIMIT 1', [companyId]);
  const warehouseId = warehouseRows[0].id;
  const { rows: vendorRows } = await pool.query('SELECT id, name FROM vendors WHERE company_id = $1 LIMIT 2', [companyId]);
  assert(vendorRows.length >= 2, 'at least 2 vendors exist to compare quotations');
  const [vendorA, vendorB] = vendorRows;
  const { rows: variantRows } = await pool.query(
    `SELECT pv.id FROM product_variants pv JOIN products p ON p.id = pv.product_id WHERE p.company_id = $1 LIMIT 1`,
    [companyId],
  );
  assert(variantRows.length >= 1, 'at least 1 product variant exists');
  const productVariantId = variantRows[0].id;

  // 1. Create + approve a Purchase Request
  const pr = await purchaseRequestService.createPurchaseRequest(
    companyId,
    { warehouseId, priority: 'medium', items: [{ productVariantId, quantity: 10 }], remarks: 'RFQ flow verification' },
    actorId,
  );
  assert(pr.status === 'draft', 'new PR starts draft');
  await purchaseRequestService.decidePurchaseRequest(companyId, pr.id, 'submitted', actorId);
  await purchaseRequestService.decidePurchaseRequest(companyId, pr.id, 'pending_approval', actorId);
  const approvedPr = await purchaseRequestService.decidePurchaseRequest(companyId, pr.id, 'approved', actorId);
  assert(approvedPr.status === 'approved', 'PR approved');

  // 2. Create RFQ against the approved PR, sent to 2 vendors
  const rfq = await rfqService.createRfq(
    companyId,
    { purchaseRequestId: pr.id, vendorIds: [vendorA.id, vendorB.id], deliveryLocation: 'Test Warehouse' },
    actorId,
  );
  assert(rfq.status === 'draft', 'new RFQ starts draft');
  assert(rfq.vendors.length === 2, 'RFQ sent to 2 vendors');

  const prAfterRfq = await purchaseRequestService.getPurchaseRequest(companyId, pr.id);
  assert(prAfterRfq.status === 'converted_to_rfq', 'PR auto-flips to converted_to_rfq when RFQ is raised');

  // 3. Send the RFQ
  const sent = await rfqService.sendRfq(companyId, rfq.id, actorId);
  assert(sent.status === 'sent', 'RFQ sent');

  // 4. Record 2 vendor quotations — vendor B cheaper
  const quoteA = await vendorQuotationService.recordVendorQuotation(
    companyId,
    { rfqId: rfq.id, vendorId: vendorA.id, items: [{ productVariantId, unitPrice: 500, gstPercentage: 12 }], freightAmount: 100 },
    actorId,
  );
  const rfqAfterFirstQuote = await rfqService.getRfq(companyId, rfq.id);
  assert(rfqAfterFirstQuote.status === 'quoted', 'RFQ auto-flips sent -> quoted on first quotation');

  const quoteB = await vendorQuotationService.recordVendorQuotation(
    companyId,
    { rfqId: rfq.id, vendorId: vendorB.id, items: [{ productVariantId, unitPrice: 400, gstPercentage: 12 }], freightAmount: 50 },
    actorId,
  );

  const rfqDetail = await rfqService.getRfq(companyId, rfq.id);
  assert(rfqDetail.quotations.length === 2, 'both quotations recorded');
  assert(rfqDetail.materialItems.length === 1 && Number(rfqDetail.materialItems[0].quantity) === 10, 'material list carries PR quantity');

  // duplicate-vendor quotation must be rejected
  let dupRejected = false;
  try {
    await vendorQuotationService.recordVendorQuotation(
      companyId,
      { rfqId: rfq.id, vendorId: vendorA.id, items: [{ productVariantId, unitPrice: 999 }] },
      actorId,
    );
  } catch (err) {
    dupRejected = err.errorCode === 'VQ_002';
    if (!dupRejected) console.error('  (unexpected error:', err.errorCode || err.code, err.message, ')');
  }
  assert(dupRejected, 'recording a second quotation for the same vendor is rejected (VQ_002)');

  // 5. Select vendor B (cheaper)
  const selected = await rfqService.selectVendor(companyId, rfq.id, quoteB.id, actorId);
  assert(selected.status === 'vendor_selected', 'RFQ moves to vendor_selected');
  assert(selected.selected_vendor_quotation_id === quoteB.id, 'selected quotation is vendor B');

  // 6. Attempt PO creation with the WRONG vendor -> must be rejected (RFQ_005)
  let mismatchRejected = false;
  try {
    await purchaseOrderService.createPurchaseOrder(
      companyId,
      {
        purchaseRequestId: pr.id,
        rfqId: rfq.id,
        warehouseId,
        vendorId: vendorA.id, // not the selected vendor
        items: [{ productVariantId, quantity: 10, unitCost: 500 }],
      },
      actorId,
    );
  } catch (err) {
    mismatchRejected = err.errorCode === 'RFQ_005';
    if (!mismatchRejected) console.error('  (unexpected error:', err.errorCode || err.code, err.message, ')');
  }
  assert(mismatchRejected, 'PO creation with a non-selected vendor is rejected (RFQ_005)');

  // 7. Create PO with the correct (selected) vendor -> must succeed
  const po = await purchaseOrderService.createPurchaseOrder(
    companyId,
    {
      purchaseRequestId: pr.id,
      rfqId: rfq.id,
      warehouseId,
      vendorId: vendorB.id,
      taxAmount: 0,
      items: [{ productVariantId, quantity: 10, unitCost: 400 }],
    },
    actorId,
  );
  assert(po.rfq_id === rfq.id, 'PO records the rfq_id it was decided through');
  assert(Number(po.total_amount) === 4000, 'PO total = 10 * 400');

  const rfqAfterPo = await rfqService.getRfq(companyId, rfq.id);
  assert(rfqAfterPo.status === 'converted_to_po', 'RFQ auto-flips to converted_to_po once the PO is created');

  console.log('\nALL CHECKS PASSED — quoteA=' + quoteA.id + ' quoteB(selected)=' + quoteB.id + ' po=' + po.id);
}

main()
  .catch((err) => {
    console.error('\nVERIFICATION FAILED:', err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
