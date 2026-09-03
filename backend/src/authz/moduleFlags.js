/**
 * Authorization V2 — Per-module feature flags (env).
 */

/**
 * @param {string} moduleName - e.g. 'profile', 'attendance'
 * @returns {boolean}
 */
export function isAuthzModuleEnabled(moduleName) {
  const key = `AUTHZ_V2_${String(moduleName).toUpperCase().replace(/-/g, '_')}`;
  return process.env[key] === 'true';
}

/**
 * @returns {boolean}
 */
export function isAuthzEnforceEnabled() {
  return process.env.AUTHZ_V2_ENFORCE === 'true';
}

/**
 * @returns {boolean}
 */
export function isAuthzShadowEnabled() {
  return process.env.AUTHZ_SHADOW_MODE === 'true';
}
