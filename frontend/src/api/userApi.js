import api from "./axios";

// Get all users
export const getAllUsers = async (params = {}) => {
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
};

// Get user by ID
export const getUserById = (id) => api.get(`/users/${id}`);

// Create user
export const createUser = (data) => api.post("/users/register", data);

// Update user
export const updateUser = (id, data) => api.put(`/users/${id}`, data);

// Delete user
export const deleteUser = (id) => api.delete(`/admin/users/${id}`);

// Update profile
export const updateProfile = (data) => api.put("/users/profile", data);

// Update user status
export const updateUserStatus = (id, status) => api.put(`/users/${id}/status`, { status });

// User Management APIs object (for backward compatibility)
export const userApi = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  updateProfile,
  updateUserStatus,
};

export default userApi;
