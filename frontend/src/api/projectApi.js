import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Get auth token
const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return { Authorization: `Bearer ${token}` };
};

// ============================================
// Project CRUD Operations
// ============================================

export const getAllProjects = async (params = {}) => {
  const response = await axios.get(`${API_URL}/projects`, {
    headers: getAuthHeader(),
    params
  });
  
  // Handle both old and new response formats
  if (response.data.pagination) {
    // New paginated format
    return response.data;
  } else if (Array.isArray(response.data)) {
    // Old format - convert to new format for backward compatibility
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
    // Fallback
    return response.data;
  }
};

export const getProjectById = async (id) => {
  const response = await axios.get(`${API_URL}/projects/${id}`, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const createProject = async (data) => {
  const response = await axios.post(`${API_URL}/projects`, data, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const updateProject = async (id, data) => {
  const response = await axios.put(`${API_URL}/projects/${id}`, data, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const deleteProject = async (id) => {
  const response = await axios.delete(`${API_URL}/projects/${id}`, {
    headers: getAuthHeader(),
  });
  return response.data;
};

// ============================================
// HoP Management
// ============================================

export const assignProjectToDepartment = async (projectId, departmentId) => {
  const response = await axios.post(
    `${API_URL}/projects/${projectId}/assign-department`,
    { departmentId },
    { headers: getAuthHeader() }
  );
  return response.data;
};

export const assignHoP = async (projectId, userId) => {
  const response = await axios.post(
    `${API_URL}/projects/${projectId}/assign-hop`,
    { userId },
    { headers: getAuthHeader() }
  );
  return response.data;
};

export const assignProjectHead = async (projectId, userId) => {
  const response = await axios.put(
    `${API_URL}/projects/${projectId}/project-head`,
    { userId },
    { headers: getAuthHeader() }
  );
  return response.data;
};

export const removeProjectHead = async (projectId) => {
  const response = await axios.delete(
    `${API_URL}/projects/${projectId}/project-head`,
    { headers: getAuthHeader() }
  );
  return response.data;
};

// ============================================
// Team Management
// ============================================

export const addTeamMember = async (projectId, userId, role) => {
  const response = await axios.post(
    `${API_URL}/projects/${projectId}/team/add`,
    { userId, role },
    { headers: getAuthHeader() }
  );
  return response.data;
};

export const removeTeamMember = async (projectId, userId) => {
  const response = await axios.delete(
    `${API_URL}/projects/${projectId}/team/${userId}`,
    { headers: getAuthHeader() }
  );
  return response.data;
};

export const getProjectTeam = async (projectId) => {
  const response = await axios.get(
    `${API_URL}/projects/${projectId}/team`,
    { headers: getAuthHeader() }
  );
  return response.data;
};

// ============================================
// HoP/HoD Specific
// ============================================

export const getMyLeadingProjects = async () => {
  const response = await axios.get(`${API_URL}/projects/my-leading`, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const getMyDepartmentProjects = async () => {
  const response = await axios.get(`${API_URL}/projects/my-department`, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const getMyProjects = async () => {
  const response = await axios.get(`${API_URL}/projects/my-projects`, {
    headers: getAuthHeader(),
  });
  return response.data;
};

// ============================================
// Project Status & Progress
// ============================================

export const updateProjectStatus = async (id, status) => {
  const response = await axios.put(
    `${API_URL}/projects/${id}/status`,
    { status },
    { headers: getAuthHeader() }
  );
  return response.data;
};

export const updateProjectProgress = async (id, progress) => {
  const response = await axios.put(
    `${API_URL}/projects/${id}/progress`,
    { progress },
    { headers: getAuthHeader() }
  );
  return response.data;
};

export const projectApi = {
  getAllProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  assignProjectToDepartment,
  assignHoP,
  assignProjectHead,
  removeProjectHead,
  addTeamMember,
  removeTeamMember,
  getProjectTeam,
  getMyLeadingProjects,
  getMyDepartmentProjects,
  getMyProjects,
  updateProjectStatus,
  updateProjectProgress,
};

export default projectApi;
