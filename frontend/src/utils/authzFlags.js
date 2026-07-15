/**
 * Frontend Authorization V2 feature flags.
 * Keep AUTHZ_V2_MODULES in sync with backend `rolloutManifest.js`.
 */

const AUTHZ_V2_MODULES = [
  'profile',
  'support',
  'dashboard',
  'company',
  'worklog',
  'attendance',
  'leave',
  'wfh',
  'team',
  'hiring',
  'projects',
  'work',
  'crm',
  'procurement',
  'billing',
  'finance',
  'resources',
  'reports',
  'auth',
];

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

/**
 * @returns {boolean}
 */
export function isAuthzV2LeaveEnabled() {
  return isAuthzV2ModuleEnabled('leave');
}

/**
 * @returns {boolean}
 */
export function isAuthzV2WfhEnabled() {
  return isAuthzV2ModuleEnabled('wfh');
}

/**
 * @returns {boolean}
 */
export function isAuthzV2TeamEnabled() {
  return isAuthzV2ModuleEnabled('team');
}

/**
 * @returns {boolean}
 */
export function isAuthzV2HiringEnabled() {
  return isAuthzV2ModuleEnabled('hiring');
}

/**
 * @returns {boolean}
 */
export function isAuthzV2ProjectsEnabled() {
  return isAuthzV2ModuleEnabled('projects');
}

/**
 * @returns {boolean}
 */
export function isAuthzV2WorkEnabled() {
  return isAuthzV2ModuleEnabled('work');
}

/**
 * @returns {boolean}
 */
export function isAuthzV2CrmEnabled() {
  return isAuthzV2ModuleEnabled('crm');
}

/**
 * @returns {boolean}
 */
export function isAuthzV2ProcurementEnabled() {
  return isAuthzV2ModuleEnabled('procurement');
}

/**
 * @returns {boolean}
 */
export function isAuthzV2BillingEnabled() {
  return isAuthzV2ModuleEnabled('billing');
}

/**
 * @returns {boolean}
 */
export function isAuthzV2FinanceEnabled() {
  return isAuthzV2ModuleEnabled('finance');
}

/**
 * @returns {boolean}
 */
export function isAuthzV2ResourcesEnabled() {
  return isAuthzV2ModuleEnabled('resources');
}

/**
 * @returns {boolean}
 */
export function isAuthzV2ReportsEnabled() {
  return isAuthzV2ModuleEnabled('reports');
}

/**
 * @returns {boolean}
 */
export function isAuthzV2AuthEnabled() {
  return isAuthzV2ModuleEnabled('auth');
}
