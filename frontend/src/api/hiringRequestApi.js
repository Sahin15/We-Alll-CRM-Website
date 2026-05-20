import api from "../services/api";

export const hiringRequestApi = {
  list: (params) => api.get("/hiring-requests", { params }),
  get: (id) => api.get(`/hiring-requests/${id}`),
  getApplications: (id) => api.get(`/hiring-requests/${id}/applications`),
  create: (data) => api.post("/hiring-requests", data),
  update: (id, data) => api.put(`/hiring-requests/${id}`, data),
  submit: (id) => api.post(`/hiring-requests/${id}/submit`),
  review: (id, data) => api.put(`/hiring-requests/${id}/review`, data),
  pendingCount: () => api.get("/hiring-requests/pending-count"),
};

export default hiringRequestApi;
