import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';
import {
  recordPayment,
  listPayments,
  getPayment,
} from '../controllers/procurementPaymentController.js';

const router = express.Router();

const writeRoles = ['admin', 'superadmin', 'accounts'];
const readRoles  = ['admin', 'superadmin', 'accounts', 'hr', 'hod', 'manager'];

router.post('/', protect, authorizeRoles(...writeRoles), recordPayment);
router.get('/', protect, authorizeRoles(...readRoles), listPayments);
router.get('/:id', protect, authorizeRoles(...readRoles), getPayment);

export default router;
