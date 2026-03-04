import api from "../services/api";

// Submit or update today's work log
export const submitWorkLog = async (workLog) => {
  const response = await api.post("/worklogs/submit", { workLog });
  return response.data;
};

// Get today's work log
export const getTodayWorkLog = async () => {
  try {
    const response = await api.get("/worklogs/today");
    return response.data;
  } catch (error) {
    // 404 is expected when no work log exists for today
    if (error.response?.status === 404) {
      return null; // Return null instead of throwing
    }
    // Re-throw other errors
    throw error;
  }
};

// Check if today's work log is submitted
export const checkWorkLogStatus = async () => {
  const response = await api.get("/worklogs/check-status");
  return response.data;
};

// Get my work log history
export const getMyWorkLogs = async (params) => {
  const response = await api.get("/worklogs/my-logs", { params });
  return response.data;
};

// Get all work logs (Admin/HR/Manager)
export const getAllWorkLogs = async (params) => {
  const response = await api.get("/worklogs/all", { params });
  return response.data;
};

// Get specific employee's work logs
export const getEmployeeWorkLogs = async (employeeId, params) => {
  const response = await api.get(`/worklogs/employee/${employeeId}`, { params });
  return response.data;
};

// Review work log
export const reviewWorkLog = async (id, reviewNotes) => {
  const response = await api.put(`/worklogs/${id}/review`, { reviewNotes });
  return response.data;
};

// Update work log (Admin)
export const updateWorkLog = async (id, workLog, reason) => {
  const response = await api.put(`/worklogs/${id}/update`, { workLog, reason });
  return response.data;
};

// Late submission
export const lateSubmission = async (data) => {
  const response = await api.post("/worklogs/late-submission", data);
  return response.data;
};

// Get work log statistics
export const getWorkLogStats = async (params) => {
  const response = await api.get("/worklogs/stats", { params });
  return response.data;
};

// Export work logs
export const exportWorkLogs = async (params) => {
  const response = await api.get("/worklogs/export", {
    params,
    responseType: "blob",
  });
  return response.data;
};

export const workLogApi = {
  submitWorkLog,
  getTodayWorkLog,
  checkWorkLogStatus,
  getMyWorkLogs,
  getAllWorkLogs,
  getEmployeeWorkLogs,
  reviewWorkLog,
  updateWorkLog,
  lateSubmission,
  getWorkLogStats,
  exportWorkLogs,
};
