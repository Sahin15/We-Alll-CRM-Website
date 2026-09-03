import { asyncHandler, sendSuccess } from '../middleware/errorHandler.js';
import { buildEffectivePermissions } from '../authz/legacyAdapter.js';
import { can } from '../authz/policyEngine.js';
import { getPermissionsByModule, PERMISSION_CATALOG } from '../authz/permissionCatalog.js';
import { getAuthzRolloutStatus } from '../authz/rolloutStatus.js';

/**
 * GET /api/v1/authz/effective
 * Returns effective permissions for the authenticated user (legacy adapter).
 */
export const getEffectivePermissions = asyncHandler(async (req, res) => {
  const effective = buildEffectivePermissions(req.user);

  sendSuccess(res, effective, 'Effective permissions retrieved');
});

/**
 * POST /api/v1/authz/check
 * Debug endpoint: can(currentUser, permission, optional resource body)
 */
export const checkPermission = asyncHandler(async (req, res) => {
  const { permission, resource } = req.body;

  if (!permission) {
    return res.status(400).json({
      success: false,
      error: 'permission is required',
    });
  }

  const decision = can(req.user, permission, resource || null);

  sendSuccess(res, decision, 'Permission check complete');
});

/**
 * GET /api/v1/authz/catalog
 * Returns permission catalog (admin/superadmin only via legacy role for now).
 */
export const getPermissionCatalog = asyncHandler(async (req, res) => {
  sendSuccess(
    res,
    {
      permissions: PERMISSION_CATALOG,
      byModule: getPermissionsByModule(),
    },
    'Permission catalog retrieved'
  );
});

/**
 * GET /api/v1/authz/rollout-status
 * Returns Phase 9 enforcement rollout flags (admin only).
 */
export const getRolloutStatus = asyncHandler(async (req, res) => {
  sendSuccess(res, getAuthzRolloutStatus(), 'Authorization rollout status');
});

/**
 * GET /api/v1/authz/validate
 * Returns configuration validation report (admin only).
 */
export const getConfigValidation = asyncHandler(async (req, res) => {
  const { runAuthzConfigValidation } = await import('../authz/configValidator.js');
  const report = runAuthzConfigValidation();
  sendSuccess(res, report, 'Authorization configuration validation complete');
});
