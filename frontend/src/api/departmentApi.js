import api from "./axios";

// Department Management APIs
export const departmentApi = {
  getAllDepartments: async (params = {}) => {
    const response = await api.get("/departments", { params });
    return response.data;
  },

  /** Lightweight _id + name list for filters (dashboard.view — no team.department.view). */
  getDepartmentDirectory: async () => {
    const response = await api.get("/departments/directory");
    return response.data;
  },
  
  // Get only operational departments (for client assignment)
  getOperationalDepartments: async (params = {}) => {
    const response = await api.get("/departments/operational", { params });
    return response.data;
  },
  
  getDepartmentById: async (id) => {
    const response = await api.get(`/departments/${id}`);
    return response.data;
  },
  createDepartment: async (data) => {
    const response = await api.post("/departments", data);
    return response.data;
  },
  updateDepartment: async (id, data) => {
    const response = await api.put(`/departments/${id}`, data);
    return response.data;
  },
  deleteDepartment: async (id) => {
    const response = await api.delete(`/departments/${id}`);
    return response.data;
  },
  
  // Department analytics
  getDepartmentAnalytics: async (id) => {
    const response = await api.get(`/departments/${id}/analytics`);
    return response.data;
  },
  getAllDepartmentsAnalytics: async () => {
    const response = await api.get("/departments/analytics/summary");
    return response.data;
  },
  
  // Department members
  getDepartmentMembers: async (id) => {
    const response = await api.get(`/departments/${id}/members`);
    return response.data;
  },
  getDepartmentProjects: async (id) => {
    const response = await api.get(`/departments/${id}/projects`);
    return response.data;
  },
  getDepartmentStats: async (id) => {
    const response = await api.get(`/departments/${id}/stats`);
    return response.data;
  },
  
  // HoD Management
  assignHoD: async (departmentId, userId) => {
    const response = await api.post(`/departments/${departmentId}/assign-hod`, { userId });
    return response.data;
  },
  removeHoD: async (departmentId) => {
    const response = await api.delete(`/departments/${departmentId}/remove-hod`);
    return response.data;
  },
};

export default departmentApi;