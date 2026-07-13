import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { requireModulePermission } from '../authz/authzMiddleware.js';
import {
  getEffectivePermissions,
  checkPermission,
  getPermissionCatalog,
} from '../controllers/authzController.js';
import {
  getUserAssignments,
  updateUserAssignments,
} from '../controllers/authzAssignmentController.js';

const router = express.Router();

const AUTH_ADMIN_ROLES = ['admin', 'superadmin'];

const manageAuthRoles = requireModulePermission('auth', 'auth.role.manage', {
  legacyRoles: AUTH_ADMIN_ROLES,
});

const assignPermissions = requireModulePermission('auth', 'auth.permission.assign', {
  legacyRoles: AUTH_ADMIN_ROLES,
});

router.get(
  '/effective',
  protect,
  requireModulePermission('auth', 'dashboard.view', { legacyAllowed: true }),
  getEffectivePermissions
);

router.post('/check', protect, manageAuthRoles, checkPermission);

router.get('/catalog', protect, manageAuthRoles, getPermissionCatalog);

router.get('/users/:userId/assignments', protect, assignPermissions, getUserAssignments);

router.put('/users/:userId/assignments', protect, assignPermissions, updateUserAssignments);

export default router;
