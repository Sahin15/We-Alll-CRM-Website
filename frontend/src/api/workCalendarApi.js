import api from './axios';

const workCalendarApi = {
  // ============================================
  // EMPLOYEE WORK CALENDAR
  // ============================================

  /**
   * Get employee's personal work calendar
   */
  getEmployeeWorkCalendar: async (employeeId, filters = {}) => {
    const params = new URLSearchParams();
    
    Object.keys(filters).forEach(key => {
      if (filters[key] && filters[key] !== 'all') {
        params.append(key, filters[key]);
      }
    });

    const endpoint = employeeId 
      ? `/work-calendar/employee/${employeeId}?${params.toString()}`
      : `/work-calendar/employee?${params.toString()}`;
      
    return api.get(endpoint);
  },

  // ============================================
  // ADMIN OVERVIEW
  // ============================================

  /**
   * Get comprehensive admin overview with advanced filtering
   */
  getAdminWorkOverview: async (filters = {}) => {
    const params = new URLSearchParams();
    
    Object.keys(filters).forEach(key => {
      if (filters[key] && filters[key] !== 'all') {
        params.append(key, filters[key]);
      }
    });

    return api.get(`/work-calendar/admin/overview?${params.toString()}`);
  },

  // PDF export functionality removed - will be implemented later

  // ============================================
  // SYNC AND MAINTENANCE
  // ============================================

  /**
   * Sync work items to work calendar
   */
  syncWorkItemsToCalendar: async (filters = {}) => {
    const params = new URLSearchParams();
    
    Object.keys(filters).forEach(key => {
      if (filters[key]) {
        params.append(key, filters[key]);
      }
    });

    return api.post(`/work-calendar/admin/sync?${params.toString()}`);
  },

  /**
   * Sync current user's work items to calendar
   */
  syncMyWorkItemsToCalendar: async () => {
    return api.post('/work-calendar/sync-my-work');
  },

  // ============================================
  // CRUD OPERATIONS
  // ============================================

  /**
   * Create manual work calendar entry
   */
  createWorkCalendarEntry: async (entryData) => {
    return api.post('/work-calendar/entry', entryData);
  },

  /**
   * Update work calendar entry
   */
  updateWorkCalendarEntry: async (entryId, updates) => {
    return api.put(`/work-calendar/entry/${entryId}`, updates);
  },

  /**
   * Delete work calendar entry
   */
  deleteWorkCalendarEntry: async (entryId) => {
    return api.delete(`/work-calendar/entry/${entryId}`);
  },

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================

  /**
   * Get filter options for dropdowns
   */
  getFilterOptions: async () => {
    return api.get('/work-calendar/admin/filter-options');
  },

  /**
   * Get comprehensive work calendar analytics with client focus
   */
  getWorkCalendarAnalytics: async (filters = {}) => {
    const params = new URLSearchParams();
    
    Object.keys(filters).forEach(key => {
      if (filters[key] && filters[key] !== 'all') {
        params.append(key, filters[key]);
      }
    });

    return api.get(`/work-calendar/admin/analytics?${params.toString()}`);
  },

  /**
   * Subscribe to real-time analytics updates
   */
  subscribeToAnalyticsUpdates: async (filters = {}) => {
    return api.post('/work-calendar/admin/analytics/subscribe', { filters });
  },

  /**
   * Invalidate analytics cache
   */
  invalidateAnalyticsCache: async (pattern) => {
    return api.post('/work-calendar/admin/analytics/invalidate-cache', { pattern });
  },

  /**
   * Get analytics cache statistics
   */
  getAnalyticsCacheStats: async () => {
    return api.get('/work-calendar/admin/analytics/cache-stats');
  },

  /**
   * Bulk update work calendar entries
   */
  bulkUpdateWorkCalendarEntries: async (entryIds, updates) => {
    return api.put('/work-calendar/admin/bulk-update', {
      entryIds,
      updates
    });
  },

  /**
   * Get work calendar summary for dashboard
   */
  getWorkCalendarSummary: async (employeeId, dateRange) => {
    const params = new URLSearchParams();
    
    if (dateRange?.startDate) params.append('startDate', dateRange.startDate);
    if (dateRange?.endDate) params.append('endDate', dateRange.endDate);

    const endpoint = employeeId 
      ? `/work-calendar/summary/${employeeId}?${params.toString()}`
      : `/work-calendar/summary?${params.toString()}`;
      
    return api.get(endpoint);
  },

  /**
   * Get work calendar conflicts
   */
  getWorkCalendarConflicts: async (employeeId, dateRange) => {
    const params = new URLSearchParams();
    
    if (dateRange?.startDate) params.append('startDate', dateRange.startDate);
    if (dateRange?.endDate) params.append('endDate', dateRange.endDate);

    return api.get(`/work-calendar/conflicts/${employeeId}?${params.toString()}`);
  },

  /**
   * Get team work calendar (for managers/HODs)
   */
  getTeamWorkCalendar: async (departmentId, filters = {}) => {
    const params = new URLSearchParams();
    
    Object.keys(filters).forEach(key => {
      if (filters[key] && filters[key] !== 'all') {
        params.append(key, filters[key]);
      }
    });

    return api.get(`/work-calendar/team/${departmentId}?${params.toString()}`);
  },

  /**
   * Export work calendar data (CSV/Excel)
   */
  exportWorkCalendarData: async (format, filters = {}) => {
    const params = new URLSearchParams();
    
    Object.keys(filters).forEach(key => {
      if (filters[key] && filters[key] !== 'all') {
        params.append(key, filters[key]);
      }
    });

    params.append('format', format);

    return api.get(`/work-calendar/admin/export?${params.toString()}`, {
      responseType: 'blob'
    });
  },

  /**
   * Get work calendar statistics
   */
  getWorkCalendarStats: async (filters = {}) => {
    const params = new URLSearchParams();
    
    Object.keys(filters).forEach(key => {
      if (filters[key] && filters[key] !== 'all') {
        params.append(key, filters[key]);
      }
    });

    return api.get(`/work-calendar/admin/stats?${params.toString()}`);
  },

  // ============================================
  // ENHANCED ADMIN WORK MANAGEMENT
  // ============================================

  /**
   * Get enhanced admin overview with advanced filtering and client focus
   */
  getEnhancedAdminOverview: async (filters = {}) => {
    const params = new URLSearchParams();
    
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null && filters[key] !== 'all') {
        if (Array.isArray(filters[key])) {
          filters[key].forEach(value => params.append(key, value));
        } else {
          params.append(key, filters[key]);
        }
      }
    });

    return api.get(`/work-calendar/admin/enhanced-overview?${params.toString()}`);
  },

  /**
   * Advanced filtering with custom criteria
   */
  advancedFilter: async (filterData) => {
    return api.post('/work-calendar/admin/advanced-filter', filterData);
  },

  /**
   * Bulk operations for work entries
   */
  bulkOperations: async (operationData) => {
    return api.post('/work-calendar/admin/bulk-operations', operationData);
  },

  /**
   * Export work data in multiple formats with enhanced background processing
   */
  exportWorkData: async (exportData) => {
    // Check if this should be a background job or direct download
    if (exportData.backgroundProcessing !== false && exportData.entryCount > 100) {
      // Background processing - return job info
      return api.post('/work-calendar/admin/export', exportData);
    } else {
      // Direct download - return blob
      return api.post('/work-calendar/admin/export', exportData, {
        responseType: 'blob'
      });
    }
  },

  /**
   * Get export job status with enhanced tracking
   */
  getExportStatus: async (jobId) => {
    return api.get(`/work-calendar/admin/export/${jobId}`);
  },

  /**
   * Get all export jobs (monitoring)
   */
  getAllExportJobs: async () => {
    return api.get('/work-calendar/admin/export-jobs');
  },

  /**
   * Cancel export job
   */
  cancelExportJob: async (jobId) => {
    return api.delete(`/work-calendar/admin/export/${jobId}`);
  },

  /**
   * Download export file
   */
  downloadExportFile: async (filename) => {
    return api.get(`/exports/download/${filename}`, {
      responseType: 'blob'
    });
  },

  // ============================================
  // SLOT MANAGEMENT OPERATIONS
  // ============================================

  /**
   * Get available slots for a project
   */
  getAvailableSlots: async (projectId, filters = {}) => {
    const params = new URLSearchParams();
    
    Object.keys(filters).forEach(key => {
      if (filters[key] && filters[key] !== 'all') {
        params.append(key, filters[key]);
      }
    });

    return api.get(`/projects/${projectId}/slots/available?${params.toString()}`);
  },

  /**
   * Assign work item to slot
   */
  assignWorkItemToSlot: async (workItemId, slotId, assignedBy, options = {}) => {
    return api.post(`/slots/${slotId}/assign`, {
      workItemId,
      assignedBy,
      ...options
    });
  },

  /**
   * Release slot from work item
   */
  releaseSlotFromWorkItem: async (workItemId, releasedBy, reason = '') => {
    return api.post(`/work-items/${workItemId}/release-slot`, {
      releasedBy,
      reason
    });
  },

  /**
   * Complete a slot
   */
  completeSlot: async (slotId, completedBy, options = {}) => {
    return api.post(`/slots/${slotId}/complete`, {
      completedBy,
      ...options
    });
  },

  /**
   * Get project slot statistics
   */
  getProjectSlotStatistics: async (projectId) => {
    return api.get(`/projects/${projectId}/slot-statistics`);
  },

  /**
   * Detect slot conflicts for a project
   */
  detectSlotConflicts: async (projectId) => {
    return api.get(`/projects/${projectId}/slot-conflicts`);
  },

  /**
   * Resolve slot conflicts
   */
  resolveSlotConflicts: async (projectId, conflicts) => {
    return api.post(`/projects/${projectId}/resolve-slot-conflicts`, {
      conflicts
    });
  },

  /**
   * Bulk slot operations
   */
  bulkSlotOperations: async (operationData) => {
    return api.post('/work-calendar/admin/bulk-slot-operations', operationData);
  },

  /**
   * Get slot analytics for admin dashboard
   */
  getSlotAnalytics: async (filters = {}) => {
    const params = new URLSearchParams();
    
    Object.keys(filters).forEach(key => {
      if (filters[key] && filters[key] !== 'all') {
        params.append(key, filters[key]);
      }
    });

    return api.get(`/work-calendar/admin/slot-analytics?${params.toString()}`);
  },

  /**
   * Create slots for a project
   */
  createSlotsForProject: async (projectId, options = {}) => {
    return api.post(`/projects/${projectId}/create-slots`, options);
  },

  /**
   * Update project slot configuration
   */
  updateProjectSlotConfiguration: async (projectId, slotConfig) => {
    return api.put(`/projects/${projectId}/slot-configuration`, slotConfig);
  }
};

export default workCalendarApi;