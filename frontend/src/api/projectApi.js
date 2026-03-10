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

export const getProjectsForEmployee = async (employeeId) => {
  const response = await axios.get(`${API_URL}/projects/employee/${employeeId}`, {
    headers: getAuthHeader()
  });
  
  // Return as array for consistency
  return Array.isArray(response.data) ? response.data : [];
};

export const getProjectById = async (id) => {
  const response = await axios.get(`${API_URL}/projects/${id}`, {
    headers: getAuthHeader(),
  });
  // Backend returns project directly, not wrapped in data
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

// ============================================
// Project Workspace
// ============================================

export const getProjectWorkspace = async (id) => {
  const response = await axios.get(`${API_URL}/projects/${id}/workspace`, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const getWorkBoard = async (id) => {
  const response = await axios.get(`${API_URL}/projects/${id}/work-board`, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const getTeamWorkload = async (id) => {
  const response = await axios.get(`${API_URL}/projects/${id}/team-workload`, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const getProjectWorkItems = async (id, params = {}) => {
  const response = await axios.get(`${API_URL}/work-items/my-work`, {
    headers: getAuthHeader(),
    params: { project: id, ...params }
  });
  return response.data;
};

// ============================================
// Slot Management
// ============================================

export const getProjectSlotStatistics = async (projectId) => {
  const response = await axios.get(
    `${API_URL}/work-calendar/projects/${projectId}/slots/statistics`,
    { headers: getAuthHeader() }
  );
  return response.data;
};

export const getAvailableSlots = async (projectId, filters = {}) => {
  const response = await axios.get(
    `${API_URL}/work-calendar/projects/${projectId}/slots/available`,
    { 
      headers: getAuthHeader(),
      params: {
        ...filters,
        includeAll: filters.includeAll || false
      }
    }
  );
  return response.data;
};

export const createSlotsForProject = async (projectId, options) => {
  const response = await axios.post(
    `${API_URL}/work-calendar/projects/${projectId}/slots/create`,
    options,
    { headers: getAuthHeader() }
  );
  return response.data;
};

export const assignWorkItemToSlot = async (slotId, workItemId, notes) => {
  const response = await axios.post(
    `${API_URL}/work-calendar/slots/${slotId}/assign`,
    { workItemId, notes },
    { headers: getAuthHeader() }
  );
  return response.data;
};

export const completeSlot = async (slotId, notes, requiresApproval = false) => {
  const response = await axios.post(
    `${API_URL}/work-calendar/slots/${slotId}/complete`,
    { notes, requiresApproval },
    { headers: getAuthHeader() }
  );
  return response.data;
};

export const createSlot = async (projectId, slotData) => {
  const response = await axios.post(
    `${API_URL}/work-calendar/slots`,
    { ...slotData, project: projectId },
    { headers: getAuthHeader() }
  );
  return response.data;
};

export const updateSlot = async (slotId, slotData) => {
  const response = await axios.put(
    `${API_URL}/work-calendar/slots/${slotId}`,
    slotData,
    { headers: getAuthHeader() }
  );
  return response.data;
};

export const deleteSlot = async (slotId) => {
  const response = await axios.delete(
    `${API_URL}/work-calendar/slots/${slotId}`,
    { headers: getAuthHeader() }
  );
  return response.data;
};

export const getSlotById = async (slotId) => {
  const response = await axios.get(
    `${API_URL}/work-calendar/slots/${slotId}`,
    { headers: getAuthHeader() }
  );
  return response.data;
};

// New slot management endpoints for slot-based project tracking
export const enableSlotsForProject = async (projectId, options = {}) => {
  const response = await axios.post(
    `${API_URL}/projects/${projectId}/slots/enable`,
    options,
    { headers: getAuthHeader() }
  );
  return response.data;
};

export const getProjectSlots = async (projectId, params = {}) => {
  const response = await axios.get(
    `${API_URL}/projects/${projectId}/slots`,
    { 
      headers: getAuthHeader(),
      params
    }
  );
  return response.data;
};

export const createProjectSlot = async (projectId, slotData) => {
  const response = await axios.post(
    `${API_URL}/projects/${projectId}/slots`,
    slotData,
    { headers: getAuthHeader() }
  );
  return response.data;
};

export const updateProjectSlot = async (projectId, slotId, slotData) => {
  const response = await axios.put(
    `${API_URL}/projects/${projectId}/slots/${slotId}`,
    slotData,
    { headers: getAuthHeader() }
  );
  return response.data;
};

export const deleteProjectSlot = async (projectId, slotId) => {
  const response = await axios.delete(
    `${API_URL}/projects/${projectId}/slots/${slotId}`,
    { headers: getAuthHeader() }
  );
  return response.data;
};

export const getWorkItemsGroupedBySlots = async (projectId) => {
  const response = await axios.get(
    `${API_URL}/projects/${projectId}/workitems/grouped-by-slots`,
    { headers: getAuthHeader() }
  );
  return response.data;
};

export const projectApi = {
  getAllProjects,
  getProjectsForEmployee,
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
  getProjectWorkspace,
  getWorkBoard,
  getTeamWorkload,
  getProjectWorkItems,
  // Slot management
  getProjectSlotStatistics,
  getAvailableSlots,
  createSlotsForProject,
  assignWorkItemToSlot,
  completeSlot,
  createSlot,
  updateSlot,
  deleteSlot,
  getSlotById,
  // New slot-based project tracking
  enableSlotsForProject,
  getProjectSlots,
  createProjectSlot,
  updateProjectSlot,
  deleteProjectSlot,
  getWorkItemsGroupedBySlots,
};

export default projectApi;
