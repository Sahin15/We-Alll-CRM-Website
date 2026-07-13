/**
 * Frontend Authorization V2 feature flags.
 */

/**
 * @returns {boolean}
 */
export function isAuthzV2ProfileEnabled() {
  return import.meta.env.VITE_AUTHZ_V2_PROFILE === 'true';
}
