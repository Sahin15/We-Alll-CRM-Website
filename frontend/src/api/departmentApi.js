import api from "./axios";

// Department Management APIs
export const departmentApi = {
  getAllDepartments: async (params = {}) => {
    const response = await api.get("/departments", { params });
    return response.data;
  },
  
  // Get only operational departments (for client assignment)
  getOperationalDepartments: async (params = {}) => {
    const response = await api.get("/departments/operational", { params });
    return response.data;
  },
  
  getDepartmentById: (id) => api.get(`/departments/${id}`),
  createDepartment: (data) => api.post("/departments", data),
  updateDepartment: (id, data) => api.put(`/departments/${id}`, data),
  deleteDepartment: (id) => api.delete(`/departments/${id}`),
  
  // Department analytics
  getDepartmentAnalytics: (id) => api.get(`/departments/${id}/analytics`),
  getAllDepartmentsAnalytics: () => api.get("/departments/analytics/summary"),
  
  // Department members
  getDepartmentMembers: (id) => api.get(`/departments/${id}/members`),
  getDepartmentProjects: (id) => api.get(`/departments/${id}/projects`),
  getDepartmentStats: (id) => api.get(`/departments/${id}/stats`),
  
  // HoD Management
  assignHoD: (departmentId, userId) => api.post(`/departments/${departmentId}/assign-hod`, { userId }),
  removeHoD: (departmentId) => api.delete(`/departments/${departmentId}/remove-hod`),
};

export default departmentApi;