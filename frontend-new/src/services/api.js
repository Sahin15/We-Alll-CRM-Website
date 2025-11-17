import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor - Add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// Service API
export const serviceAPI = {
  getAll: (params) => api.get("/services", { params }),
  getById: (id) => api.get(`/services/${id}`),
  getByCategory: (params) => api.get("/services/by-category", { params }),
  getCategories: (params) => api.get("/services/categories", { params }),
  create: (data) => api.post("/services", data),
  update: (id, data) => api.put(`/services/${id}`, data),
  delete: (id) => api.delete(`/services/${id}`),
  toggleStatus: (id) => api.patch(`/services/${id}/toggle-status`),
  updateDisplayOrder: (data) => api.post("/services/display-order", data),
};

// Plan API
export const planAPI = {
  getAll: (params) => api.get("/plans", { params }),
  getById: (id) => api.get(`/plans/${id}`),
  getForComparison: (params) => api.get("/plans/comparison", { params }),
  create: (data) => api.post("/plans", data),
  update: (id, data) => api.put(`/plans/${id}`, data),
  delete: (id) => api.delete(`/plans/${id}`),
  toggleStatus: (id) => api.put(`/plans/${id}/toggle-status`),
  addService: (id, data) => api.post(`/plans/${id}/services`, data),
  removeService: (id, serviceId) => api.delete(`/plans/${id}/services/${serviceId}`),
  updateServicePrice: (id, serviceId, data) =>
    api.patch(`/plans/${id}/services/${serviceId}/price`, data),
};

// Invoice API
export const invoiceAPI = {
  getAll: (params) => api.get("/invoices", { params }),
  getById: (id) => api.get(`/invoices/${id}`),
  create: (data) => api.post("/invoices", data),
  update: (id, data) => api.put(`/invoices/${id}`, data),
  delete: (id) => api.delete(`/invoices/${id}`),
  send: (id) => api.post(`/invoices/${id}/send`),
  generatePDF: (id) => api.get(`/invoices/${id}/pdf`, { responseType: "blob" }),
};

// Payment API
export const paymentAPI = {
  getAll: (params) => api.get("/payments", { params }),
  getById: (id) => api.get(`/payments/${id}`),
  getPending: () => api.get("/payments/pending-verification"),
  verify: (id, data) => api.put(`/payments/${id}/verify`, data),
  reject: (id, data) => api.put(`/payments/${id}/reject`, data),
};

// Notification API
export const notificationAPI = {
  getAll: (params) => api.get("/notifications", { params }),
  getUnreadCount: () => api.get("/notifications/unread-count"),
  markAsRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: () => api.patch("/notifications/read-all"),
  delete: (id) => api.delete(`/notifications/${id}`),
};

// Subscription API
export const subscriptionAPI = {
  getAll: (params) => api.get("/subscriptions", { params }),
  getById: (id) => api.get(`/subscriptions/${id}`),
  getMySubscriptions: () => api.get("/subscriptions/my-subscriptions"),
  create: (data) => api.post("/subscriptions", data),
  update: (id, data) => api.put(`/subscriptions/${id}`, data),
  delete: (id) => api.delete(`/subscriptions/${id}`),
};

// Client Dashboard API
export const clientDashboardAPI = {
  getStats: () => api.get("/client-dashboard/stats"),
};

// Admin Dashboard API
export const adminDashboardAPI = {
  getStats: (params) => api.get("/admin-dashboard/stats", { params }),
};

export default api;
