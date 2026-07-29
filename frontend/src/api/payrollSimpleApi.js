import api from "../services/api";

/**
 * Simple-mode payroll APIs (SP-03 / SP-05).
 * Adjustments: /api/payroll/adjustments
 * Preview: /api/payroll/simple-preview
 */
export const payrollAdjustmentApi = {
  list: (params) => api.get("/payroll/adjustments", { params }),
  create: (data) => api.post("/payroll/adjustments", data),
  lateRecommendation: (data) =>
    api.post("/payroll/adjustments/late-recommendation", data),
  approve: (id, data = {}) =>
    api.post(`/payroll/adjustments/${id}/approve`, data),
  void: (id, data) => api.post(`/payroll/adjustments/${id}/void`, data),
};

export const payrollSimplePreviewApi = {
  get: (params) => api.get("/payroll/simple-preview", { params }),
};

export const ADJUSTMENT_TYPE_OPTIONS = [
  { value: "bonus", label: "Bonus (+)" },
  { value: "incentive", label: "Incentive (+)" },
  { value: "manual_salary_addition", label: "Manual addition (+)" },
  { value: "advance_recovery", label: "Advance recovery (−)" },
  { value: "penalty", label: "Penalty (−)" },
  { value: "late_deduction", label: "Late deduction (−)" },
  { value: "absent_deduction", label: "Absent deduction (−)" },
  { value: "manual_salary_deduction", label: "Manual deduction (−)" },
  { value: "other", label: "Other" },
];

export default {
  payrollAdjustmentApi,
  payrollSimplePreviewApi,
};
