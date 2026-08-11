import api from "./axios";

export const projectMonthApi = {
  getOrCreateProjectMonth: (projectId, monthKey) =>
    api.get(`/projects/${projectId}/month`, { params: { monthKey } }),
  getMonthProgress: (projectId, monthKey) =>
    api.get(`/projects/${projectId}/month-progress`, { params: { monthKey } }),
  getProjectMonthsHistory: (projectId) =>
    api.get(`/projects/${projectId}/months-history`),
  updateProjectMonthGoals: (id, data) => api.put(`/project-months/${id}`, data),
};

export default projectMonthApi;
