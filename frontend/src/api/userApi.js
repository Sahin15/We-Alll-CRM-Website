import api from "./axios";
import { createCrudApi } from "./apiFactory";
import apiOptimizer from "../utils/apiOptimizer";

// Create base CRUD API for users
const baseCrudApi = createCrudApi("/users");

/**
 * Stable dedupe key for concurrent identical user list requests.
 * @param {Record<string, unknown>} params
 */
const buildGetAllUsersKey = (params = {}) => {
  const normalized = Object.keys(params)
    .sort()
    .map((key) => `${key}=${String(params[key])}`)
    .join("&");
  return `users:getAll:${normalized || "default"}`;
};

// Get all users (in-flight dedupe only — no TTL cache)
export const getAllUsers = (params = {}) =>
  apiOptimizer.deduplicate(buildGetAllUsersKey(params), () =>
    baseCrudApi.getAll(params)
  );

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
