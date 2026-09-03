import api from "./axios";

export const commitmentApi = {
  getProjectCommitments: (projectId) => api.get(`/projects/${projectId}/commitments`),
  createProjectCommitment: (projectId, data) =>
    api.post(`/projects/${projectId}/commitments`, data),
  updateProjectCommitment: (id, data) => api.put(`/commitments/${id}`, data),
  deleteProjectCommitment: (id) => api.delete(`/commitments/${id}`),
};

export default commitmentApi;
