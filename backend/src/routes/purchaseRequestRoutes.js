import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { requireModulePermission } from '../authz/authzMiddleware.js';
import {
  createPR,
  listPRs,
  getPR,
  updatePR,
  deletePR,
  submitPR,
  approvePR,
  rejectPR,
} from '../controllers/purchaseRequestController.js';

const router = express.Router();

const ALL_ROLES = ['employee', 'hod', 'manager', 'hr', 'admin', 'superadmin', 'accounts'];
const APPROVER_ROLES = ['hod', 'admin', 'superadmin', 'accounts'];

const prSelfService = requireModulePermission('procurement', 'procurement.pr.create', {
  legacyRoles: ALL_ROLES,
});
const prApprove = requireModulePermission('procurement', 'procurement.pr.approve_hod', {
  legacyRoles: APPROVER_ROLES,
});

router.post('/', protect, prSelfService, createPR);
router.get('/my', protect, prSelfService, listPRs);
router.patch('/:id/submit', protect, prSelfService, submitPR);
router.patch('/:id/approve', protect, prApprove, approvePR);
router.patch('/:id/reject', protect, prApprove, rejectPR);
router.get('/', protect, prSelfService, listPRs);
router.get('/:id', protect, prSelfService, getPR);
router.patch('/:id', protect, prSelfService, updatePR);
router.delete('/:id', protect, prSelfService, deletePR);

export default router;
