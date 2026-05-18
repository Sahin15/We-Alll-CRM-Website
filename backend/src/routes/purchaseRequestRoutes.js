import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';
import {
  createPR, listPRs, getPR, updatePR, deletePR,
  submitPR, approvePR, rejectPR,
} from '../controllers/purchaseRequestController.js';

const router = express.Router();

const ALL_ROLES = ['employee', 'hod', 'manager', 'hr', 'admin', 'superadmin', 'accounts'];
const APPROVER_ROLES = ['hod', 'admin', 'superadmin', 'accounts'];

router.post('/', protect, authorizeRoles(...ALL_ROLES), createPR);
router.get('/my', protect, authorizeRoles(...ALL_ROLES), listPRs);  // /my → same handler, role filtering inside
router.get('/', protect, authorizeRoles(...ALL_ROLES), listPRs);
router.get('/:id', protect, authorizeRoles(...ALL_ROLES), getPR);
router.patch('/:id', protect, authorizeRoles(...ALL_ROLES), updatePR);
router.delete('/:id', protect, authorizeRoles(...ALL_ROLES), deletePR);
router.patch('/:id/submit', protect, authorizeRoles(...ALL_ROLES), submitPR);
router.patch('/:id/approve', protect, authorizeRoles(...APPROVER_ROLES), approvePR);
router.patch('/:id/reject', protect, authorizeRoles(...APPROVER_ROLES), rejectPR);

export default router;
