import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { requireModulePermission } from '../authz/authzMiddleware.js';
import {
  createPO,
  listPOs,
  getPO,
  updatePO,
  issuePO,
  cancelPO,
  getPOPdf,
} from '../controllers/purchaseOrderController.js';

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
  createPO
);
router.patch(
  '/:id/issue',
  protect,
  requireModulePermission('procurement', 'procurement.po.manage', { legacyRoles: writeRoles }),
  issuePO
);
router.patch(
  '/:id/cancel',
  protect,
  requireModulePermission('procurement', 'procurement.po.manage', { legacyRoles: writeRoles }),
  cancelPO
);
router.get('/:id/pdf', protect, procurementRead, getPOPdf);
router.get('/', protect, procurementRead, listPOs);
router.get('/:id', protect, procurementRead, getPO);
router.patch(
  '/:id',
  protect,
  requireModulePermission('procurement', 'procurement.po.manage', { legacyRoles: writeRoles }),
  updatePO
);

export default router;
