import express from 'express';
import { protect } from '../middleware/authMiddleware.js';

import { authorizeRoles } from '../middleware/roleMiddleware.js';
import { requireModulePermission } from '../authz/authzMiddleware.js';
import {
  recordPayment,
  listPayments,
  getPayment,
} from '../controllers/procurementPaymentController.js';

const router = express.Router();

const writeRoles = ['admin', 'superadmin', 'accounts'];
const readRoles = ['admin', 'superadmin', 'accounts', 'hr', 'hod', 'manager', 'employee'];

router.post(
  '/',
  protect,
  requireModulePermission('procurement', 'procurement.po.manage', { legacyRoles: writeRoles }),
  recordPayment
);
router.get(
  '/',
  protect,
  authorizeRoles(...readRoles),
  requireModulePermission('procurement', 'procurement.pr.view_self', { legacyAllowed: true }),
  listPayments
);
router.get(
  '/:id',
  protect,
  authorizeRoles(...readRoles),
  requireModulePermission('procurement', 'procurement.pr.view_self', { legacyAllowed: true }),
  getPayment
);

export default router;
