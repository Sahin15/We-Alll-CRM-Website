import api from "./axios";

// Meeting Management APIs
export const meetingApi = {
  getAllMeetings: (params) => api.get("/meetings", { params }),
  getMeetingById: (id) => api.get(`/meetings/${id}`),
  createMeeting: (data) => api.post("/meetings", data),
  updateMeeting: (id, data) => api.put(`/meetings/${id}`, data),
  deleteMeeting: (id) => api.delete(`/meetings/${id}`),
  respondToMeeting: (id, response) => api.post(`/meetings/${id}/respond`, { response }),
};

export default meetingApi;
