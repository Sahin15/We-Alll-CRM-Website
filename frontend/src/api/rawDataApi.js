import api from "../services/api";

export const rawDataApi = {
  // CRUD
  getAll: (params) => api.get("/raw-data", { params }),
  getById: (id) => api.get(`/raw-data/${id}`),
  create: (data) => api.post("/raw-data", data),
  update: (id, data) => api.put(`/raw-data/${id}`, data),
  delete: (id) => api.delete(`/raw-data/${id}`),

  // Duplicate
  checkDuplicate: (phone) => api.post("/raw-data/check-duplicate", { phone }),

  // Calling
  lock: (id) => api.post(`/raw-data/${id}/lock`),
  unlock: (id) => api.post(`/raw-data/${id}/unlock`),
  updateCallResult: (id, data) => api.post(`/raw-data/${id}/call-result`, data),
  getHistory: (id) => api.get(`/raw-data/${id}/history`),

  // Queue
  getTodayQueue: (callerId) => api.get("/raw-data/queue/today", { params: callerId ? { callerId } : {} }),

  // Assignment
  assign: (id, callerId) => api.post(`/raw-data/${id}/assign`, { callerId }),
  reassign: (id, callerId) => api.post(`/raw-data/${id}/reassign`, { callerId }),
  bulkAssign: (recordIds, callerId) => api.post("/raw-data/bulk-assign", { recordIds, callerId }),
  getAssignableStaff: (department, params = {}) =>
    api.get("/raw-data/assignable-staff", { params: { department, ...params } }),

  // Conversion
  convertToLead: (id, leadOwnerId) => api.post(`/raw-data/${id}/convert-to-lead`, { leadOwnerId }),

  // Batch import
  batchImport: (data) => api.post("/raw-data/batch-import", data),

  // Dashboard
  getDashboardSummary: () => api.get("/raw-data/dashboard/summary"),
  getSourceAnalysis: () => api.get("/raw-data/dashboard/source-analysis"),
  getCategoryAnalysis: () => api.get("/raw-data/dashboard/category-analysis"),
};
