import api from './axios';
import { createCrudApi, createCustomApi } from './apiFactory';

// ============================================
// Project CRUD Operations
// ============================================

const baseCrudApi = createCrudApi('/projects');

export const getAllProjects = baseCrudApi.getAll;
export const getProjectById = baseCrudApi.getById;
export const createProject = baseCrudApi.create;
export const updateProject = baseCrudApi.update;
export const deleteProject = baseCrudApi.delete;

// ============================================
// Employee Projects
// ============================================

export const getProjectsForEmployee = async (employeeId) => {
  try {
    const response = await api.get(`/projects/employee/${employeeId}`);
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    throw error;
  }
};

// ============================================
// HoP Management
// ============================================

export const assignProjectToDepartment = async (projectId, departmentId) => {
  try {
    const response = await api.post(
      `/projects/${projectId}/assign-department`,
      { departmentId }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const assignHoP = async (projectId, userId) => {
  try {
    const response = await api.post(
      `/projects/${projectId}/assign-hop`,
      { userId }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const assignProjectHead = async (projectId, userId) => {
  try {
    const response = await api.post(
      `/projects/${projectId}/assign-project-head`,
      { userId }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const removeProjectHead = async (projectId) => {
  try {
    const response = await api.delete(
      `/projects/${projectId}/remove-project-head`
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// ============================================
// Team Management
// ============================================

export const addTeamMember = async (projectId, userId, role) => {
  try {
    const response = await api.post(
      `/projects/${projectId}/team-members`,
      { userId, role }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const removeTeamMember = async (projectId, userId) => {
  try {
    const response = await api.delete(
      `/projects/${projectId}/team-members/${userId}`
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getProjectTeam = async (projectId) => {
  try {
    const response = await api.get(`/projects/${projectId}/team`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// ============================================
// HoP/HoD Specific
// ============================================

export const getMyLeadingProjects = async () => {
  try {
    const response = await api.get(`/projects/my-leading`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getMyDepartmentProjects = async () => {
  try {
    const response = await api.get(`/projects/my-department`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getMyProjects = async () => {
  try {
    const response = await api.get(`/projects/my-projects`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// ============================================
// Project Status & Progress
// ============================================

export const updateProjectStatus = async (id, status) => {
  try {
    const response = await api.put(
      `/projects/${id}/status`,
      { status }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updateProjectProgress = async (id, progress) => {
  try {
    const response = await api.put(
      `/projects/${id}/progress`,
      { progress }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// ============================================
// Project Workspace
// ============================================

export const getProjectWorkspace = async (id) => {
  try {
    const response = await api.get(`/projects/${id}/workspace`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getWorkBoard = async (id) => {
  try {
    const response = await api.get(`/projects/${id}/work-board`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getTeamWorkload = async (id) => {
  try {
    const response = await api.get(`/projects/${id}/team-workload`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getProjectWorkItems = async (id, params = {}) => {
  try {
    const response = await api.get(`/work-items/my-work`, {
      params: { project: id, ...params }
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// ============================================
// Slot Management
// ============================================

export const getProjectSlotStatistics = async (projectId) => {
  try {
    const response = await api.get(
      `/work-calendar/projects/${projectId}/slots/statistics`
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getAvailableSlots = async (projectId, filters = {}) => {
  try {
    const response = await api.get(
      `/work-calendar/projects/${projectId}/slots/available`,
      { 
        params: {
          ...filters,
          includeAll: filters.includeAll || false
        }
      }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const createSlotsForProject = async (projectId, options) => {
  try {
    const response = await api.post(
      `/work-calendar/projects/${projectId}/slots/create`,
      options
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const assignWorkItemToSlot = async (slotId, workItemId, notes) => {
  try {
    const response = await api.post(
      `/work-calendar/slots/${slotId}/assign`,
      { workItemId, notes }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const completeSlot = async (slotId, notes, requiresApproval = false) => {
  try {
    const response = await api.post(
      `/work-calendar/slots/${slotId}/complete`,
      { notes, requiresApproval }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const createSlot = async (projectId, slotData) => {
  try {
    const response = await api.post(
      `/work-calendar/slots`,
      { ...slotData, project: projectId }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updateSlot = async (slotId, slotData) => {
  try {
    const response = await api.put(
      `/work-calendar/slots/${slotId}`,
      slotData
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const deleteSlot = async (slotId) => {
  try {
    const response = await api.delete(
      `/work-calendar/slots/${slotId}`
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getSlotById = async (slotId) => {
  try {
    const response = await api.get(
      `/work-calendar/slots/${slotId}`
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// New slot management endpoints for slot-based project tracking
export const enableSlotsForProject = async (projectId, options = {}) => {
  try {
    const response = await api.post(
      `/projects/${projectId}/slots/enable`,
      options
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getProjectSlots = async (projectId, params = {}) => {
  try {
    const response = await api.get(
      `/projects/${projectId}/slots`,
      { params }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const createProjectSlot = async (projectId, slotData) => {
  try {
    const response = await api.post(
      `/projects/${projectId}/slots`,
      slotData
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updateProjectSlot = async (projectId, slotId, slotData) => {
  try {
    const response = await api.put(
      `/projects/${projectId}/slots/${slotId}`,
      slotData
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const deleteProjectSlot = async (projectId, slotId) => {
  try {
    const response = await api.delete(
      `/projects/${projectId}/slots/${slotId}`
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getWorkItemsGroupedBySlots = async (projectId) => {
  try {
    const response = await api.get(
      `/projects/${projectId}/workitems/grouped-by-slots`
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// ============================================
// Project Credentials
// ============================================

export const getProjectCredentials = async (projectId) => {
  try {
    const response = await api.get(`/projects/${projectId}/credentials`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const addProjectCredential = async (projectId, credentialData) => {
  try {
    const response = await api.post(`/projects/${projectId}/credentials`, credentialData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updateProjectCredential = async (projectId, credentialId, credentialData) => {
  try {
    const response = await api.put(`/projects/${projectId}/credentials/${credentialId}`, credentialData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const deleteProjectCredential = async (projectId, credentialId) => {
  try {
    const response = await api.delete(`/projects/${projectId}/credentials/${credentialId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
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
  // Credentials
  getProjectCredentials,
  addProjectCredential,
  updateProjectCredential,
  deleteProjectCredential,
};

export default projectApi;
