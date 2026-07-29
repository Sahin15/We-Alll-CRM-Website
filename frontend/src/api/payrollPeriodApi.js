import api from "../services/api";

/**
 * Payroll Period APIs (Payroll V2 Milestone 1)
 */
export const payrollPeriodApi = {
  list: (params) => api.get("/payroll/periods", { params }),
  getById: (id) => api.get(`/payroll/periods/${id}`),
  getByYearMonth: (year, month) => api.get(`/payroll/periods/${year}/${month}`),
  open: (data) => api.post("/payroll/periods", data),
  freeze: (id) => api.post(`/payroll/periods/${id}/freeze`),
  unfreeze: (id) => api.post(`/payroll/periods/${id}/unfreeze`),
  lock: (id) => api.post(`/payroll/periods/${id}/lock`),
  unlock: (id, data) => api.post(`/payroll/periods/${id}/unlock`, data),
  markPaid: (id) => api.post(`/payroll/periods/${id}/mark-paid`),
  gatesStatus: (params) => api.get("/payroll/periods/gates-status", { params }),
};

export default payrollPeriodApi;
