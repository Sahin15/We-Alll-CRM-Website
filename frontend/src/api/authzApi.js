import api from './axios.js';

/**
 * Authorization V2 — Effective permissions API
 */
export const authzApi = {
  /**
   * Get effective permissions for the current user (legacy adapter).
   * @returns {Promise<{ legacyRole, accessRoles, permissions, scopes, grants, source }>}
   */
  getEffective: async () => {
    const { data } = await api.get('/v1/authz/effective');
    return data?.data ?? data;
  },

  /**
   * Check a single permission (debug).
   * @param {string} permission
   * @param {object} [resource]
   */
  check: async (permission, resource = null) => {
    const { data } = await api.post('/v1/authz/check', { permission, resource });
    return data?.data ?? data;
  },

  /**
   * Permission catalog (admin only).
   */
  getCatalog: async () => {
    const { data } = await api.get('/v1/authz/catalog');
    return data?.data ?? data;
  },
};

export default authzApi;
