import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Get all slots with filters
export const getAllSlots = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    
    if (filters.project) params.append('project', filters.project);
    if (filters.assignedTo) params.append('assignedTo', filters.assignedTo);
    if (filters.status) params.append('status', filters.status);
    if (filters.platform) params.append('platform', filters.platform);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.search) params.append('search', filters.search);

    const response = await api.get(`/slots?${params.toString()}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Get slots by project
export const getSlotsByProject = async (projectId) => {
  try {
    const response = await api.get(`/slots/project/${projectId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Get my assigned slots
export const getMySlots = async () => {
  try {
    const response = await api.get('/slots/my-slots');
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Get single slot by ID
export const getSlotById = async (slotId) => {
  try {
    const response = await api.get(`/slots/${slotId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Create new slot
export const createSlot = async (slotData) => {
  try {
    const response = await api.post('/slots', slotData);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Update slot
export const updateSlot = async (slotId, slotData) => {
  try {
    const response = await api.put(`/slots/${slotId}`, slotData);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Update slot status
export const updateSlotStatus = async (slotId, status) => {
  try {
    const response = await api.patch(`/slots/${slotId}/status`, { designStatus: status });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Add comment to slot
export const addComment = async (slotId, text) => {
  try {
    const response = await api.post(`/slots/${slotId}/comments`, { text });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Upload creative to slot
export const uploadCreative = async (slotId, file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post(`/slots/${slotId}/creatives`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Delete slot
export const deleteSlot = async (slotId) => {
  try {
    const response = await api.delete(`/slots/${slotId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Get slot statistics for a project
export const getSlotStatistics = async (projectId) => {
  try {
    const response = await api.get(`/slots/stats/${projectId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export default {
  getAllSlots,
  getSlotsByProject,
  getMySlots,
  getSlotById,
  createSlot,
  updateSlot,
  updateSlotStatus,
  addComment,
  uploadCreative,
  deleteSlot,
  getSlotStatistics
};
