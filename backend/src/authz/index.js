/**
 * Authorization V2 — Public API surface
 */
export { can, hasPermission } from './policyEngine.js';
export { buildEffectivePermissions, getEffectiveGrants, legacyRoleAllows } from './legacyAdapter.js';
export { PERMISSION_CATALOG, isValidPermissionKey, getPermissionsByModule } from './permissionCatalog.js';
export { SCOPES } from './scopes.js';
export { resolveScopeFilter, resourceMatchesScope } from './scopeResolver.js';
export { requirePermissionKey } from './authzMiddleware.js';
export { logAuthzShadowComparison } from './shadowLogger.js';
