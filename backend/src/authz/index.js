/**
 * Authorization V2 — Public API surface
 */
export { can, hasPermission } from './policyEngine.js';
export { buildEffectivePermissions, getEffectiveGrants, legacyRoleAllows } from './legacyAdapter.js';
export { PERMISSION_CATALOG, isValidPermissionKey, getPermissionsByModule } from './permissionCatalog.js';
export { SCOPES } from './scopes.js';
export { resolveScopeFilter, resourceMatchesScope } from './scopeResolver.js';
export { requirePermissionKey, requireModulePermission } from './authzMiddleware.js';
export { isAuthzModuleEnabled, isAuthzEnforceEnabled, isAuthzShadowEnabled } from './moduleFlags.js';
export { getAuthzRolloutStatus } from './rolloutStatus.js';
export { AUTHZ_MODULE_NAMES, AUTHZ_ROLLOUT_WAVES } from './rolloutManifest.js';
export { logAuthzShadowComparison } from './shadowLogger.js';
