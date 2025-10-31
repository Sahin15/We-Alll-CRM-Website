import api from "./axios";

// Project Management APIs
export const projectApi = {
  getAllProjects: () => api.get("/projects"),
  getMyProjects: () => api.get("/projects/my-projects"),
  getProjectById: (id) => api.get(`/projects/${id}`),
  createProject: (data) => api.post("/projects", data),
  updateProjectStatus: (id, status) =>
    api.put(`/projects/${id}/status`, { status }),
  assignUserToProject: (projectId, userId) =>
    api.put(`/projects/${projectId}/assign/${userId}`),
  removeUserFromProject: (projectId, userId) =>
    api.put(`/projects/${projectId}/remove/${userId}`),
};

export default projectApi;
