import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';
import { requireModulePermission } from '../authz/authzMiddleware.js';
import { createGR, listGRs, getGR } from '../controllers/goodsReceiptController.js';

const router = express.Router();

const writeRoles = ['admin', 'superadmin', 'accounts', 'hr'];
const readRoles = ['admin', 'superadmin', 'accounts', 'hr', 'hod', 'manager', 'employee'];

router.post(
  '/',
  protect,
  authorizeRoles(...writeRoles),
  requireModulePermission('procurement', 'procurement.po.manage', { legacyRoles: writeRoles }),
  createGR
);
router.get(
  '/',
  protect,
  authorizeRoles(...readRoles),
  requireModulePermission('procurement', 'procurement.pr.view_self', { legacyAllowed: true }),
  listGRs
);
router.get(
  '/:id',
  protect,
  authorizeRoles(...readRoles),
  requireModulePermission('procurement', 'procurement.pr.view_self', { legacyAllowed: true }),
  getGR
);

export default router;
