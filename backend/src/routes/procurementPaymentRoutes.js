import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { requireModulePermission } from '../authz/authzMiddleware.js';
import {
  recordPayment,
  listPayments,
  getPayment,
} from '../controllers/procurementPaymentController.js';

const router = express.Router();

const writeRoles = ['admin', 'superadmin', 'accounts'];
const readRoles = ['admin', 'superadmin', 'accounts', 'hr', 'hod', 'manager', 'employee'];

const procurementRead = requireModulePermission('procurement', 'procurement.pr.view_self', {
  legacyRoles: readRoles,
});

router.post(
  '/',
  protect,
  requireModulePermission('procurement', 'procurement.po.manage', { legacyRoles: writeRoles }),
  recordPayment
);
router.get('/', protect, procurementRead, listPayments);
router.get('/:id', protect, procurementRead, getPayment);

export default router;
