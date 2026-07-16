import api from "../services/api";

// Create a new expense
export const createExpense = async (data) => {
  const response = await api.post("/expenses", data);
  return response.data;
};

// Get my expenses
export const getMyExpenses = async (params) => {
  const response = await api.get("/expenses/my-expenses", { params });
  const d = response.data;
  // Backend returns { success, data: [...], pagination: {...} }
  return {
    expenses: d?.data ?? d?.expenses ?? [],
    pagination: d?.pagination ?? {},
  };
};

// Get all expenses (admin/hr only)
export const getAllExpenses = async (params) => {
  const response = await api.get("/expenses", { params });
  const d = response.data;
  return {
    expenses: d?.data ?? d?.expenses ?? [],
    pagination: d?.pagination ?? {},
  };
};

// Get expense by ID
export const getExpenseById = async (id) => {
  const response = await api.get(`/expenses/${id}`);
  const d = response.data;
  const expense = d?.data ?? d?.expense ?? null;
  return { ...d, expense, data: expense };
};

// Update expense
export const updateExpense = async (id, data) => {
  const response = await api.put(`/expenses/${id}`, data);
  return response.data;
};

// Delete expense
export const deleteExpense = async (id) => {
  const response = await api.delete(`/expenses/${id}`);
  return response.data;
};

// Get expense statistics
export const getExpenseStats = async () => {
  const response = await api.get("/expenses/stats");
  return response.data;
};

// Approve expense (admin/hr only)
export const approveExpense = async (id, data) => {
  const response = await api.patch(`/expenses/${id}/approve`, data);
  return response.data;
};

// Reject expense (admin/hr only)
export const rejectExpense = async (id, data) => {
  const response = await api.patch(`/expenses/${id}/reject`, data);
  return response.data;
};

// Mark expense as reimbursed (admin/hr only)
export const markAsReimbursed = async (id, data) => {
  const response = await api.patch(`/expenses/${id}/reimburse`, data);
  return response.data;
};

// Phase 3 APIs

// Get reimbursement tracking (admin/hr only)
export const getReimbursementTracking = async (params) => {
  const response = await api.get("/expenses/tracking/reimbursement", { params });
  const d = response.data;
  return {
    expenses: d?.data ?? d?.expenses ?? [],
    pagination: d?.pagination ?? {},
  };
};

// Search expenses (advanced search)
export const searchExpenses = async (data) => {
  const response = await api.post("/expenses/search/advanced", data);
  const d = response.data;
  return {
    expenses: d?.data ?? d?.expenses ?? [],
    pagination: d?.pagination ?? {},
  };
};

// Export expenses (admin/hr only)
export const exportExpenses = async (data) => {
  const response = await api.post("/expenses/export/data", data, {
    responseType: data.format === "csv" ? "blob" : "json",
  });
  return response.data;
};

// Bulk approve expenses (admin/hr only)
export const bulkApproveExpenses = async (data) => {
  const response = await api.post("/expenses/bulk/approve", data);
  return response.data;
};

// Bulk reject expenses (admin/hr only)
export const bulkRejectExpenses = async (data) => {
  const response = await api.post("/expenses/bulk/reject", data);
  return response.data;
};

// Phase 4 APIs - Analytics

// Get expense analytics (admin/hr only)
export const getExpenseAnalytics = async (params) => {
  const response = await api.get("/expenses/analytics/overview", { params });
  return response.data;
};

// Get monthly trends
export const getMonthlyTrends = async (params) => {
  const response = await api.get("/expenses/analytics/trends", { params });
  return response.data;
};

// Get budget tracking (admin/hr only)
export const getBudgetTracking = async (params) => {
  const response = await api.get("/expenses/analytics/budget", { params });
  return response.data;
};

// Get category statistics
export const getCategoryStats = async (params = {}) => {
  const response = await api.get("/expenses/category/stats", { params });
  return response.data;
};

// Get all budgets
export const getAllBudgets = async () => {
  const response = await api.get("/expenses/budget/all");
  return response.data;
};

// Get budget by category
export const getBudgetByCategory = async (category) => {
  const response = await api.get(`/expenses/budget/${category}`);
  return response.data;
};

// Set budget for a category
export const setBudget = async (data) => {
  const response = await api.post("/expenses/budget/set", data);
  return response.data;
};

// Set multiple budgets
export const setBulkBudgets = async (data) => {
  const response = await api.post("/expenses/budget/bulk-set", data);
  return response.data;
};

// Get budget tracking with limits
export const getBudgetTrackingWithLimits = async (params) => {
  const response = await api.get("/expenses/analytics/budget-with-limits", { params });
  return response.data;
};

// Get financial years
export const getFinancialYears = async () => {
  const response = await api.get("/expenses/financial-years");
  return response.data;
};

export const expenseApi = {
  createExpense,
  getMyExpenses,
  getAllExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
  getExpenseStats,
  approveExpense,
  rejectExpense,
  markAsReimbursed,
  getReimbursementTracking,
  searchExpenses,
  exportExpenses,
  bulkApproveExpenses,
  bulkRejectExpenses,
  getExpenseAnalytics,
  getMonthlyTrends,
  getBudgetTracking,
  getCategoryStats,
};
