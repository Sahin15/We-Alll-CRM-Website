/**
 * Client Work API
 * API functions for client-specific work tracking and reporting
 */

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Get auth token
const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return { Authorization: `Bearer ${token}` };
};

/**
 * Get comprehensive work overview for a client
 */
export const getClientWorkOverview = async (clientId, params = {}) => {
  const response = await axios.get(`${API_URL}/clients/${clientId}/work-overview`, {
    headers: getAuthHeader(),
    params
  });
  return response.data;
};

/**
 * Get detailed slot information for a client
 */
export const getClientSlots = async (clientId, params = {}) => {
  const response = await axios.get(`${API_URL}/clients/${clientId}/slots`, {
    headers: getAuthHeader(),
    params
  });
  return response.data;
};

/**
 * Get client work timeline
 */
export const getClientWorkTimeline = async (clientId, params = {}) => {
  const response = await axios.get(`${API_URL}/clients/${clientId}/timeline`, {
    headers: getAuthHeader(),
    params
  });
  return response.data;
};

/**
 * Get client work statistics
 */
export const getClientWorkStatistics = async (clientId, params = {}) => {
  const response = await axios.get(`${API_URL}/clients/${clientId}/statistics`, {
    headers: getAuthHeader(),
    params
  });
  return response.data;
};

/**
 * Restore a soft deleted work item
 */
export const restoreWorkItem = async (workItemId) => {
  const response = await axios.put(`${API_URL}/work-items/${workItemId}/restore`, {}, {
    headers: getAuthHeader()
  });
  return response.data;
};

export const clientWorkApi = {
  getClientWorkOverview,
  getClientSlots,
  getClientWorkTimeline,
  getClientWorkStatistics,
  restoreWorkItem
};

export default clientWorkApi;