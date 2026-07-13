import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';
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
  legacyAllowed: true,
});
const prApprove = requireModulePermission('procurement', 'procurement.pr.approve_hod', {
  legacyAllowed: true,
});

router.post('/', protect, authorizeRoles(...ALL_ROLES), prSelfService, createPR);
router.get('/my', protect, authorizeRoles(...ALL_ROLES), prSelfService, listPRs);
router.patch('/:id/submit', protect, authorizeRoles(...ALL_ROLES), prSelfService, submitPR);
router.patch(
  '/:id/approve',
  protect,
  authorizeRoles(...APPROVER_ROLES),
  prApprove,
  approvePR
);
router.patch(
  '/:id/reject',
  protect,
  authorizeRoles(...APPROVER_ROLES),
  prApprove,
  rejectPR
);
router.get('/', protect, authorizeRoles(...ALL_ROLES), prSelfService, listPRs);
router.get('/:id', protect, authorizeRoles(...ALL_ROLES), prSelfService, getPR);
router.patch('/:id', protect, authorizeRoles(...ALL_ROLES), prSelfService, updatePR);
router.delete('/:id', protect, authorizeRoles(...ALL_ROLES), prSelfService, deletePR);

export default router;
