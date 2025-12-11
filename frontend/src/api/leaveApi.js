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
  getAllLeaves: (status) => api.get("/leaves", { params: { status } }),
  getLeaveById: (id) => api.get(`/leaves/${id}`),
  updateLeave: (id, data) => api.put(`/leaves/${id}`, data),
  cancelLeave: (id) => api.put(`/leaves/${id}/cancel`),
  approveLeave: (id, approvalComment = '') => api.put(`/leaves/${id}/approve`, { approvalComment }),
  rejectLeave: (id, reason) =>
    api.put(`/leaves/${id}/reject`, { rejectionReason: reason }),
};

export default leaveApi;
