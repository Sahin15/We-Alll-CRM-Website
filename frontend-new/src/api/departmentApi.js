import api from "./axios";

// Department Management APIs
export const departmentApi = {
  getAllDepartments: () => api.get("/departments"),
  getDepartmentById: (id) => api.get(`/departments/${id}`),
  createDepartment: (data) => api.post("/departments", data),
  updateDepartment: (id, data) => api.put(`/departments/${id}`, data),
  deleteDepartment: (id) => api.delete(`/departments/${id}`),
  addEmployeeToDepartment: (departmentId, userId) =>
    api.put(`/departments/${departmentId}/add/${userId}`),
  removeEmployeeFromDepartment: (departmentId, userId) =>
    api.put(`/departments/${departmentId}/remove/${userId}`),
  bulkAssignEmployees: (departmentId, employeeIds) =>
    api.put(`/departments/${departmentId}/employees/bulk`, { employeeIds }),
  setDepartmentHead: (departmentId, userId) =>
    api.put(`/departments/${departmentId}/head/${userId}`),
  getDepartmentAnalytics: (id) => api.get(`/departments/${id}/analytics`),
  getAllDepartmentsAnalytics: () => api.get("/departments/analytics/summary"),
};

export default departmentApi;
