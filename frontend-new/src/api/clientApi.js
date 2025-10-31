import api from "./axios";

// Client Management APIs
export const clientApi = {
  getAllClients: () => api.get("/clients"),
  getClientById: (id) => api.get(`/clients/${id}`),
  createClient: (data) => api.post("/clients", data),
  updateClient: (id, data) => api.put(`/clients/${id}`, data),
  deleteClient: (id) => api.delete(`/clients/${id}`),
};

export default clientApi;
