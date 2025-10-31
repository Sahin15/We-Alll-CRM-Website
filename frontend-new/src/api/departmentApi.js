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
};

export default departmentApi;
