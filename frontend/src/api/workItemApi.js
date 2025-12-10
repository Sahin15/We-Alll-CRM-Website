import api from '../services/api';

/**
 * Work Item API
 * Handles all work item operations (unified tasks and content assignments)
 */
export const workItemApi = {
  /**
   * Get all work items for the current user
   * @param {Object} params - Query parameters for filtering
   * @returns {Promise} Work items data
   */
  getMyWork: async (params = {}) => {
    const response = await api.get('/work-items/my-work', { params });
    return response.data;
  },

  /**
   * Get a single work item by ID
   * @param {string} id - Work item ID
   * @returns {Promise} Work item data
   */
  getWorkItemById: async (id) => {
    const response = await api.get(`/work-items/${id}`);
    return response.data;
  },

  /**
   * Create a new work item
   * @param {Object} workItemData - Work item data
   * @returns {Promise} Created work item
   */
  createWorkItem: async (workItemData) => {
    const response = await api.post('/work-items', workItemData);
    return response.data;
  },

  /**
   * Update a work item
   * @param {string} id - Work item ID
   * @param {Object} updates - Fields to update
   * @returns {Promise} Updated work item
   */
  updateWorkItem: async (id, updates) => {
    const response = await api.put(`/work-items/${id}`, updates);
    return response.data;
  },

  /**
   * Update work item status
   * @param {string} id - Work item ID
   * @param {string} status - New status
   * @returns {Promise} Updated work item
   */
  updateStatus: async (id, status) => {
    const response = await api.patch(`/work-items/${id}/status`, { status });
    return response.data;
  },

  /**
   * Delete a work item
   * @param {string} id - Work item ID
   * @returns {Promise} Deletion result
   */
  deleteWorkItem: async (id) => {
    const response = await api.delete(`/work-items/${id}`);
    return response.data;
  },

  /**
   * Get work items for calendar view
   * @param {Object} params - Query parameters (startDate, endDate, etc.)
   * @returns {Promise} Calendar work items
   */
  getCalendarWorkItems: async (params = {}) => {
    const response = await api.get('/work-items/calendar', { params });
    return response.data;
  },

  /**
   * Get overdue work items
   * @returns {Promise} Overdue work items
   */
  getOverdueWorkItems: async () => {
    const response = await api.get('/work-items/overdue');
    return response.data;
  },

  /**
   * Bulk update work items
   * @param {Object} bulkData - Bulk operation data
   * @returns {Promise} Bulk operation result
   */
  bulkUpdate: async (bulkData) => {
    const response = await api.post('/work-items/bulk-update', bulkData);
    return response.data;
  }
};

export default workItemApi;
