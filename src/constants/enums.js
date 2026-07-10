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

const PURCHASE_ORDER_STATUS = Object.freeze({
  DRAFT: 'draft',
  APPROVED: 'approved',
  ORDERED: 'ordered',
  RECEIVED: 'received',
  COMPLETED: 'completed',
});
const PURCHASE_ORDER_STATUS_PIPELINE = [
  PURCHASE_ORDER_STATUS.DRAFT,
  PURCHASE_ORDER_STATUS.APPROVED,
  PURCHASE_ORDER_STATUS.ORDERED,
  PURCHASE_ORDER_STATUS.RECEIVED,
  PURCHASE_ORDER_STATUS.COMPLETED,
];

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
  SYSTEM_ROLES,
};
