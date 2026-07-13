import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';
import { requireModulePermission } from '../authz/authzMiddleware.js';
import {
  createVendor,
  listVendors,
  getVendor,
  updateVendor,
  deactivateVendor,
} from '../controllers/vendorController.js';

const router = express.Router();

const vendorRoles = ['admin', 'superadmin', 'accounts'];

router.post(
  '/',
  protect,
  authorizeRoles(...vendorRoles),
  requireModulePermission('procurement', 'procurement.vendor.manage', { legacyRoles: vendorRoles }),
  createVendor
);
router.get(
  '/',
  protect,
  authorizeRoles(...vendorRoles),
  requireModulePermission('procurement', 'procurement.vendor.manage', { legacyRoles: vendorRoles }),
  listVendors
);
router.get(
  '/:id',
  protect,
  authorizeRoles(...vendorRoles),
  requireModulePermission('procurement', 'procurement.vendor.manage', { legacyRoles: vendorRoles }),
  getVendor
);
router.patch(
  '/:id',
  protect,
  authorizeRoles(...vendorRoles),
  requireModulePermission('procurement', 'procurement.vendor.manage', { legacyRoles: vendorRoles }),
  updateVendor
);
router.patch(
  '/:id/deactivate',
  protect,
  authorizeRoles(...vendorRoles),
  requireModulePermission('procurement', 'procurement.vendor.manage', { legacyRoles: vendorRoles }),
  deactivateVendor
);

export default router;
