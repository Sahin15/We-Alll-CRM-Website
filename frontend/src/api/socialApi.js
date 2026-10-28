import api from "./axios";

export const socialApi = {
  overview: (params) => api.get("/social/overview", { params }),
  analytics: (params) => api.get("/social/analytics", { params }),
  clients: (params) => api.get("/social/clients", { params }),
  accounts: (params) => api.get("/social/accounts", { params }),
  createAccount: (data) => api.post("/social/accounts", data),
  updateAccount: (id, data) => api.put(`/social/accounts/${id}`, data),
  deleteAccount: (id) => api.delete(`/social/accounts/${id}`),
  posts: (params) => api.get("/social/posts", { params }),
  createPost: (data) => api.post("/social/posts", data),
  updatePost: (id, data) => api.put(`/social/posts/${id}`, data),
  act: (id, action, data) => api.post(`/social/posts/${id}/${action}`, data || {}),
  settings: () => api.get("/social/settings"),
  saveSettings: (data) => api.put("/social/settings", data),
};

/**
 * @param {string} company
 * @returns {object}
 */
export function companyParams(company) {
  return company && company !== "all" ? { company } : {};
}

/**
 * @param {unknown} error
 * @param {string} fallback
 * @returns {string}
 */
export function apiError(error, fallback) {
  return error?.response?.data?.error || fallback;
}
