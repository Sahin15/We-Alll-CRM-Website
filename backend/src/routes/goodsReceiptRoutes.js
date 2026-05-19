import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';
import { createGR, listGRs, getGR } from '../controllers/goodsReceiptController.js';

const router = express.Router();

// Goods Receipt - Only admin, superadmin, accounts, hr can create (warehouse/receiving staff)
// Managers and HoD can view only
const writeRoles = ['admin', 'superadmin', 'accounts', 'hr'];
const readRoles  = ['admin', 'superadmin', 'accounts', 'hr', 'hod', 'manager', 'employee'];

router.post('/', protect, authorizeRoles(...writeRoles), createGR);
router.get('/', protect, authorizeRoles(...readRoles), listGRs);
router.get('/:id', protect, authorizeRoles(...readRoles), getGR);

export default router;
