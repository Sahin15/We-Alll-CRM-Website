import api from "./axios";

// User Management APIs
export const userApi = {
  getAllUsers: () => api.get("/users"),
  getUserById: (id) => api.get(`/users/${id}`),
  createUser: (data) => api.post("/users/register", data),
  updateUser: (id, data) => api.put(`/users/${id}`, data),
  deleteUser: (id) => api.delete(`/users/${id}`),
  updateProfile: (data) => api.put("/users/profile", data),
  updateUserStatus: (id, status) => api.put(`/users/${id}/status`, { status }),
};

export default userApi;
