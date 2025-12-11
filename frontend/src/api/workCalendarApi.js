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
   * Get work calendar analytics
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
  }
};

export default workCalendarApi;