import api from "../services/api";

/**
 * Payroll approval workflow APIs (V2 Milestone 6 / R4 Ops UI).
 */
export const payrollApprovalApi = {
  list: (params) => api.get("/payroll/approvals", { params }),
  listPendingMine: () => api.get("/payroll/approvals/pending/mine"),
  getById: (id) => api.get(`/payroll/approvals/${id}`),
  create: (data) => api.post("/payroll/approvals", data),
  act: (id, data) => api.post(`/payroll/approvals/${id}/act`, data),
  bulkApprove: (id, data) =>
    api.post(`/payroll/approvals/${id}/bulk-approve`, data || {}),
  getCapabilities: () => api.get("/payroll/approvals/capabilities"),
};

export default payrollApprovalApi;
