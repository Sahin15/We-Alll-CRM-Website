import api from "./axios.js";

const ASSETS_ENDPOINT = "/assets";

// Get all assets
export const getAllAssets = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    if (filters.status) params.append("status", filters.status);
    if (filters.category) params.append("category", filters.category);
    if (filters.search) params.append("search", filters.search);
    if (filters.page) params.append("page", filters.page);
    if (filters.limit) params.append("limit", filters.limit);

    const response = await api.get(
      `${ASSETS_ENDPOINT}?${params.toString()}`
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Get asset by ID
export const getAssetById = async (id) => {
  try {
    const response = await api.get(`${ASSETS_ENDPOINT}/${id}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Create asset
export const createAsset = async (assetData) => {
  try {
    const response = await api.post(ASSETS_ENDPOINT, assetData);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Update asset
export const updateAsset = async (id, assetData) => {
  try {
    const response = await api.put(`${ASSETS_ENDPOINT}/${id}`, assetData);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Delete asset
export const deleteAsset = async (id) => {
  try {
    const response = await api.delete(`${ASSETS_ENDPOINT}/${id}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Assign asset
export const assignAsset = async (assetId, assignmentData) => {
  try {
    const response = await api.post(
      `${ASSETS_ENDPOINT}/${assetId}/assign`,
      assignmentData
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Return asset
export const returnAsset = async (assetId, returnData) => {
  try {
    const response = await api.post(
      `${ASSETS_ENDPOINT}/${assetId}/return`,
      returnData
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Get asset dashboard
export const getAssetDashboard = async () => {
  try {
    const response = await api.get(`${ASSETS_ENDPOINT}/dashboard`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Get my assets
export const getMyAssets = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    if (filters.status) params.append("status", filters.status);
    if (filters.page) params.append("page", filters.page);
    if (filters.limit) params.append("limit", filters.limit);

    const response = await api.get(
      `${ASSETS_ENDPOINT}/my-assets?${params.toString()}`
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Get assignments
export const getAssignments = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    if (filters.assetId) params.append("assetId", filters.assetId);
    if (filters.userId) params.append("userId", filters.userId);
    if (filters.status) params.append("status", filters.status);
    if (filters.page) params.append("page", filters.page);
    if (filters.limit) params.append("limit", filters.limit);

    const response = await api.get(
      `${ASSETS_ENDPOINT}/assignments?${params.toString()}`
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Get repairs
export const getRepairs = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    if (filters.assetId) params.append("assetId", filters.assetId);
    if (filters.status) params.append("status", filters.status);
    if (filters.page) params.append("page", filters.page);
    if (filters.limit) params.append("limit", filters.limit);

    const response = await api.get(
      `${ASSETS_ENDPOINT}/repairs?${params.toString()}`
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Create repair
export const createRepair = async (repairData) => {
  try {
    const response = await api.post(
      `${ASSETS_ENDPOINT}/repairs`,
      repairData
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Get warranty assets
export const getWarrantyAssets = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    if (filters.daysAhead) params.append("daysAhead", filters.daysAhead);
    if (filters.page) params.append("page", filters.page);
    if (filters.limit) params.append("limit", filters.limit);

    const response = await api.get(
      `${ASSETS_ENDPOINT}/warranty?${params.toString()}`
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Get asset history
export const getAssetHistory = async (assetId) => {
  try {
    const response = await api.get(`${ASSETS_ENDPOINT}/${assetId}/history`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Get assignment history
export const getHistory = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    if (filters.asset) params.append("asset", filters.asset);
    if (filters.employee) params.append("employee", filters.employee);
    if (filters.status) params.append("status", filters.status);
    if (filters.page) params.append("page", filters.page);
    if (filters.limit) params.append("limit", filters.limit);

    const response = await api.get(
      `${ASSETS_ENDPOINT}/history?${params.toString()}`
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Mark asset as lost
export const markLost = async (assetId, data) => {
  try {
    const response = await api.post(`${ASSETS_ENDPOINT}/${assetId}/mark-lost`, data);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Complete repair
export const completeRepair = async (repairId, data) => {
  try {
    const response = await api.post(`${ASSETS_ENDPOINT}/repairs/${repairId}/complete`, data);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Update repair
export const updateRepair = async (repairId, repairData) => {
  try {
    const response = await api.put(`${ASSETS_ENDPOINT}/repairs/${repairId}`, repairData);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Send asset to repair
export const sendToRepair = async (assetId, repairData) => {
  try {
    const response = await api.post(`${ASSETS_ENDPOINT}/${assetId}/send-to-repair`, repairData);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Default export for backward compatibility
export default {
  getAllAssets,
  getAssetById,
  createAsset,
  updateAsset,
  deleteAsset,
  assignAsset,
  returnAsset,
  getAssetDashboard,
  getMyAssets,
  getAssignments,
  getRepairs,
  createRepair,
  getWarrantyAssets,
  getAssetHistory,
  getHistory,
  markLost,
  completeRepair,
  updateRepair,
  sendToRepair,
};
