import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance with auth token
const api = axios.create({
  baseURL: API_URL,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Apply for WFH
export const applyWFH = async (date, reason) => {
  const response = await api.post('/wfh/apply', { date, reason });
  return response.data;
};

// Get my WFH requests
export const getMyWFHRequests = async (params = {}) => {
  const response = await api.get('/wfh/my-requests', { params });
  return response.data;
};

// Get all WFH requests (HR/Admin)
export const getAllWFHRequests = async (params = {}) => {
  const response = await api.get('/wfh/all', { params });
  return response.data;
};

// Get pending WFH requests (HR/Admin)
export const getPendingWFHRequests = async () => {
  const response = await api.get('/wfh/pending');
  return response.data;
};

// Approve WFH request (HR/Admin)
export const approveWFHRequest = async (id) => {
  const response = await api.put(`/wfh/${id}/approve`);
  return response.data;
};

// Reject WFH request (HR/Admin)
export const rejectWFHRequest = async (id, reason) => {
  const response = await api.put(`/wfh/${id}/reject`, { reason });
  return response.data;
};

// Cancel WFH request (Employee)
export const cancelWFHRequest = async (id) => {
  const response = await api.delete(`/wfh/${id}`);
  return response.data;
};

// Check WFH status for a date
export const checkWFHStatus = async (date) => {
  const response = await api.get(`/wfh/check/${date}`);
  return response.data;
};

// Get WFH statistics (HR/Admin)
export const getWFHStatistics = async (params = {}) => {
  const response = await api.get('/wfh/statistics', { params });
  return response.data;
};

export default {
  applyWFH,
  getMyWFHRequests,
  getAllWFHRequests,
  getPendingWFHRequests,
  approveWFHRequest,
  rejectWFHRequest,
  cancelWFHRequest,
  checkWFHStatus,
  getWFHStatistics,
};
