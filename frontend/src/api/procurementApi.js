import api from "../services/api";

// ─── Purchase Requests ────────────────────────────────────────────────────────

export const createPR = (data) => api.post("/procurement/purchase-requests", data);
export const listPRs = (params) => api.get("/procurement/purchase-requests", { params });
export const getMyPRs = (params) => api.get("/procurement/purchase-requests/my", { params });
export const getPR = (id) => api.get(`/procurement/purchase-requests/${id}`);
export const updatePR = (id, data) => api.patch(`/procurement/purchase-requests/${id}`, data);
export const deletePR = (id) => api.delete(`/procurement/purchase-requests/${id}`);
export const submitPR = (id) => api.patch(`/procurement/purchase-requests/${id}/submit`);
export const approvePR = (id, data) => api.patch(`/procurement/purchase-requests/${id}/approve`, data);
export const rejectPR = (id, data) => api.patch(`/procurement/purchase-requests/${id}/reject`, data);

// ─── Vendors ──────────────────────────────────────────────────────────────────

export const createVendor = (data) => api.post("/procurement/vendors", data);
export const listVendors = (params) => api.get("/procurement/vendors", { params });
export const getVendor = (id) => api.get(`/procurement/vendors/${id}`);
export const updateVendor = (id, data) => api.patch(`/procurement/vendors/${id}`, data);
export const deactivateVendor = (id) => api.patch(`/procurement/vendors/${id}/deactivate`);

// ─── Purchase Orders ──────────────────────────────────────────────────────────

export const createPO = (data) => api.post("/procurement/purchase-orders", data);
export const listPOs = (params) => api.get("/procurement/purchase-orders", { params });
export const getPO = (id) => api.get(`/procurement/purchase-orders/${id}`);
export const updatePO = (id, data) => api.patch(`/procurement/purchase-orders/${id}`, data);
export const issuePO = (id) => api.patch(`/procurement/purchase-orders/${id}/issue`);
export const cancelPO = (id, data) => api.patch(`/procurement/purchase-orders/${id}/cancel`, data);
export const getPOPdf = (id) =>
  api.get(`/procurement/purchase-orders/${id}/pdf`, { responseType: "blob" });

// ─── Goods Receipts ───────────────────────────────────────────────────────────

export const createGR = (data) => api.post("/procurement/goods-receipts", data);
export const listGRs = (params) => api.get("/procurement/goods-receipts", { params });
export const getGR = (id) => api.get(`/procurement/goods-receipts/${id}`);

// ─── Invoices ─────────────────────────────────────────────────────────────────

export const createInvoice = (data) => api.post("/procurement/invoices", data);
export const listInvoices = (params) => api.get("/procurement/invoices", { params });
export const getInvoice = (id) => api.get(`/procurement/invoices/${id}`);

// ─── Payments ─────────────────────────────────────────────────────────────────

export const recordPayment = (data) => api.post("/procurement/payments", data);
export const listPayments = (params) => api.get("/procurement/payments", { params });
export const getPayment = (id) => api.get(`/procurement/payments/${id}`);

// ─── Dashboard ────────────────────────────────────────────────────────────────

export const getSummary = (params) =>
  api.get("/procurement/dashboard/summary", { params });

export const getBudgetUtilisation = (params) =>
  api.get("/procurement/dashboard/budget-utilisation", { params });

// ─── Reports ──────────────────────────────────────────────────────────────────

export const spendByVendor = (params) =>
  api.get("/procurement/reports/spend-by-vendor", { params });

export const spendByDepartment = (params) =>
  api.get("/procurement/reports/spend-by-department", { params });

export const spendByCategory = (params) =>
  api.get("/procurement/reports/spend-by-category", { params });

export const monthlyTrend = (params) =>
  api.get("/procurement/reports/monthly-trend", { params });

export const prStatusSummary = (params) =>
  api.get("/procurement/reports/pr-status-summary", { params });

export const topVendors = (params) =>
  api.get("/procurement/reports/top-vendors", { params });

export const exportCSV = (params) =>
  api.get("/procurement/reports/export", { params, responseType: "blob" });

// ─── Default export (grouped) ─────────────────────────────────────────────────

export default {
  // Purchase Requests
  createPR,
  listPRs,
  getMyPRs,
  getPR,
  updatePR,
  deletePR,
  submitPR,
  approvePR,
  rejectPR,
  // Vendors
  createVendor,
  listVendors,
  getVendor,
  updateVendor,
  deactivateVendor,
  // Purchase Orders
  createPO,
  listPOs,
  getPO,
  updatePO,
  issuePO,
  cancelPO,
  getPOPdf,
  // Goods Receipts
  createGR,
  listGRs,
  getGR,
  // Invoices
  createInvoice,
  listInvoices,
  getInvoice,
  // Payments
  recordPayment,
  listPayments,
  getPayment,
  // Dashboard
  getSummary,
  getBudgetUtilisation,
  // Reports
  spendByVendor,
  spendByDepartment,
  spendByCategory,
  monthlyTrend,
  prStatusSummary,
  topVendors,
  exportCSV,
};
