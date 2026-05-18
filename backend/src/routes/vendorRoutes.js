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

const writeRoles = ['admin', 'superadmin', 'accounts'];
const readRoles  = ['admin', 'superadmin', 'accounts'];

router.post('/', protect, authorizeRoles(...writeRoles), createVendor);
router.get('/', protect, authorizeRoles(...readRoles), listVendors);
router.get('/:id', protect, authorizeRoles(...readRoles), getVendor);
router.patch('/:id', protect, authorizeRoles(...writeRoles), updateVendor);
router.patch('/:id/deactivate', protect, authorizeRoles(...writeRoles), deactivateVendor);

export default router;
