import express from 'express';
import { protect } from '../middleware/authMiddleware.js';

import { authorizeRoles } from '../middleware/roleMiddleware.js';
import { requireModulePermission } from '../authz/authzMiddleware.js';
import {
  createInvoice,
  listInvoices,
  getInvoice,
} from '../controllers/procurementInvoiceController.js';

const router = express.Router();

const adminRoles = ['admin', 'superadmin', 'accounts'];
const viewRoles = ['admin', 'superadmin', 'accounts', 'hr', 'hod', 'manager', 'employee'];

router.post(
  '/',
  protect,
  requireModulePermission('procurement', 'procurement.po.manage', { legacyRoles: adminRoles }),
  createInvoice
);
router.get(
  '/',
  protect,
  authorizeRoles(...viewRoles),
  requireModulePermission('procurement', 'procurement.pr.view_self', { legacyAllowed: true }),
  listInvoices
);
router.get(
  '/:id',
  protect,
  authorizeRoles(...viewRoles),
  requireModulePermission('procurement', 'procurement.pr.view_self', { legacyAllowed: true }),
  getInvoice
);

export default router;
