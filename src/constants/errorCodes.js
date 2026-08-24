/**
 * Central registry of TARGET_ERROR_CODE -> { message, httpStatus }.
 * Extend this table as new domains are added; keep the PREFIX_NNN pattern
 * (plan.md Chapter 5 — Technical System Error Codes Reference).
 */
const ERROR_CODES = {
  AUTH_001: { httpStatus: 401, message: 'Presented JSON Web Token has expired.' },
  AUTH_002: { httpStatus: 403, message: "The user's assigned role lacks required route permissions." },
  AUTH_003: { httpStatus: 401, message: 'Invalid credentials.' },
  AUTH_004: { httpStatus: 401, message: 'Invalid or malformed token.' },
  AUTH_005: { httpStatus: 401, message: 'Refresh token is invalid or has been revoked.' },

  USER_001: { httpStatus: 400, message: 'Target multi-tenant context extraction returned zero results.' },
  USER_002: { httpStatus: 404, message: 'User not found.' },
  USER_003: { httpStatus: 409, message: 'A user with this email already exists.' },

  INV_001: { httpStatus: 422, message: 'Requested SKU quantity exceeds available stock capacity.' },
  INV_002: { httpStatus: 404, message: 'Product not found.' },
  INV_003: { httpStatus: 409, message: 'A product with this SKU already exists.' },

  ORDER_001: { httpStatus: 400, message: 'Attempted lifecycle state transition violates defined state engine flow rules.' },
  ORDER_002: { httpStatus: 404, message: 'Order not found.' },

  PO_001: { httpStatus: 400, message: 'Attempted purchase order state transition violates defined state engine flow rules.' },
  PO_002: { httpStatus: 404, message: 'Purchase order not found.' },

  PR_001: { httpStatus: 400, message: 'Attempted purchase request state transition violates defined state engine flow rules.' },
  PR_002: { httpStatus: 404, message: 'Purchase request not found.' },
  PR_003: { httpStatus: 422, message: 'Purchase order can only be raised against an approved purchase request.' },

  GRN_001: { httpStatus: 404, message: 'GRN not found.' },
  GRN_002: { httpStatus: 422, message: 'Invoice file must be a PDF, JPEG, or PNG.' },

  RFQ_001: { httpStatus: 400, message: 'Attempted RFQ state transition violates defined state engine flow rules.' },
  RFQ_002: { httpStatus: 404, message: 'RFQ not found.' },
  RFQ_003: { httpStatus: 422, message: 'An RFQ can only be raised against an approved purchase request.' },
  RFQ_004: { httpStatus: 422, message: 'Vendor quotations can only be recorded once the RFQ has been sent, and the vendor must be one it was sent to.' },
  RFQ_005: { httpStatus: 422, message: 'Purchase orders raised against an RFQ must use its selected vendor.' },

  VQ_001: { httpStatus: 404, message: 'Vendor quotation not found.' },
  VQ_002: { httpStatus: 409, message: 'This vendor already has a quotation recorded for this RFQ.' },

  VB_001: { httpStatus: 404, message: 'Vendor bill not found.' },
  VB_002: { httpStatus: 422, message: 'Payment amount exceeds the outstanding due amount.' },

  FIN_001: { httpStatus: 400, message: 'Fiscal period is closed; no further postings are permitted.' },
  FIN_002: { httpStatus: 404, message: 'Fiscal period not found.' },
  FIN_003: { httpStatus: 409, message: 'Fiscal period date range overlaps an existing period.' },

  LOAN_001: { httpStatus: 404, message: 'Loan not found.' },
  LOAN_002: { httpStatus: 400, message: 'Loan is not active; repayments/write-off are not permitted.' },

  PAYABLE_001: { httpStatus: 404, message: 'Payable not found.' },
  PAYABLE_002: { httpStatus: 400, message: 'Payable is not open; payments/write-off are not permitted.' },

  DOC_001: { httpStatus: 404, message: 'Document not found.' },

  MIR_001: { httpStatus: 400, message: 'Attempted material issue request state transition violates defined state engine flow rules.' },
  MIR_002: { httpStatus: 404, message: 'Material issue request not found.' },
  MIR_003: { httpStatus: 400, message: 'Item does not belong to this material issue request.' },
  MIR_004: { httpStatus: 400, message: 'Requested issue quantity exceeds the remaining balance or available stock.' },

  APR_001: { httpStatus: 404, message: 'Approval request not found.' },
  APR_002: { httpStatus: 400, message: 'Approval request is not pending — it has already been approved or rejected, or was modified concurrently.' },

  VALIDATION_001: { httpStatus: 400, message: 'Request payload failed validation.' },

  COMMON_001: { httpStatus: 404, message: 'Resource not found.' },
  COMMON_002: { httpStatus: 500, message: 'An unexpected internal error occurred.' },
};

module.exports = { ERROR_CODES };
