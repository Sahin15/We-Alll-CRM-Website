import api from "./axios";

// Lead Management APIs
export const leadApi = {
  getAllLeads: (params) => api.get("/leads", { params }),
  getFollowUpDashboard: (params) => api.get("/leads/follow-ups/dashboard", { params }),
  getLeadById: (id) => api.get(`/leads/${id}`),
  createLead: (data) => api.post("/leads", data),
  createPublicLead: (data) => api.post("/leads/public", data), // Public endpoint for forms
  updateLead: (id, data) => api.put(`/leads/${id}`, data),
  deleteLead: (id) => api.delete(`/leads/${id}`),
  assignLead: (id, assignedTo) =>
    api.put(`/leads/${id}/assign`, { assignedTo }),
  updateLeadStatus: (id, status) => api.put(`/leads/${id}/status`, { status }),
  updateLeadTemperature: (id, temperature) =>
    api.put(`/leads/${id}/temperature`, { temperature }),
  scheduleFollowUp: (id, data) => api.post(`/leads/${id}/follow-ups`, data),
  getLeadFollowUps: (id) => api.get(`/leads/${id}/follow-ups`),
  completeFollowUp: (id, followUpId) =>
    api.put(`/leads/${id}/follow-ups/${followUpId}/complete`),
  cancelFollowUp: (id, followUpId) =>
    api.put(`/leads/${id}/follow-ups/${followUpId}/cancel`),
  deleteNote: (id, noteId) => api.delete(`/leads/${id}/notes/${noteId}`),
  
  // Enhanced Follow-ups
  createFollowUp: (id, data) => api.post(`/leads/${id}/followups`, data),
  updateFollowUp: (id, followupId, data) => api.put(`/leads/${id}/followups/${followupId}`, data),
  deleteFollowUp: (id, followupId) => api.delete(`/leads/${id}/followups/${followupId}`),
  
  // Meetings
  getLeadMeetings: (id) => api.get(`/leads/${id}/meetings`),
  createMeeting: (id, data) => api.post(`/leads/${id}/meetings`, data),
  updateMeeting: (id, meetingId, data) => api.put(`/leads/${id}/meetings/${meetingId}`, data),
  completeMeeting: (id, meetingId) => api.patch(`/leads/${id}/meetings/${meetingId}/complete`),
  cancelMeeting: (id, meetingId) => api.patch(`/leads/${id}/meetings/${meetingId}/cancel`),
  getMyMeetings: () => api.get("/leads/meetings/my-meetings"),
  getTeamMeetings: () => api.get("/leads/meetings/team-meetings"),
  getAllMeetings: () => api.get("/leads/meetings/all-meetings"),
  
  // Contacts
  addContact: (id, data) => api.post(`/leads/${id}/contacts`, data),
  updateContact: (id, contactId, data) => api.put(`/leads/${id}/contacts/${contactId}`, data),
  deleteContact: (id, contactId) => api.delete(`/leads/${id}/contacts/${contactId}`),
  setPrimaryContact: (id, contactId) => api.patch(`/leads/${id}/contacts/${contactId}/primary`),
  
  // History
  getLeadHistory: (id) => api.get(`/leads/${id}/history`),
};

export default leadApi;
