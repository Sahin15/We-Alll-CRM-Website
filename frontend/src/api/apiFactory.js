/**
 * API Factory Pattern
 * Eliminates duplicate API call patterns across 30+ API files
 * Provides consistent CRUD operations for all resources
 */

import api from './axios';

/**
 * Create a standard CRUD API object for a resource
 * Usage: const userApi = createCrudApi('/users');
 */
export const createCrudApi = (endpoint) => {
  return {
    /**
     * Get all items with optional pagination and filters
     */
    getAll: async (params = {}) => {
      try {
        const response = await api.get(endpoint, { params });
        return handleResponse(response.data);
      } catch (error) {
        throw handleError(error);
      }
    },

    /**
     * Get single item by ID
     */
    getById: async (id) => {
      try {
        const response = await api.get(`${endpoint}/${id}`);
        return response.data;
      } catch (error) {
        throw handleError(error);
      }
    },

    /**
     * Create new item
     */
    create: async (data) => {
      try {
        const response = await api.post(endpoint, data);
        return response.data;
      } catch (error) {
        throw handleError(error);
      }
    },

    /**
     * Update item by ID
     */
    update: async (id, data) => {
      try {
        const response = await api.put(`${endpoint}/${id}`, data);
        return response.data;
      } catch (error) {
        throw handleError(error);
      }
    },

    /**
     * Delete item by ID
     */
    delete: async (id) => {
      try {
        const response = await api.delete(`${endpoint}/${id}`);
        return response.data;
      } catch (error) {
        throw handleError(error);
      }
    },

    /**
     * Bulk delete items
     */
    bulkDelete: async (ids) => {
      try {
        const response = await api.post(`${endpoint}/bulk-delete`, { ids });
        return response.data;
      } catch (error) {
        throw handleError(error);
      }
    },

    /**
     * Search items
     */
    search: async (query, params = {}) => {
      try {
        const response = await api.get(`${endpoint}/search`, {
          params: { q: query, ...params },
        });
        return handleResponse(response.data);
      } catch (error) {
        throw handleError(error);
      }
    },

    /**
     * Get paginated items
     */
    getPaginated: async (page = 1, limit = 50, filters = {}) => {
      try {
        const response = await api.get(endpoint, {
          params: { page, limit, ...filters },
        });
        return handleResponse(response.data);
      } catch (error) {
        throw handleError(error);
      }
    },
  };
};

/**
 * Create a custom API object with specific endpoints
 * Usage: const customApi = createCustomApi({
 *   getStats: '/stats',
 *   getAnalytics: '/analytics'
 * });
 */
export const createCustomApi = (endpoints) => {
  const api_obj = {};

  Object.entries(endpoints).forEach(([methodName, endpoint]) => {
    api_obj[methodName] = async (params = {}) => {
      try {
        const response = await api.get(endpoint, { params });
        return response.data;
      } catch (error) {
        throw handleError(error);
      }
    };
  });

  return api_obj;
};

/**
 * Handle API response - normalize both old and new formats
 */
const handleResponse = (data) => {
  // If response has pagination, return as-is
  if (data.pagination) {
    return data;
  }

  // If response is an array, convert to paginated format
  if (Array.isArray(data)) {
    return {
      success: true,
      data,
      pagination: {
        page: 1,
        limit: data.length,
        total: data.length,
        pages: 1,
      },
    };
  }

  // Otherwise return as-is
  return data;
};

/**
 * Handle API errors
 */
const handleError = (error) => {
  if (error.response) {
    // Server responded with error status
    return {
      status: error.response.status,
      message: error.response.data?.message || 'An error occurred',
      data: error.response.data,
    };
  } else if (error.request) {
    // Request made but no response
    return {
      status: 0,
      message: 'No response from server',
    };
  } else {
    // Error in request setup
    return {
      status: 0,
      message: error.message || 'An error occurred',
    };
  }
};

export default {
  createCrudApi,
  createCustomApi,
  handleResponse,
  handleError,
};
