import api from "./axios";

// Client Management APIs
export const clientApi = {
  getAllClients: async (params = {}) => {
    const response = await api.get("/clients", { params });
    // Handle both old and new response formats
    if (response.data.pagination) {
      // New paginated format
      return response.data;
    } else if (Array.isArray(response.data)) {
      // Old format - convert to new format for backward compatibility
      return {
        success: true,
        data: response.data,
        pagination: {
          page: 1,
          limit: response.data.length,
          total: response.data.length,
          pages: 1
        }
      };
    } else {
      // Fallback
      return response.data;
    }
  },
  getClientById: (id) => api.get(`/clients/${id}`),
  createClient: (data) => api.post("/clients", data),
  updateClient: (id, data) => api.put(`/clients/${id}`, data),
  deleteClient: (id) => api.delete(`/clients/${id}`),
  
  // VIP Client Management
  toggleClientVip: async (id, vipData) => {
    return api.put(`/clients/${id}/vip`, vipData);
  },
  getVipClients: async (params = {}) => {
    return api.get("/clients/vip/list", { params });
  },
};

export default clientApi;
