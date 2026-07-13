import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';
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

router.get(
  '/effective',
  protect,
  requireModulePermission('auth', 'dashboard.view', { legacyAllowed: true }),
  getEffectivePermissions
);

router.post(
  '/check',
  protect,
  authorizeRoles(...AUTH_ADMIN_ROLES),
  requireModulePermission('auth', 'auth.role.manage', { legacyRoles: AUTH_ADMIN_ROLES }),
  checkPermission
);

router.get(
  '/catalog',
  protect,
  authorizeRoles(...AUTH_ADMIN_ROLES),
  requireModulePermission('auth', 'auth.role.manage', { legacyRoles: AUTH_ADMIN_ROLES }),
  getPermissionCatalog
);

router.get(
  '/users/:userId/assignments',
  protect,
  authorizeRoles(...AUTH_ADMIN_ROLES),
  requireModulePermission('auth', 'auth.permission.assign', { legacyRoles: AUTH_ADMIN_ROLES }),
  getUserAssignments
);

router.put(
  '/users/:userId/assignments',
  protect,
  authorizeRoles(...AUTH_ADMIN_ROLES),
  requireModulePermission('auth', 'auth.permission.assign', { legacyRoles: AUTH_ADMIN_ROLES }),
  updateUserAssignments
);

export default router;
