/**
 * Frontend Authorization V2 feature flags.
 */

const AUTHZ_V2_MODULES = ['profile', 'support', 'dashboard', 'company', 'worklog', 'attendance'];

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

/**
 * @returns {boolean}
 */
export function isAuthzV2DashboardEnabled() {
  return isAuthzV2ModuleEnabled('dashboard');
}

/**
 * @returns {boolean}
 */
export function isAuthzV2CompanyEnabled() {
  return isAuthzV2ModuleEnabled('company');
}

/**
 * @returns {boolean}
 */
export function isAuthzV2WorklogEnabled() {
  return isAuthzV2ModuleEnabled('worklog');
}

/**
 * @returns {boolean}
 */
export function isAuthzV2AttendanceEnabled() {
  return isAuthzV2ModuleEnabled('attendance');
}
