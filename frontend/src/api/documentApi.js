import api from "./axios";

// Document Management APIs
export const documentApi = {
  getAllDocuments: (params) => api.get("/documents", { params }),
  getDocumentById: (id) => api.get(`/documents/${id}`),
  uploadDocument: (formData) => api.post("/documents", formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  updateDocument: (id, data) => api.put(`/documents/${id}`, data),
  deleteDocument: (id) => api.delete(`/documents/${id}`),
  downloadDocument: (id) => api.get(`/documents/${id}/download`, {
    responseType: 'blob'
  }),
  // Document verification APIs
  getPendingDocuments: () => api.get("/documents/verification/pending"),
  approveDocument: (documentId) => api.put(`/documents/${documentId}/approve`),
  rejectDocument: (documentId, reason) => api.put(`/documents/${documentId}/reject`, { reason }),
};

export default documentApi;
