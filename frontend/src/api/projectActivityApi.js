import api from "./axios";

export const projectActivityApi = {
  getProjectActivities: (projectId) =>
    api.get(`/projects/${projectId}/activities`),
  getClientActivities: (clientId) =>
    api.get(`/clients/${clientId}/activities`),
};

export default projectActivityApi;
