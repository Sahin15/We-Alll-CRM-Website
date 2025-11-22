import api from "./axios";

// Lead Management APIs
export const leadApi = {
  getAllLeads: (params) => api.get("/leads", { params }),
  getLeadById: (id) => api.get(`/leads/${id}`),
  createLead: (data) => api.post("/leads", data),
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
  deleteNote: (id, noteIndex) => api.delete(`/leads/${id}/notes/${noteIndex}`),
};

export default leadApi;
