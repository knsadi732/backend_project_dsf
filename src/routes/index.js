const { Router } = require('express');
const authRoutes = require('./auth.routes');
const companyRoutes = require('./company.routes');
const userRoutes = require('./user.routes');
const roleRoutes = require('./role.routes');
const auditRoutes = require('./audit.routes');
const documentRoutes = require('./document.routes');
const productRoutes = require('./product.routes');
const productVariantRoutes = require('./productVariant.routes');
const productVariantGroupRoutes = require('./productVariantGroup.routes');
const brandRoutes = require('./brand.routes');
const departmentRoutes = require('./department.routes');
const designationRoutes = require('./designation.routes');
const attendanceRoutes = require('./attendance.routes');
const customerRoutes = require('./customer.routes');
const vendorRoutes = require('./vendor.routes');
const orderRoutes = require('./order.routes');
const purchaseOrderRoutes = require('./purchaseOrder.routes');
const purchaseRequestRoutes = require('./purchaseRequest.routes');
const rfqRoutes = require('./rfq.routes');
const vendorQuotationRoutes = require('./vendorQuotation.routes');
const grnRoutes = require('./grn.routes');
const vendorBillRoutes = require('./vendorBill.routes');
const financeRoutes = require('./finance.routes');
const gstReportRoutes = require('./gstReport.routes');
const loanRoutes = require('./loan.routes');
const payableRoutes = require('./payable.routes');
const returnRoutes = require('./return.routes');
const marketplaceChannelRoutes = require('./marketplaceChannel.routes');
const marketplaceSettlementRoutes = require('./marketplaceSettlement.routes');
const notificationRoutes = require('./notification.routes');
const appNotificationRoutes = require('./appNotification.routes');
const analyticsRoutes = require('./analytics.routes');
const workOrderRoutes = require('./workOrder.routes');
const bomRoutes = require('./bom.routes');
const materialIssueRequestRoutes = require('./materialIssueRequest.routes');
const machineRoutes = require('./machine.routes');
const approvalRequestRoutes = require('./approvalRequest.routes');
const warehouseZoneRoutes = require('./warehouseZone.routes');
const rackRoutes = require('./rack.routes');
const shelfRoutes = require('./shelf.routes');
const binRoutes = require('./bin.routes');
const inventoryMovementRoutes = require('./inventoryMovement.routes');
const itemRoutes = require('./item.routes');
const fixedAssetRoutes = require('./fixedAsset.routes');

const router = Router();

// Prefix-scoped routers must be registered before the bare '/' mount below —
// companyRoutes applies `authenticate` unconditionally to everything routed
// into it, and Express dispatches into a '/' mount for every request, so any
// router registered after it would never be reached (e.g. the public
// document-download route would incorrectly demand a bearer token).
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/roles', roleRoutes);
router.use('/audit-logs', auditRoutes);
router.use('/documents', documentRoutes);
router.use('/products', productRoutes); // also exposes /products/categories, /products/stock
router.use('/product-variants', productVariantRoutes);
router.use('/product-variant-groups', productVariantGroupRoutes);
router.use('/brands', brandRoutes);
router.use('/departments', departmentRoutes);
router.use('/designations', designationRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/customers', customerRoutes);
router.use('/vendors', vendorRoutes);
router.use('/orders', orderRoutes);
router.use('/purchase-orders', purchaseOrderRoutes);
router.use('/purchase-requests', purchaseRequestRoutes);
router.use('/rfqs', rfqRoutes);
router.use('/vendor-quotations', vendorQuotationRoutes);
router.use('/grn', grnRoutes);
router.use('/vendor-bills', vendorBillRoutes);
router.use('/finance', financeRoutes);
router.use('/finance/reports', gstReportRoutes);
router.use('/loans', loanRoutes);
router.use('/payables', payableRoutes);
router.use('/returns', returnRoutes);
router.use('/marketplace-channels', marketplaceChannelRoutes);
router.use('/marketplace-settlements', marketplaceSettlementRoutes);
router.use('/notifications', notificationRoutes);
router.use('/app-notifications', appNotificationRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/work-orders', workOrderRoutes);
router.use('/bom', bomRoutes);
router.use('/material-issue-requests', materialIssueRequestRoutes);
router.use('/machines', machineRoutes);
router.use('/approval-requests', approvalRequestRoutes);
router.use('/warehouse-zones', warehouseZoneRoutes);
router.use('/racks', rackRoutes);
router.use('/shelves', shelfRoutes);
router.use('/bins', binRoutes);
router.use('/inventory-movements', inventoryMovementRoutes);
router.use('/items', itemRoutes); // also exposes /items/categories, /items/stock
router.use('/fixed-assets', fixedAssetRoutes);
router.use('/', companyRoutes); // exposes /company, /branches, /warehouses, /settings

module.exports = router;
