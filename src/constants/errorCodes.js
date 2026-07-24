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

  FIN_001: { httpStatus: 400, message: 'Fiscal period is closed; no further postings are permitted.' },
  FIN_002: { httpStatus: 404, message: 'Fiscal period not found.' },
  FIN_003: { httpStatus: 409, message: 'Fiscal period date range overlaps an existing period.' },

  LOAN_001: { httpStatus: 404, message: 'Loan not found.' },
  LOAN_002: { httpStatus: 400, message: 'Loan is not active; repayments/write-off are not permitted.' },

  DOC_001: { httpStatus: 404, message: 'Document not found.' },

  VALIDATION_001: { httpStatus: 400, message: 'Request payload failed validation.' },

  COMMON_001: { httpStatus: 404, message: 'Resource not found.' },
  COMMON_002: { httpStatus: 500, message: 'An unexpected internal error occurred.' },
};

module.exports = { ERROR_CODES };
