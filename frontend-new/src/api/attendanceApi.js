import api from "./axios";

// Attendance Management APIs
export const attendanceApi = {
  clockIn: (location) => api.post("/attendance/clock-in", { location }),
  clockOut: (notes) => api.post("/attendance/clock-out", { notes }),
  getMyAttendance: (params) => api.get("/attendance/my-attendance", { params }),
  getTodayAttendance: () => api.get("/attendance/today"),
  getAllAttendance: (params) => api.get("/attendance", { params }),
  getAttendanceById: (id) => api.get(`/attendance/${id}`),
  createManualAttendance: (data) => api.post("/attendance/manual", data),
  updateManualAttendance: (id, data) => api.put(`/attendance/${id}`, data),
  deleteAttendance: (id) => api.delete(`/attendance/${id}`),
  updateAttendanceStatus: (id, status, notes) =>
    api.put(`/attendance/${id}/status`, { status, notes }),
  markAbsence: (employeeId, date, reason) =>
    api.post("/attendance/mark-absence", { employeeId, date, reason }),
  getAttendanceSummary: (employeeId, month, year) =>
    api.get(`/attendance/summary/${employeeId}`, { params: { month, year } }),
  getAttendanceReport: (params) => api.get("/attendance/report", { params }),
};

export default attendanceApi;
