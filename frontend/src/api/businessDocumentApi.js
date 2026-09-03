import api from "./axios";

export const businessDocumentApi = {
  getBusinessDocuments: (params) => api.get("/business-documents", { params }),
  createBusinessDocument: (data) => api.post("/business-documents", data),
  deleteBusinessDocument: (id) => api.delete(`/business-documents/${id}`),
};

export default businessDocumentApi;
