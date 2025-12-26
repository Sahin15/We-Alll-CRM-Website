import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import dashboardApi from '../api/dashboardApi';
import toast from '../utils/toast';

/**
 * Custom hook for dashboard data management
 * Implements caching, error handling, and real-time updates
 */
export const useDashboard = (options = {}) => {
  const queryClient = useQueryClient();
  const [realTimeEnabled, setRealTimeEnabled] = useState(true);

  // Main dashboard data query
  const {
    data: dashboardData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['dashboard', 'overview', options],
    queryFn: () => dashboardApi.getDashboardOverview(options),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: 2,
    onError: (error) => {
      console.error('Dashboard data fetch error:', error);
      toast.error('Failed to load dashboard data');
    }
  });

  // Real-time metrics query (lighter weight, more frequent)
  const {
    data: realTimeMetrics,
    isLoading: metricsLoading
  } = useQuery({
    queryKey: ['dashboard', 'realtime'],
    queryFn: dashboardApi.getRealTimeMetrics,
    enabled: realTimeEnabled,
    refetchInterval: 30000, // 30 seconds
    staleTime: 25000, // 25 seconds
    retry: 1
  });

  // Today's attendance query
  const {
    data: todayAttendance,
    isLoading: attendanceLoading,
    refetch: refetchAttendance
  } = useQuery({
    queryKey: ['dashboard', 'attendance', 'today'],
    queryFn: dashboardApi.getTodayAttendance,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 2
  });

  // Pending approvals query
  const {
    data: pendingApprovals,
    isLoading: approvalsLoading,
    refetch: refetchApprovals
  } = useQuery({
    queryKey: ['dashboard', 'approvals', 'pending'],
    queryFn: dashboardApi.getPendingApprovals,
    staleTime: 1 * 60 * 1000, // 1 minute
    retry: 2
  });

  // System health query
  const {
    data: systemHealth,
    isLoading: healthLoading
  } = useQuery({
    queryKey: ['dashboard', 'health'],
    queryFn: dashboardApi.getSystemHealth,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1
  });

  // Refresh all dashboard data
  const refreshDashboard = useCallback(async () => {
    try {
      await Promise.all([
        refetch(),
        refetchAttendance(),
        refetchApprovals(),
        queryClient.invalidateQueries(['dashboard'])
      ]);
      toast.success('Dashboard refreshed');
    } catch (error) {
      toast.error('Failed to refresh dashboard');
    }
  }, [refetch, refetchAttendance, refetchApprovals, queryClient]);

  // Toggle real-time updates
  const toggleRealTime = useCallback(() => {
    setRealTimeEnabled(prev => !prev);
  }, []);

  // Get analytics data with caching
  const getAnalytics = useCallback(async (chartType, timeRange) => {
    try {
      const data = await queryClient.fetchQuery({
        queryKey: ['dashboard', 'analytics', chartType, timeRange],
        queryFn: () => dashboardApi.getAnalyticsData(chartType, timeRange),
        staleTime: 10 * 60 * 1000, // 10 minutes
      });
      return data;
    } catch (error) {
      toast.error(`Failed to load ${chartType} analytics`);
      throw error;
    }
  }, [queryClient]);

  // Combined loading state
  const isAnyLoading = isLoading || metricsLoading || attendanceLoading || approvalsLoading || healthLoading;

  // Combined data object
  const combinedData = {
    ...dashboardData,
    realTimeMetrics,
    todayAttendance,
    pendingApprovals,
    systemHealth
  };

  return {
    // Data
    data: combinedData,
    dashboardData,
    realTimeMetrics,
    todayAttendance,
    pendingApprovals,
    systemHealth,
    
    // Loading states
    isLoading: isAnyLoading,
    isInitialLoading: isLoading,
    metricsLoading,
    attendanceLoading,
    approvalsLoading,
    healthLoading,
    
    // Error handling
    error,
    
    // Actions
    refreshDashboard,
    refetchAttendance,
    refetchApprovals,
    getAnalytics,
    
    // Real-time controls
    realTimeEnabled,
    toggleRealTime
  };
};

export default useDashboard;