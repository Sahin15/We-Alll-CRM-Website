import axios from "./axios";

export const workOnLeaveDayApi = {
  // Create work on leave day request
  createRequest: (data) => axios.post("/work-on-leave-day", data),

  // Get my requests
  getMyRequests: () => axios.get("/work-on-leave-day/my-requests"),

  // Check if there's a request for today
  checkToday: () => axios.get("/work-on-leave-day/check-today"),

  // Get all requests (HR/Admin)
  getAllRequests: (params) => axios.get("/work-on-leave-day", { params }),

  // Approve request (HR/Admin)
  approveRequest: (id, data) => axios.put(`/work-on-leave-day/${id}/approve`, data),

  // Reject request (HR/Admin)
  rejectRequest: (id, data) => axios.put(`/work-on-leave-day/${id}/reject`, data),
};

export default workOnLeaveDayApi;
