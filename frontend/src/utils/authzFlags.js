/**
 * Frontend Authorization V2 feature flags.
 */

const AUTHZ_V2_MODULES = ['profile', 'support'];

/**
 * @param {string} moduleName - e.g. 'profile', 'support'
 * @returns {boolean}
 */
export function isAuthzV2ModuleEnabled(moduleName) {
  const key = `VITE_AUTHZ_V2_${String(moduleName).toUpperCase().replace(/-/g, '_')}`;
  return import.meta.env[key] === 'true';
}

/**
 * @returns {boolean}
 */
export function isAuthzV2AnyModuleEnabled() {
  return AUTHZ_V2_MODULES.some((moduleName) => isAuthzV2ModuleEnabled(moduleName));
}

/**
 * @returns {boolean}
 */
export function isAuthzV2ProfileEnabled() {
  return isAuthzV2ModuleEnabled('profile');
}

/**
 * @returns {boolean}
 */
export function isAuthzV2SupportEnabled() {
  return isAuthzV2ModuleEnabled('support');
}
