async function create(
  client,
  financeTransactionId,
  { isGstApplicable, taxableValue, gstRate, cgstAmount, sgstAmount, igstAmount, hsnCode, placeOfSupplyStateCode, partyGstin, partyType },
  createdBy,
) {
  const { rows } = await client.query(
    `INSERT INTO finance_transaction_tax_details (
       finance_transaction_id, is_gst_applicable, taxable_value, gst_rate, cgst_amount, sgst_amount,
       igst_amount, hsn_code, place_of_supply_state_code, party_gstin, party_type, created_by, updated_by
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $12)
     RETURNING *`,
    [
      financeTransactionId,
      isGstApplicable || false,
      taxableValue || 0,
      gstRate || 0,
      cgstAmount || 0,
      sgstAmount || 0,
      igstAmount || 0,
      hsnCode || null,
      placeOfSupplyStateCode || null,
      partyGstin || null,
      partyType || 'b2c',
      createdBy,
    ],
  );
  return rows[0];
}

module.exports = { create };
