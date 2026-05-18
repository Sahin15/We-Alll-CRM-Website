import api from "./axios";

// Leave Management APIs
export const leaveApi = {
  createLeaveRequest: (data) => {
    const config = {};
    if (data instanceof FormData) {
      config.headers = { 'Content-Type': 'multipart/form-data' };
    }
    return api.post("/leaves", data, config);
  },
  getMyLeaves: () => api.get("/leaves/my-leaves"),
  getAllLeaves: (params = {}) => api.get("/leaves", { params }),
  getLeaveById: (id) => api.get(`/leaves/${id}`),
  getLeaveBalance: (employeeId = null, year = null) => {
    const url = employeeId ? `/leaves/balance/${employeeId}` : "/leaves/balance";
    const params = year ? { year } : {};
    return api.get(url, { params });
  },
  getLeaveUsageSummary: (employeeId, year = null) => {
    const params = year ? { year } : {};
    return api.get(`/leaves/usage-summary/${employeeId}`, { params });
  },
  getAllLeaveBalances: (year = null, month = null) => {
    const params = {};
    if (year) params.year = year;
    if (month) params.month = month;
    return api.get("/leaves/all-balances", { params });
  },
  updateLeave: (id, data) => api.put(`/leaves/${id}`, data),
  cancelLeave: (id) => api.put(`/leaves/${id}/cancel`),
  approveLeave: (id, approvalComment = '') => api.put(`/leaves/${id}/approve`, { approvalComment }),
  rejectLeave: (id, reason) =>
    api.put(`/leaves/${id}/reject`, { rejectionReason: reason }),
};

export default leaveApi;
