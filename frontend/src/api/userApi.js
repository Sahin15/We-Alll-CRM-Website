import api from "./axios";
import { createCrudApi } from "./apiFactory";

// Create base CRUD API for users
const baseCrudApi = createCrudApi("/users");

// Get all users
export const getAllUsers = baseCrudApi.getAll;

// Get user by ID
export const getUserById = baseCrudApi.getById;

// Create user
export const createUser = async (data) => {
  try {
    const response = await api.post("/users/register", data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Update user
export const updateUser = baseCrudApi.update;

// Delete user
export const deleteUser = async (id) => {
  try {
    const response = await api.delete(`/admin/users/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Update profile
export const updateProfile = async (data) => {
  try {
    const response = await api.put("/users/profile", data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Update user status
export const updateUserStatus = async (id, status) => {
  try {
    const response = await api.put(`/users/${id}/status`, { status });
    return response.data;
  } catch (error) {
    throw error;
  }
};

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
