/**
 * Authorization V2 — Module registry and phased enforcement rollout (Phase 9).
 * Keep frontend `authzFlags.js` AUTHZ_V2_MODULES in sync with AUTHZ_MODULE_NAMES.
 */

/** @type {readonly string[]} */
export const AUTHZ_MODULE_NAMES = Object.freeze([
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
]);

/**
 * Gradual enforcement waves. Enable one wave at a time on staging, then production.
 * Each wave requires AUTHZ_V2_ENFORCE=true and matching VITE_AUTHZ_V2_* on the frontend.
 *
 * @type {readonly { id: number, name: string, modules: readonly string[] }[]}
 */
export const AUTHZ_ROLLOUT_WAVES = Object.freeze([
  {
    id: 1,
    name: 'Low-risk read-mostly',
    modules: ['profile', 'support', 'dashboard', 'company', 'reports'],
  },
  {
    id: 2,
    name: 'Employee daily ops',
    modules: ['worklog', 'resources'],
  },
  {
    id: 3,
    name: 'HR time & attendance',
    modules: ['attendance', 'leave', 'wfh'],
  },
  {
    id: 4,
    name: 'People & hiring',
    modules: ['team', 'hiring'],
  },
  {
    id: 5,
    name: 'Delivery & CRM',
    modules: ['projects', 'work', 'crm'],
  },
  {
    id: 6,
    name: 'Finance & procurement',
    modules: ['procurement', 'billing', 'finance'],
  },
  {
    id: 7,
    name: 'Auth admin (last)',
    modules: ['auth'],
  },
]);

/**
 * @param {string} moduleName
 * @returns {string}
 */
export function authzModuleEnvKey(moduleName) {
  return `AUTHZ_V2_${String(moduleName).toUpperCase().replace(/-/g, '_')}`;
}

/**
 * @param {string} moduleName
 * @returns {string}
 */
export function authzFrontendModuleEnvKey(moduleName) {
  return `VITE_AUTHZ_V2_${String(moduleName).toUpperCase().replace(/-/g, '_')}`;
}
