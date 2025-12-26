import api from '../services/api';

/**
 * Optimized Dashboard API
 * Single endpoint to fetch all dashboard data efficiently
 */
export const dashboardApi = {
  /**
   * Get dashboard overview data
   * @param {Object} options - Query options
   * @returns {Promise} Dashboard data
   */
  getDashboardOverview: async (options = {}) => {
    const params = new URLSearchParams({
      sections: options.sections?.join(',') || 'all',
      timeRange: options.timeRange || 'today',
      includeCharts: options.includeCharts || false,
      ...options
    });

    const response = await api.get(`/dashboard/overview?${params}`);
    return response.data;
  },

  /**
   * Get real-time metrics (lightweight)
   */
  getRealTimeMetrics: async () => {
    const response = await api.get('/dashboard/metrics/realtime');
    return response.data;
  },

  /**
   * Get attendance summary for today
   */
  getTodayAttendance: async () => {
    const response = await api.get('/dashboard/attendance/today');
    return response.data;
  },

  /**
   * Get pending approvals count
   */
  getPendingApprovals: async () => {
    const response = await api.get('/dashboard/approvals/pending');
    return response.data;
  },

  /**
   * Get system health status
   */
  getSystemHealth: async () => {
    const response = await api.get('/dashboard/health');
    return response.data;
  },

  /**
   * Get analytics data for charts
   */
  getAnalyticsData: async (chartType, timeRange = '30d') => {
    const response = await api.get(`/dashboard/analytics/${chartType}?range=${timeRange}`);
    return response.data;
  }
};

export default dashboardApi;