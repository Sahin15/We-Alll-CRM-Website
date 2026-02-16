import api from './axios';

// Start overtime timer
export const startOvertimeTimer = async (reason, taskReference) => {
  const response = await api.post('/attendance/overtime/start-timer', {
    reason,
    taskReference,
  });
  return response.data;
};

// Stop overtime timer
export const stopOvertimeTimer = async (entryId) => {
  const response = await api.post(`/attendance/overtime/stop-timer/${entryId}`);
  return response.data;
};

// Get active overtime timer
export const getActiveOvertimeTimer = async () => {
  const response = await api.get('/attendance/overtime/active-timer');
  return response.data;
};

// Add overtime entry (manual with specific times)
export const addOvertimeEntry = async (overtimeData) => {
  const response = await api.post('/attendance/overtime/add', overtimeData);
  return response.data;
};

// Get my overtime entries
export const getMyOvertimeEntries = async (params = {}) => {
  const response = await api.get('/attendance/overtime/my-entries', { params });
  return response.data;
};

// Get pending overtime entries (HR/Admin/HoD)
export const getPendingOvertimeEntries = async (params = {}) => {
  const response = await api.get('/attendance/overtime/pending', { params });
  return response.data;
};

// Approve overtime entry
export const approveOvertimeEntry = async (attendanceId, entryId) => {
  const response = await api.post(`/attendance/overtime/${attendanceId}/${entryId}/approve`);
  return response.data;
};

// Reject overtime entry
export const rejectOvertimeEntry = async (attendanceId, entryId, rejectionReason) => {
  const response = await api.post(`/attendance/overtime/${attendanceId}/${entryId}/reject`, {
    rejectionReason,
  });
  return response.data;
};

// Get overtime statistics
export const getOvertimeStatistics = async (params = {}) => {
  const response = await api.get('/attendance/overtime/statistics', { params });
  return response.data;
};

export default {
  startOvertimeTimer,
  stopOvertimeTimer,
  getActiveOvertimeTimer,
  addOvertimeEntry,
  getMyOvertimeEntries,
  getPendingOvertimeEntries,
  approveOvertimeEntry,
  rejectOvertimeEntry,
  getOvertimeStatistics,
};
