import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Get auth token
const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return { Authorization: `Bearer ${token}` };
};

// ============================================
// Department CRUD Operations
// ============================================

export const getAllDepartments = async () => {
  const response = await axios.get(`${API_URL}/departments`, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const getDepartmentById = async (id) => {
  const response = await axios.get(`${API_URL}/departments/${id}`, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const createDepartment = async (data) => {
  const response = await axios.post(`${API_URL}/departments`, data, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const updateDepartment = async (id, data) => {
  const response = await axios.put(`${API_URL}/departments/${id}`, data, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const deleteDepartment = async (id) => {
  const response = await axios.delete(`${API_URL}/departments/${id}`, {
    headers: getAuthHeader(),
  });
  return response.data;
};

// ============================================
// HoD Management
// ============================================

export const assignHoD = async (departmentId, userId) => {
  const response = await axios.post(
    `${API_URL}/departments/${departmentId}/assign-hod`,
    { userId },
    { headers: getAuthHeader() }
  );
  return response.data;
};

export const removeHoD = async (departmentId) => {
  const response = await axios.delete(
    `${API_URL}/departments/${departmentId}/remove-hod`,
    { headers: getAuthHeader() }
  );
  return response.data;
};

// ============================================
// HoD Access Functions
// ============================================

export const getDepartmentProjects = async (departmentId) => {
  const response = await axios.get(
    `${API_URL}/departments/${departmentId}/projects`,
    { headers: getAuthHeader() }
  );
  return response.data;
};

export const getDepartmentMembers = async (departmentId) => {
  const response = await axios.get(
    `${API_URL}/departments/${departmentId}/members`,
    { headers: getAuthHeader() }
  );
  return response.data;
};

export const getDepartmentStats = async (departmentId) => {
  const response = await axios.get(
    `${API_URL}/departments/${departmentId}/stats`,
    { headers: getAuthHeader() }
  );
  return response.data;
};

// ============================================
// Employee Management
// ============================================

export const addEmployeeToDepartment = async (departmentId, userId) => {
  const response = await axios.put(
    `${API_URL}/departments/${departmentId}/add/${userId}`,
    {},
    { headers: getAuthHeader() }
  );
  return response.data;
};

export const removeEmployeeFromDepartment = async (departmentId, userId) => {
  const response = await axios.put(
    `${API_URL}/departments/${departmentId}/remove/${userId}`,
    {},
    { headers: getAuthHeader() }
  );
  return response.data;
};

export const bulkAssignEmployees = async (departmentId, employeeIds) => {
  const response = await axios.put(
    `${API_URL}/departments/${departmentId}/employees/bulk`,
    { employeeIds },
    { headers: getAuthHeader() }
  );
  return response.data;
};

// Get department analytics
export const getAllDepartmentsAnalytics = async () => {
  const response = await axios.get(`${API_URL}/departments/analytics/summary`, {
    headers: getAuthHeader(),
  });
  return response.data;
};

// Get individual department analytics
export const getDepartmentAnalytics = async (id) => {
  const response = await axios.get(`${API_URL}/departments/${id}/analytics`, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const departmentApi = {
  getAllDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  assignHoD,
  removeHoD,
  getDepartmentProjects,
  getDepartmentMembers,
  getDepartmentStats,
  addEmployeeToDepartment,
  removeEmployeeFromDepartment,
  bulkAssignEmployees,
  getAllDepartmentsAnalytics,
  getDepartmentAnalytics,
};

export default departmentApi;
