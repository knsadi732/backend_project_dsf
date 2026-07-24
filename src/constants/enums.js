/**
 * System-level state machines (plan.md Chapter 4 — System Level Core State Machine Rules).
 * Each pipeline is defined as an ordered array; transitions must only move to the
 * next declared state (services/*.service.js enforces this and throws ORDER_001 otherwise).
 */
const ORDER_STATUS = Object.freeze({
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PACKED: 'packed',
  DISPATCHED: 'dispatched',
  DELIVERED: 'delivered',
  COMPLETED: 'completed',
});
const ORDER_STATUS_PIPELINE = [
  ORDER_STATUS.PENDING,
  ORDER_STATUS.CONFIRMED,
  ORDER_STATUS.PACKED,
  ORDER_STATUS.DISPATCHED,
  ORDER_STATUS.DELIVERED,
  ORDER_STATUS.COMPLETED,
];

const PAYMENT_STATUS = Object.freeze({
  PENDING: 'pending',
  PARTIAL: 'partial',
  PAID: 'paid',
  REFUNDED: 'refunded',
});
const PAYMENT_STATUS_PIPELINE = [
  PAYMENT_STATUS.PENDING,
  PAYMENT_STATUS.PARTIAL,
  PAYMENT_STATUS.PAID,
  PAYMENT_STATUS.REFUNDED,
];

/**
 * Purchase Order lifecycle (plan.md Chapter 11.10): Draft -> Pending Approval ->
 * Approved -> Sent -> Acknowledged -> Partially Received -> Completed.
 * Cancelled forks off any pre-Completed state, so purchaseOrder.service.js
 * special-cases it rather than treating it as the pipeline's next step.
 */
const PURCHASE_ORDER_STATUS = Object.freeze({
  DRAFT: 'draft',
  PENDING_APPROVAL: 'pending_approval',
  APPROVED: 'approved',
  SENT: 'sent',
  ACKNOWLEDGED: 'acknowledged',
  PARTIALLY_RECEIVED: 'partially_received',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
});
const PURCHASE_ORDER_STATUS_PIPELINE = [
  PURCHASE_ORDER_STATUS.DRAFT,
  PURCHASE_ORDER_STATUS.PENDING_APPROVAL,
  PURCHASE_ORDER_STATUS.APPROVED,
  PURCHASE_ORDER_STATUS.SENT,
  PURCHASE_ORDER_STATUS.ACKNOWLEDGED,
  PURCHASE_ORDER_STATUS.PARTIALLY_RECEIVED,
  PURCHASE_ORDER_STATUS.COMPLETED,
];

/**
 * Purchase Request lifecycle (plan.md Chapter 11.4): Draft -> Submitted ->
 * Pending Approval -> Approved -> Converted to RFQ. Rejected forks off
 * Pending Approval only and is terminal, so purchaseRequest.service.js
 * special-cases it rather than treating it as the pipeline's next step.
 */
const PURCHASE_REQUEST_STATUS = Object.freeze({
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  PENDING_APPROVAL: 'pending_approval',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CONVERTED_TO_RFQ: 'converted_to_rfq',
});
const PURCHASE_REQUEST_STATUS_PIPELINE = [
  PURCHASE_REQUEST_STATUS.DRAFT,
  PURCHASE_REQUEST_STATUS.SUBMITTED,
  PURCHASE_REQUEST_STATUS.PENDING_APPROVAL,
  PURCHASE_REQUEST_STATUS.APPROVED,
  PURCHASE_REQUEST_STATUS.CONVERTED_TO_RFQ,
];

const PURCHASE_REQUEST_PRIORITY = Object.freeze({
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
});

/** Seeded system roles (plan.md Chapter 2 — Service-01). Extensible via DB, not hardcoded gating. */
const SYSTEM_ROLES = Object.freeze({
  ADMIN: 'admin',
  ACCOUNTANT: 'accountant',
  CA: 'ca',
});

module.exports = {
  ORDER_STATUS,
  ORDER_STATUS_PIPELINE,
  PAYMENT_STATUS,
  PAYMENT_STATUS_PIPELINE,
  PURCHASE_ORDER_STATUS,
  PURCHASE_ORDER_STATUS_PIPELINE,
  PURCHASE_REQUEST_STATUS,
  PURCHASE_REQUEST_STATUS_PIPELINE,
  PURCHASE_REQUEST_PRIORITY,
  SYSTEM_ROLES,
};
