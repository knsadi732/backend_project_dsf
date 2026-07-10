const { Router } = require('express');
const authRoutes = require('./auth.routes');
const companyRoutes = require('./company.routes');
const userRoutes = require('./user.routes');
const auditRoutes = require('./audit.routes');
const documentRoutes = require('./document.routes');
const productRoutes = require('./product.routes');
const customerRoutes = require('./customer.routes');
const vendorRoutes = require('./vendor.routes');
const orderRoutes = require('./order.routes');
const purchaseOrderRoutes = require('./purchaseOrder.routes');
const financeRoutes = require('./finance.routes');
const notificationRoutes = require('./notification.routes');
const analyticsRoutes = require('./analytics.routes');

const router = Router();

// Prefix-scoped routers must be registered before the bare '/' mount below —
// companyRoutes applies `authenticate` unconditionally to everything routed
// into it, and Express dispatches into a '/' mount for every request, so any
// router registered after it would never be reached (e.g. the public
// document-download route would incorrectly demand a bearer token).
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/audit-logs', auditRoutes);
router.use('/documents', documentRoutes);
router.use('/products', productRoutes); // also exposes /products/categories, /products/stock
router.use('/customers', customerRoutes);
router.use('/vendors', vendorRoutes);
router.use('/orders', orderRoutes);
router.use('/purchase-orders', purchaseOrderRoutes);
router.use('/finance', financeRoutes);
router.use('/notifications', notificationRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/', companyRoutes); // exposes /company, /branches, /warehouses, /settings

module.exports = router;
