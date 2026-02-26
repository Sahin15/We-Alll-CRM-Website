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
   * Get work items by project ID
   * @param {string} projectId - Project ID
   * @param {Object} params - Query parameters for filtering
   * @returns {Promise} Work items data
   */
  getWorkItemsByProject: async (projectId, params = {}) => {
    const response = await api.get(`/work-items/project/${projectId}`, { params });
    return response.data;
  },

  /**
   * Get all work items (admin function)
   * @param {Object} params - Query parameters for filtering
   * @returns {Promise} Work items data
   */
  getAllWorkItems: async (params = {}) => {
    const response = await api.get('/work-items', { params });
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
  },

  /**
   * Reassign a work item to a different user
   * @param {string} id - Work item ID
   * @param {string} newAssigneeId - New assignee user ID
   * @returns {Promise} Updated work item
   */
  reassignWorkItem: async (id, newAssigneeId) => {
    const response = await api.patch(`/work-items/${id}/reassign`, { 
      newAssigneeId 
    });
    return response.data;
  },

  /**
   * Add a comment to a work item
   * @param {string} id - Work item ID
   * @param {string} text - Comment text
   * @returns {Promise} Added comment
   */
  addComment: async (id, text) => {
    const response = await api.post(`/work-items/${id}/comments`, { text });
    return response.data;
  },

  /**
   * Delete a comment from a work item
   * @param {string} workItemId - Work item ID
   * @param {string} commentId - Comment ID
   * @returns {Promise} Deletion result
   */
  deleteComment: async (workItemId, commentId) => {
    const response = await api.delete(`/work-items/${workItemId}/comments/${commentId}`);
    return response.data;
  }
};

export default workItemApi;
