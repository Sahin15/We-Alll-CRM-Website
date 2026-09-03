import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { requireModulePermission } from '../authz/authzMiddleware.js';
import {
  createInvoice,
  listInvoices,
  getInvoice,
} from '../controllers/procurementInvoiceController.js';

const router = express.Router();

const adminRoles = ['admin', 'superadmin', 'accounts'];
const viewRoles = ['admin', 'superadmin', 'accounts', 'hr', 'hod', 'manager', 'employee'];

const procurementRead = requireModulePermission('procurement', 'procurement.pr.view_self', {
  legacyRoles: viewRoles,
});

router.post(
  '/',
  protect,
  requireModulePermission('procurement', 'procurement.po.manage', { legacyRoles: adminRoles }),
  createInvoice
);
router.get('/', protect, procurementRead, listInvoices);
router.get('/:id', protect, procurementRead, getInvoice);

export default router;
