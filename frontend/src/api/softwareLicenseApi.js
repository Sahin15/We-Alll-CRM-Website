import api from "./axios.js";

const LICENSES_ENDPOINT = "/software-licenses";

// Create license
export const createLicense = async (licenseData) => {
  try {
    const response = await api.post(LICENSES_ENDPOINT, licenseData);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Get all licenses
export const getAllLicenses = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    if (filters.status) params.append("status", filters.status);
    if (filters.category) params.append("category", filters.category);
    if (filters.search) params.append("search", filters.search);
    if (filters.page) params.append("page", filters.page);
    if (filters.limit) params.append("limit", filters.limit);

    const response = await api.get(
      `${LICENSES_ENDPOINT}?${params.toString()}`
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Get license by ID
export const getLicenseById = async (id) => {
  try {
    const response = await api.get(`${LICENSES_ENDPOINT}/${id}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Update license
export const updateLicense = async (id, licenseData) => {
  try {
    const response = await api.put(
      `${LICENSES_ENDPOINT}/${id}`,
      licenseData
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Delete license
export const deleteLicense = async (id) => {
  try {
    const response = await api.delete(`${LICENSES_ENDPOINT}/${id}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Assign license to user
export const assignLicense = async (assignmentData) => {
  try {
    const response = await api.post(
      `${LICENSES_ENDPOINT}/assign`,
      assignmentData
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Get license assignments
export const getAssignments = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    if (filters.licenseId) params.append("licenseId", filters.licenseId);
    if (filters.userId) params.append("userId", filters.userId);
    if (filters.status) params.append("status", filters.status);
    if (filters.page) params.append("page", filters.page);
    if (filters.limit) params.append("limit", filters.limit);

    const response = await api.get(
      `${LICENSES_ENDPOINT}/assignments?${params.toString()}`
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Revoke license assignment
export const revokeLicense = async (assignmentId, revocationReason) => {
  try {
    const response = await api.put(
      `${LICENSES_ENDPOINT}/assignments/${assignmentId}/revoke`,
      { revocationReason }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Get expiring licenses
export const getExpiringLicenses = async (daysAhead = 30) => {
  try {
    const response = await api.get(
      `${LICENSES_ENDPOINT}/expiring?daysAhead=${daysAhead}`
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Get license dashboard
export const getLicenseDashboard = async () => {
  try {
    const response = await api.get(`${LICENSES_ENDPOINT}/dashboard`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Get user's licenses
export const getUserLicenses = async (userId, filters = {}) => {
  try {
    const params = new URLSearchParams();
    if (filters.status) params.append("status", filters.status);
    if (filters.page) params.append("page", filters.page);
    if (filters.limit) params.append("limit", filters.limit);

    const response = await api.get(
      `${LICENSES_ENDPOINT}/user/${userId}?${params.toString()}`
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Get my licenses
export const getMyLicenses = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    if (filters.status) params.append("status", filters.status);
    if (filters.page) params.append("page", filters.page);
    if (filters.limit) params.append("limit", filters.limit);

    const response = await api.get(
      `${LICENSES_ENDPOINT}/user/my-licenses?${params.toString()}`
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};
