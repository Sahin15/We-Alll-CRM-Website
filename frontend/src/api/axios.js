import axios from "axios";

// Use relative URL for API calls - works better with proxy and mobile
const API_URL = import.meta.env.VITE_API_URL || "/api";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  // Add timeout to prevent hanging requests on mobile
  timeout: 30000,
  // Ensure credentials are sent
  withCredentials: false,
});

// Request interceptor - Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if ((config.method || "get").toLowerCase() === "get") {
      // Cache-bust via query param only — custom Cache-Control header triggers CORS preflight
      config.params = { ...config.params, _t: Date.now() };
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // List of endpoints where specific errors are expected and should not be logged
    const expectedNotFoundEndpoints = [
      '/salary-structures/employee/',
      '/salary-slips/employee/',
    ];
    
    const expectedForbiddenEndpoints = [
      '/subscriptions?client=',
    ];
    
    // Check if this is an expected error
    const isExpected404 = error.response?.status === 404 && 
      expectedNotFoundEndpoints.some(endpoint => 
        error.config?.url?.includes(endpoint)
      );
    
    const isExpected403 = error.response?.status === 403 && 
      expectedForbiddenEndpoints.some(endpoint => 
        error.config?.url?.includes(endpoint)
      );
    
    // Log error for debugging (will be removed in production build)
    // Skip logging for expected errors
    if (import.meta.env.DEV && !isExpected404 && !isExpected403) {
      console.error('API Error:', error);
    }
    
    if (error.response) {
      // Handle specific error codes
      if (error.response.status === 401) {
        // Unauthorized - clear token and redirect to login
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        // Use window.location.replace for better mobile compatibility
        window.location.replace("/login");
      }
    }
    return Promise.reject(error);
  }
);

export default api;
