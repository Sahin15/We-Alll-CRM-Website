/**
 * Client Work Routes
 * Routes for client-specific work tracking and reporting
 */

import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  getClientWorkOverview,
  getClientSlots,
  getClientWorkTimeline,
  getClientWorkStatistics
} from '../controllers/clientWorkController.js';

import { requireModulePermissionAny } from '../authz/authzMiddleware.js';

const router = express.Router();

const CLIENT_WORK_VIEW_ROLES = [
  "admin",
  "superadmin",
  "hr",
  "hod",
  "manager",
  "employee",
  "accounts",
  "sales",
  "client"
];

// All routes require authentication
router.use(protect);

const checkClientWorkPermission = requireModulePermissionAny(
  "crm",
  ["crm.client.view", "crm.client.view_assigned"],
  { legacyRoles: CLIENT_WORK_VIEW_ROLES }
);

// Client work overview routes
router.get('/:clientId/work-overview', checkClientWorkPermission, getClientWorkOverview);
router.get('/:clientId/slots', checkClientWorkPermission, getClientSlots);
router.get('/:clientId/timeline', checkClientWorkPermission, getClientWorkTimeline);
router.get('/:clientId/statistics', checkClientWorkPermission, getClientWorkStatistics);

export default router;