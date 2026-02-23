import axios from "axios";

// Use relative URL for API calls - works better with proxy and mobile
const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  // Add timeout to prevent hanging requests on mobile
  timeout: 30000,
  // Ensure credentials are sent
  withCredentials: false,
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
    // List of endpoints where 404 is expected and should not be logged
    const expectedNotFoundEndpoints = [
      '/salary-structures/employee/',
      '/salary-slips/employee/',
    ];
    
    // List of endpoints where 403 is expected (permission-based access)
    const expectedForbiddenEndpoints = [
      '/subscriptions?client=',
    ];
    
    // Check if this is an expected 404
    const isExpected404 = error.response?.status === 404 && 
      expectedNotFoundEndpoints.some(endpoint => 
        error.config?.url?.includes(endpoint)
      );
    
    // Check if this is an expected 403
    const isExpected403 = error.response?.status === 403 && 
      expectedForbiddenEndpoints.some(endpoint => 
        error.config?.url?.includes(endpoint)
      );
    
    // Log error for debugging (will be removed in production build)
    // Skip logging for expected 404s and 403s
    if (import.meta.env.DEV && !isExpected404 && !isExpected403) {
      console.error('API Error:', error);
    }
    
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem("token");
      // Use window.location.replace for better mobile compatibility
      window.location.replace("/login");
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
