import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';
import {
  createInvoice,
  listInvoices,
  getInvoice,
} from '../controllers/procurementInvoiceController.js';

const router = express.Router();

const adminRoles = ['admin', 'superadmin', 'accounts'];
const viewRoles = ['admin', 'superadmin', 'accounts', 'hr', 'hod', 'manager'];

router.post('/', protect, authorizeRoles(...adminRoles), createInvoice);
router.get('/', protect, authorizeRoles(...viewRoles), listInvoices);
router.get('/:id', protect, authorizeRoles(...viewRoles), getInvoice);

export default router;
