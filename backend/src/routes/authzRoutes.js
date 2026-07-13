import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';
import { requireModulePermission } from '../authz/authzMiddleware.js';
import {
  getEffectivePermissions,
  checkPermission,
  getPermissionCatalog,
} from '../controllers/authzController.js';

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

export default router;
