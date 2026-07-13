import express from 'express';
import { protect } from '../middleware/authMiddleware.js';


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
  requireModulePermission('procurement', 'procurement.vendor.manage', { legacyRoles: vendorRoles }),
  createVendor
);
router.get(
  '/',
  protect,
  requireModulePermission('procurement', 'procurement.vendor.manage', { legacyRoles: vendorRoles }),
  listVendors
);
router.get(
  '/:id',
  protect,
  requireModulePermission('procurement', 'procurement.vendor.manage', { legacyRoles: vendorRoles }),
  getVendor
);
router.patch(
  '/:id',
  protect,
  requireModulePermission('procurement', 'procurement.vendor.manage', { legacyRoles: vendorRoles }),
  updateVendor
);
router.patch(
  '/:id/deactivate',
  protect,
  requireModulePermission('procurement', 'procurement.vendor.manage', { legacyRoles: vendorRoles }),
  deactivateVendor
);

export default router;
