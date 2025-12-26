import WorkCalendar from '../models/workCalendarModel.js';
import WorkItem from '../models/workItemModel.js';
import Project from '../models/projectModel.js';
import Client from '../models/clientModel.js';
import User from '../models/userModel.js';
import Department from '../models/departmentModel.js';
import logger from '../utils/logger.js';

/**
 * Analytics Calculation Engine with Client Grouping
 * Provides comprehensive analytics calculations with caching and real-time updates
 * 
 * Features:
 * - Client-focused analytics (primary feature)
 * - Real-time calculation updates
 * - Performance optimization with aggregation pipelines
 * - Caching for frequently accessed metrics
 * - Trend analysis and forecasting
 * - Workload distribution analysis
 */
class AnalyticsEngine {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 2 * 60 * 1000; // 2 minutes
    this.subscribers = new Set();
  }

  /**
   * Calculate comprehensive analytics with client focus
   */
  async calculateComprehensiveAnalytics(filters = {}) {
    try {
      const cacheKey = this.generateCacheKey('comprehensive', filters);
      const cached = this.getFromCache(cacheKey);
      
      if (cached) {
        return cached;
      }

      // Build MongoDB aggregation pipeline
      const matchStage = await this.buildMatchStage(filters);
      
      // Execute parallel aggregations for performance
      const [
        overallMetrics,
        clientAnalytics,
        projectAnalytics,
        employeeAnalytics,
        departmentAnalytics,
        timeSeriesData,
        workloadDistribution,
        trendAnalysis
      ] = await Promise.all([
        this.calculateOverallMetrics(matchStage),
        this.calculateClientAnalytics(matchStage),
        this.calculateProjectAnalytics(matchStage),
        this.calculateEmployeeAnalytics(matchStage),
        this.calculateDepartmentAnalytics(matchStage),
        this.calculateTimeSeriesData(matchStage),
        this.calculateWorkloadDistribution(matchStage),
        this.calculateTrendAnalysis(matchStage)
      ]);

      const analytics = {
        overall: overallMetrics,
        byClient: clientAnalytics,
        byProject: projectAnalytics,
        byEmployee: employeeAnalytics,
        byDepartment: departmentAnalytics,
        timeSeries: timeSeriesData,
        workloadDistribution,
        trends: trendAnalysis,
        metadata: {
          calculatedAt: new Date(),
          filters,
          cacheKey
        }
      };

      // Cache the results
      this.setCache(cacheKey, analytics);
      
      // Notify subscribers of update
      this.notifySubscribers('analytics_calculated', analytics);

      return analytics;

    } catch (error) {
      logger.error('Error calculating comprehensive analytics:', error);
      throw error;
    }
  }

  /**
   * Calculate overall metrics
   */
  async calculateOverallMetrics(matchStage) {
    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalWork: { $sum: 1 },
          completedWork: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          inProgressWork: { $sum: { $cond: [{ $eq: ['$status', 'in-progress'] }, 1, 0] } },
          scheduledWork: { $sum: { $cond: [{ $eq: ['$status', 'scheduled'] }, 1, 0] } },
          overdueWork: { $sum: { $cond: [{ $eq: ['$status', 'overdue'] }, 1, 0] } },
          cancelledWork: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
          totalEstimatedHours: { $sum: '$timeTracking.estimatedHours' },
          totalActualHours: { $sum: '$timeTracking.actualHours' },
          avgProgress: { $avg: '$progress' },
          urgentWork: { $sum: { $cond: [{ $eq: ['$priority', 'urgent'] }, 1, 0] } },
          highPriorityWork: { $sum: { $cond: [{ $eq: ['$priority', 'high'] }, 1, 0] } }
        }
      },
      {
        $addFields: {
          completionRate: {
            $cond: [
              { $gt: ['$totalWork', 0] },
              { $multiply: [{ $divide: ['$completedWork', '$totalWork'] }, 100] },
              0
            ]
          },
          overdueRate: {
            $cond: [
              { $gt: ['$totalWork', 0] },
              { $multiply: [{ $divide: ['$overdueWork', '$totalWork'] }, 100] },
              0
            ]
          },
          efficiency: {
            $cond: [
              { $gt: ['$totalEstimatedHours', 0] },
              { $multiply: [{ $divide: ['$totalActualHours', '$totalEstimatedHours'] }, 100] },
              0
            ]
          }
        }
      }
    ];

    const result = await WorkCalendar.aggregate(pipeline);
    return result[0] || {
      totalWork: 0,
      completedWork: 0,
      inProgressWork: 0,
      scheduledWork: 0,
      overdueWork: 0,
      cancelledWork: 0,
      totalEstimatedHours: 0,
      totalActualHours: 0,
      avgProgress: 0,
      urgentWork: 0,
      highPriorityWork: 0,
      completionRate: 0,
      overdueRate: 0,
      efficiency: 0
    };
  }

  /**
   * Calculate client-focused analytics (primary feature)
   */
  async calculateClientAnalytics(matchStage) {
    const pipeline = [
      { $match: matchStage },
      {
        $lookup: {
          from: 'clients',
          localField: 'client',
          foreignField: '_id',
          as: 'clientInfo'
        }
      },
      {
        $addFields: {
          clientInfo: {
            $cond: [
              { $eq: [{ $size: '$clientInfo' }, 0] },
              [{ _id: null, name: 'Internal Work', company: 'Internal' }],
              '$clientInfo'
            ]
          }
        }
      },
      { $unwind: '$clientInfo' },
      {
        $group: {
          _id: '$clientInfo._id',
          clientName: { $first: '$clientInfo.name' },
          clientCompany: { $first: '$clientInfo.company' },
          totalWork: { $sum: 1 },
          completedWork: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          inProgressWork: { $sum: { $cond: [{ $eq: ['$status', 'in-progress'] }, 1, 0] } },
          overdueWork: { $sum: { $cond: [{ $eq: ['$status', 'overdue'] }, 1, 0] } },
          totalHours: { $sum: '$timeTracking.estimatedHours' },
          actualHours: { $sum: '$timeTracking.actualHours' },
          avgProgress: { $avg: '$progress' },
          urgentWork: { $sum: { $cond: [{ $eq: ['$priority', 'urgent'] }, 1, 0] } },
          highPriorityWork: { $sum: { $cond: [{ $eq: ['$priority', 'high'] }, 1, 0] } }
        }
      },
      {
        $addFields: {
          completionRate: {
            $cond: [
              { $gt: ['$totalWork', 0] },
              { $round: [{ $multiply: [{ $divide: ['$completedWork', '$totalWork'] }, 100] }, 1] },
              0
            ]
          },
          efficiency: {
            $cond: [
              { $gt: ['$totalHours', 0] },
              { $round: [{ $multiply: [{ $divide: ['$actualHours', '$totalHours'] }, 100] }, 1] },
              0
            ]
          },
          workloadScore: {
            $add: [
              { $multiply: ['$urgentWork', 4] },
              { $multiply: ['$highPriorityWork', 2] },
              '$totalWork'
            ]
          }
        }
      },
      { $sort: { totalWork: -1 } },
      { $limit: 20 } // Top 20 clients
    ];

    return await WorkCalendar.aggregate(pipeline);
  }

  /**
   * Calculate project analytics
   */
  async calculateProjectAnalytics(matchStage) {
    const pipeline = [
      { $match: matchStage },
      {
        $lookup: {
          from: 'projects',
          localField: 'project',
          foreignField: '_id',
          as: 'projectInfo'
        }
      },
      {
        $lookup: {
          from: 'clients',
          localField: 'client',
          foreignField: '_id',
          as: 'clientInfo'
        }
      },
      {
        $addFields: {
          projectInfo: {
            $cond: [
              { $eq: [{ $size: '$projectInfo' }, 0] },
              [{ _id: null, name: 'No Project' }],
              '$projectInfo'
            ]
          }
        }
      },
      { $unwind: '$projectInfo' },
      { $unwind: { path: '$clientInfo', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$projectInfo._id',
          projectName: { $first: '$projectInfo.name' },
          clientName: { $first: '$clientInfo.name' },
          totalWork: { $sum: 1 },
          completedWork: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          overdueWork: { $sum: { $cond: [{ $eq: ['$status', 'overdue'] }, 1, 0] } },
          totalHours: { $sum: '$timeTracking.estimatedHours' },
          actualHours: { $sum: '$timeTracking.actualHours' },
          avgProgress: { $avg: '$progress' }
        }
      },
      {
        $addFields: {
          completionRate: {
            $cond: [
              { $gt: ['$totalWork', 0] },
              { $round: [{ $multiply: [{ $divide: ['$completedWork', '$totalWork'] }, 100] }, 1] },
              0
            ]
          }
        }
      },
      { $sort: { totalWork: -1 } },
      { $limit: 15 }
    ];

    return await WorkCalendar.aggregate(pipeline);
  }

  /**
   * Calculate employee analytics
   */
  async calculateEmployeeAnalytics(matchStage) {
    const pipeline = [
      { $match: matchStage },
      {
        $lookup: {
          from: 'users',
          localField: 'assignedTo',
          foreignField: '_id',
          as: 'employeeInfo'
        }
      },
      { $unwind: '$employeeInfo' },
      {
        $group: {
          _id: '$employeeInfo._id',
          employeeName: { $first: '$employeeInfo.name' },
          employeeRole: { $first: '$employeeInfo.role' },
          totalWork: { $sum: 1 },
          completedWork: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          overdueWork: { $sum: { $cond: [{ $eq: ['$status', 'overdue'] }, 1, 0] } },
          totalHours: { $sum: '$timeTracking.estimatedHours' },
          actualHours: { $sum: '$timeTracking.actualHours' },
          avgProgress: { $avg: '$progress' }
        }
      },
      {
        $addFields: {
          efficiency: {
            $cond: [
              { $gt: ['$totalWork', 0] },
              { $round: [{ $multiply: [{ $divide: ['$completedWork', '$totalWork'] }, 100] }, 1] },
              0
            ]
          },
          workloadScore: {
            $add: ['$totalWork', { $multiply: ['$overdueWork', 2] }]
          }
        }
      },
      { $sort: { totalWork: -1 } },
      { $limit: 15 }
    ];

    return await WorkCalendar.aggregate(pipeline);
  }

  /**
   * Calculate department analytics
   */
  async calculateDepartmentAnalytics(matchStage) {
    const pipeline = [
      { $match: matchStage },
      {
        $lookup: {
          from: 'departments',
          localField: 'department',
          foreignField: '_id',
          as: 'departmentInfo'
        }
      },
      { $unwind: '$departmentInfo' },
      {
        $group: {
          _id: '$departmentInfo._id',
          departmentName: { $first: '$departmentInfo.name' },
          totalWork: { $sum: 1 },
          completedWork: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          overdueWork: { $sum: { $cond: [{ $eq: ['$status', 'overdue'] }, 1, 0] } },
          totalHours: { $sum: '$timeTracking.estimatedHours' },
          actualHours: { $sum: '$timeTracking.actualHours' }
        }
      },
      {
        $addFields: {
          efficiency: {
            $cond: [
              { $gt: ['$totalHours', 0] },
              { $round: [{ $multiply: [{ $divide: ['$actualHours', '$totalHours'] }, 100] }, 1] },
              0
            ]
          }
        }
      },
      { $sort: { totalWork: -1 } }
    ];

    return await WorkCalendar.aggregate(pipeline);
  }

  /**
   * Calculate time series data for trend analysis
   */
  async calculateTimeSeriesData(matchStage) {
    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: {
            year: { $year: '$startDate' },
            month: { $month: '$startDate' },
            day: { $dayOfMonth: '$startDate' }
          },
          date: { $first: { $dateToString: { format: '%Y-%m-%d', date: '$startDate' } } },
          totalWork: { $sum: 1 },
          completedWork: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          overdueWork: { $sum: { $cond: [{ $eq: ['$status', 'overdue'] }, 1, 0] } },
          totalHours: { $sum: '$timeTracking.estimatedHours' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
      { $limit: 30 } // Last 30 days
    ];

    return await WorkCalendar.aggregate(pipeline);
  }

  /**
   * Calculate workload distribution
   */
  async calculateWorkloadDistribution(matchStage) {
    const priorityPipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 },
          totalHours: { $sum: '$timeTracking.estimatedHours' }
        }
      }
    ];

    const statusPipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalHours: { $sum: '$timeTracking.estimatedHours' }
        }
      }
    ];

    const workTypePipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: '$workType',
          count: { $sum: 1 },
          totalHours: { $sum: '$timeTracking.estimatedHours' }
        }
      }
    ];

    const [byPriority, byStatus, byWorkType] = await Promise.all([
      WorkCalendar.aggregate(priorityPipeline),
      WorkCalendar.aggregate(statusPipeline),
      WorkCalendar.aggregate(workTypePipeline)
    ]);

    return {
      byPriority: this.formatDistributionData(byPriority),
      byStatus: this.formatDistributionData(byStatus),
      byWorkType: this.formatDistributionData(byWorkType)
    };
  }

  /**
   * Calculate trend analysis
   */
  async calculateTrendAnalysis(matchStage) {
    // Get data for last 7 days and previous 7 days for comparison
    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const previous7Days = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const currentPeriodMatch = {
      ...matchStage,
      startDate: { $gte: last7Days, $lte: now }
    };

    const previousPeriodMatch = {
      ...matchStage,
      startDate: { $gte: previous7Days, $lt: last7Days }
    };

    const [currentMetrics, previousMetrics] = await Promise.all([
      this.calculateOverallMetrics(currentPeriodMatch),
      this.calculateOverallMetrics(previousPeriodMatch)
    ]);

    return {
      current: currentMetrics,
      previous: previousMetrics,
      trends: {
        totalWork: this.calculateTrend(currentMetrics.totalWork, previousMetrics.totalWork),
        completionRate: this.calculateTrend(currentMetrics.completionRate, previousMetrics.completionRate),
        overdueRate: this.calculateTrend(currentMetrics.overdueRate, previousMetrics.overdueRate),
        efficiency: this.calculateTrend(currentMetrics.efficiency, previousMetrics.efficiency)
      }
    };
  }

  /**
   * Build match stage for aggregation pipeline
   */
  async buildMatchStage(filters) {
    const match = {};

    // Date range filter
    if (filters.startDate && filters.endDate) {
      const start = new Date(filters.startDate);
      const end = new Date(filters.endDate);
      
      match.$or = [
        { startDate: { $gte: start, $lte: end } },
        { endDate: { $gte: start, $lte: end } },
        { $and: [{ startDate: { $lte: start } }, { endDate: { $gte: end } }] }
      ];
    }

    // Entity filters
    if (filters.client && filters.client !== 'all') {
      match.client = filters.client;
    }
    if (filters.project && filters.project !== 'all') {
      match.project = filters.project;
    }
    if (filters.employee && filters.employee !== 'all') {
      match.assignedTo = filters.employee;
    }
    if (filters.department && filters.department !== 'all') {
      match.department = filters.department;
    }

    // Classification filters
    if (filters.status && filters.status !== 'all') {
      match.status = filters.status;
    }
    if (filters.priority && filters.priority !== 'all') {
      match.priority = filters.priority;
    }
    if (filters.workType && filters.workType !== 'all') {
      match.workType = filters.workType;
    }

    // Search filter
    if (filters.search && filters.search.trim()) {
      const searchRegex = new RegExp(filters.search.trim(), 'i');
      match.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { tags: { $in: [searchRegex] } }
      ];
    }

    return match;
  }

  /**
   * Format distribution data for charts
   */
  formatDistributionData(data) {
    return data.map(item => ({
      name: item._id || 'Unknown',
      value: item.count,
      hours: item.totalHours || 0,
      percentage: 0 // Will be calculated by frontend
    }));
  }

  /**
   * Calculate trend percentage
   */
  calculateTrend(current, previous) {
    if (!previous || previous === 0) {
      return { change: 0, direction: 'stable', percentage: 0 };
    }

    const change = current - previous;
    const percentage = Math.round((change / previous) * 100);

    return {
      change,
      direction: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
      percentage: Math.abs(percentage)
    };
  }

  /**
   * Cache management
   */
  generateCacheKey(type, filters) {
    return `${type}_${JSON.stringify(filters)}_${Math.floor(Date.now() / this.cacheTimeout)}`;
  }

  getFromCache(key) {
    const entry = this.cache.get(key);
    if (entry && Date.now() - entry.timestamp < this.cacheTimeout) {
      return entry.data;
    }
    return null;
  }

  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });

    // Cleanup old cache entries
    if (this.cache.size > 100) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      // Remove oldest 20 entries
      entries.slice(0, 20).forEach(([key]) => {
        this.cache.delete(key);
      });
    }
  }

  /**
   * Real-time update notifications
   */
  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  notifySubscribers(event, data) {
    this.subscribers.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('Error notifying analytics subscriber:', error);
      }
    });
  }

  /**
   * Invalidate cache for specific filters
   */
  invalidateCache(filterPattern) {
    const keysToDelete = [];
    
    for (const [key] of this.cache.entries()) {
      if (!filterPattern || key.includes(filterPattern)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
    logger.info(`Invalidated ${keysToDelete.length} analytics cache entries`);
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      subscribers: this.subscribers.size,
      oldestEntry: this.cache.size > 0 ? 
        Math.min(...Array.from(this.cache.values()).map(entry => entry.timestamp)) : null
    };
  }
}

// Export singleton instance
export const analyticsEngine = new AnalyticsEngine();
export default analyticsEngine;