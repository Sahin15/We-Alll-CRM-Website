import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { requireModulePermission } from '../authz/authzMiddleware.js';
import { createGR, listGRs, getGR } from '../controllers/goodsReceiptController.js';

const router = express.Router();

const writeRoles = ['admin', 'superadmin', 'accounts', 'hr'];
const readRoles = ['admin', 'superadmin', 'accounts', 'hr', 'hod', 'manager', 'employee'];

const procurementRead = requireModulePermission('procurement', 'procurement.pr.view_self', {
  legacyRoles: readRoles,
});

router.post(
  '/',
  protect,
  requireModulePermission('procurement', 'procurement.po.manage', { legacyRoles: writeRoles }),
  createGR
);
router.get('/', protect, procurementRead, listGRs);
router.get('/:id', protect, procurementRead, getGR);

export default router;
