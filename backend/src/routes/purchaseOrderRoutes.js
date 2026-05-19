import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';
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
const readRoles  = ['admin', 'superadmin', 'accounts', 'hr', 'hod', 'manager', 'employee'];

// IMPORTANT: Specific routes must come BEFORE parameterized routes
router.post('/', protect, authorizeRoles(...writeRoles), createPO);
router.patch('/:id/issue', protect, authorizeRoles(...writeRoles), issuePO);
router.patch('/:id/cancel', protect, authorizeRoles(...writeRoles), cancelPO);
router.get('/:id/pdf', protect, authorizeRoles(...readRoles), getPOPdf);
router.get('/', protect, authorizeRoles(...readRoles), listPOs);
router.get('/:id', protect, authorizeRoles(...readRoles), getPO);
router.patch('/:id', protect, authorizeRoles(...writeRoles), updatePO);

export default router;
