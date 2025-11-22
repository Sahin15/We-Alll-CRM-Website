import api from "./axios";

// Authentication APIs
export const authApi = {
  login: (credentials) => api.post("/users/login", credentials),
  register: (userData) => api.post("/users/register", userData),
  requestPasswordReset: (email) =>
    api.post("/users/request-password-reset", { email }),
  resetPassword: (token, password) =>
    api.post(`/users/reset-password/${token}`, { password }),
  changePassword: (passwords) => api.put("/users/change-password", passwords),
  getCurrentUser: () => api.get("/users/me"),
};

export default authApi;
