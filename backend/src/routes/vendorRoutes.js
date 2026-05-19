import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';
import {
  createVendor,
  listVendors,
  getVendor,
  updateVendor,
  deactivateVendor,
} from '../controllers/vendorController.js';

const router = express.Router();

// Vendor management - Only admin, superadmin, accounts can manage vendors
const vendorRoles = ['admin', 'superadmin', 'accounts'];

router.post('/', protect, authorizeRoles(...vendorRoles), createVendor);
router.get('/', protect, authorizeRoles(...vendorRoles), listVendors);
router.get('/:id', protect, authorizeRoles(...vendorRoles), getVendor);
router.patch('/:id', protect, authorizeRoles(...vendorRoles), updateVendor);
router.patch('/:id/deactivate', protect, authorizeRoles(...vendorRoles), deactivateVendor);

export default router;
