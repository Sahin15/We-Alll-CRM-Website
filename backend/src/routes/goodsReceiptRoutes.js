import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';
import { createGR, listGRs, getGR } from '../controllers/goodsReceiptController.js';

const router = express.Router();

const writeRoles = ['admin', 'superadmin', 'accounts', 'hr', 'manager'];
const readRoles  = ['admin', 'superadmin', 'accounts', 'hr', 'hod', 'manager'];

router.post('/', protect, authorizeRoles(...writeRoles), createGR);
router.get('/', protect, authorizeRoles(...readRoles), listGRs);
router.get('/:id', protect, authorizeRoles(...readRoles), getGR);

export default router;
