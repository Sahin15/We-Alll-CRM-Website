import api from './axios.js';

/**
 * Authorization V2 — Effective permissions & assignment API
 */
export const authzApi = {
  getEffective: async () => {
    const { data } = await api.get('/v1/authz/effective');
    return data?.data ?? data;
  },

  check: async (permission, resource = null) => {
    const { data } = await api.post('/v1/authz/check', { permission, resource });
    return data?.data ?? data;
  },

  getCatalog: async () => {
    const { data } = await api.get('/v1/authz/catalog');
    return data?.data ?? data;
  },

  /**
   * @param {string} userId
   * @returns {Promise<object>}
   */
  getUserAssignments: async (userId) => {
    const { data } = await api.get(`/v1/authz/users/${userId}/assignments`);
    return data?.data ?? data;
  },

  /**
   * @param {string} userId
   * @param {Array<{ permission: string, scope?: string, effect?: string, note?: string }>} assignments
   */
  updateUserAssignments: async (userId, assignments) => {
    const { data } = await api.put(`/v1/authz/users/${userId}/assignments`, { assignments });
    const payload = data?.data ?? data;
    if (!payload?.user) {
      throw new Error(data?.message || 'Invalid response from permission assignment API');
    }
    return payload;
  },
};

export default authzApi;
