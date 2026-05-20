import api from "../services/api";

export const hiringApplicationApi = {
  create: (data) => api.post("/hiring-applications", data),
  updateStage: (id, data) => api.put(`/hiring-applications/${id}/stage`, data),
  createOffer: (id, data) => api.post(`/hiring-applications/${id}/create-offer`, data),
};

export default hiringApplicationApi;
