import api from "../services/api";

export const applicantApi = {
  list: (params) => api.get("/applicants", { params }),
  get: (id) => api.get(`/applicants/${id}`),
  create: (formData) =>
    api.post("/applicants", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  update: (id, data) => api.put(`/applicants/${id}`, data),
  uploadResume: (id, formData) =>
    api.post(`/applicants/${id}/resume`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  archive: (id) => api.delete(`/applicants/${id}`),
};

export default applicantApi;
