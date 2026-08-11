import api from "./axios";

export const expectationApi = {
  getProjectExpectations: (projectId) => api.get(`/projects/${projectId}/expectations`),
  createProjectExpectation: (projectId, data) =>
    api.post(`/projects/${projectId}/expectations`, data),
  updateProjectExpectation: (id, data) => api.put(`/expectations/${id}`, data),
  deleteProjectExpectation: (id) => api.delete(`/expectations/${id}`),
};

export default expectationApi;
