import api from "../services/api";

export const offerApi = {
  list: (params) => api.get("/offers", { params }),
  get: (id) => api.get(`/offers/${id}`),
  getByUser: (userId) => api.get(`/offers/by-user/${userId}`),
  create: (data) => api.post("/offers", data),
  update: (id, data) => api.put(`/offers/${id}`, data),
  preview: (id) =>
    api.get(`/offers/${id}/preview`, { responseType: "blob" }),
  generate: (id) => api.post(`/offers/${id}/generate`),
  convertToEmployee: (id, data) =>
    api.post(`/offers/${id}/convert-to-employee`, data),
};

export default offerApi;
