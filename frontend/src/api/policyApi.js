import api from "./axios";

// Policy Management APIs
export const policyApi = {
  getAllPolicies: () => api.get("/policies"),
  getPolicyById: (id) => api.get(`/policies/${id}`),
  createPolicy: (data) => api.post("/policies", data),
  updatePolicy: (id, data) => api.put(`/policies/${id}`, data),
  deletePolicy: (id) => api.delete(`/policies/${id}`),
  acknowledgePolicy: (id) => api.post(`/policies/${id}/acknowledge`),
};

export default policyApi;
