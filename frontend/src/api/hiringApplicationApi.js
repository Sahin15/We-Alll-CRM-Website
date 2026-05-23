import api from "../services/api";

export const hiringApplicationApi = {
  get: (id) => api.get(`/hiring-applications/${id}`),
  create: (data) => api.post("/hiring-applications", data),
  updateStage: (id, data) => api.put(`/hiring-applications/${id}/stage`, data),
  scheduleInterview: (id, data) => api.post(`/hiring-applications/${id}/interviews`, data),
  completeInterview: (id, interviewId, data) =>
    api.put(`/hiring-applications/${id}/interviews/${interviewId}`, data),
  createOffer: (id, data) => api.post(`/hiring-applications/${id}/create-offer`, data),
};

export default hiringApplicationApi;
