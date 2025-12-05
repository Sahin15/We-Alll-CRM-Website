import api from "./axios";

// User Management APIs
export const userApi = {
  getAllUsers: async (params = {}) => {
    const response = await api.get("/users", { params });
    // Handle both old and new response formats
    if (response.data.pagination) {
      return response.data;
    } else if (Array.isArray(response.data)) {
      return {
        success: true,
        data: response.data,
        pagination: {
          page: 1,
          limit: response.data.length,
          total: response.data.length,
          pages: 1
        }
      };
    } else {
      return response.data;
    }
  },
  getUserById: (id) => api.get(`/users/${id}`),
  createUser: (data) => api.post("/users/register", data),
  updateUser: (id, data) => api.put(`/users/${id}`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  updateProfile: (data) => api.put("/users/profile", data),
  updateUserStatus: (id, status) => api.put(`/users/${id}/status`, { status }),
};

export default userApi;
