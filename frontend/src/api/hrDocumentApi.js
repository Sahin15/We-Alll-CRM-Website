import api from "../services/api";

export const hrDocumentApi = {
  listTemplates: () => api.get("/hr-documents/templates"),
  getTemplate: (slug) => api.get(`/hr-documents/templates/${slug}`),
  prefill: (slug, userId) => api.get(`/hr-documents/templates/${slug}/prefill/${userId}`),
  preview: (slug, variables) =>
    api.post(`/hr-documents/templates/${slug}/preview`, { variables }, { responseType: "blob" }),
  generate: (slug, userId, variables) =>
    api.post(`/hr-documents/templates/${slug}/generate`, { userId, variables }),
};

export default hrDocumentApi;
