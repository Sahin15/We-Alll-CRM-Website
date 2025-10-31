import api from "./axios";

// Attendance Management APIs
export const attendanceApi = {
  clockIn: (location) => api.post("/attendance/clock-in", { location }),
  clockOut: (notes) => api.post("/attendance/clock-out", { notes }),
  getMyAttendance: (params) => api.get("/attendance/my-attendance", { params }),
  getAllAttendance: (params) => api.get("/attendance", { params }),
  getAttendanceById: (id) => api.get(`/attendance/${id}`),
  updateAttendanceStatus: (id, status, notes) =>
    api.put(`/attendance/${id}/status`, { status, notes }),
  markAbsence: (employeeId, date, reason) =>
    api.post("/attendance/mark-absence", { employeeId, date, reason }),
  getAttendanceSummary: (employeeId, month, year) =>
    api.get(`/attendance/summary/${employeeId}`, { params: { month, year } }),
};

export default attendanceApi;
