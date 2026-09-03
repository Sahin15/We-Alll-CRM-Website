/**
 * Client Work Controller
 * Handles client-specific work tracking and reporting
 */

import Project from "../models/projectModel.js";
import WorkItem from "../models/workItemModel.js";
import Slot from '../models/slotModel.js';
import Client from '../models/clientModel.js';
import User from '../models/userModel.js';
import logger from '../utils/logger.js';
import {
  canUserViewClient,
  buildAssignedProjectQueryForUser,
} from '../services/resourceVisibilityService.js';

/**
 * Verify client exists and requester may view client work data.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {string} clientId
 * @returns {Promise<object|null>}
 */
async function requireClientWorkAccess(req, res, clientId) {
  const client = await Client.findById(clientId);
  if (!client) {
    res.status(404).json({
      success: false,
      message: 'Client not found',
    });
    return null;
  }

  const allowed = await canUserViewClient(req.user, clientId);
  if (!allowed) {
    res.status(403).json({
      success: false,
      message: 'Access denied. You can only view work for clients you are assigned to through projects.',
    });
    return null;
  }

  return client;
}

/**
 * Project IDs the user may see for a client.
 *
 * @param {object} user
 * @param {string} clientId
 * @returns {Promise<import('mongoose').Types.ObjectId[]>}
 */
async function getVisibleClientProjectIds(user, clientId) {
  const projects = await Project.find(buildAssignedProjectQueryForUser(user, { client: clientId }))
    .select('_id')
    .lean();
  return projects.map((project) => project._id);
}

/**
 * Get comprehensive work overview for a specific client
 * @route GET /api/clients/:clientId/work-overview
 */
export const getClientWorkOverview = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { 
      startDate, 
      endDate, 
      status, 
      projectId,
      includeDeleted = false 
    } = req.query;

    // Verify client exists and requester has access
    const client = await requireClientWorkAccess(req, res, clientId);
    if (!client) return;

    // Build date filter
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    // Projects visible to this user for the client
    const projectQuery = buildAssignedProjectQueryForUser(req.user, { client: clientId });
    const projects = await Project.find(projectQuery)
      .populate('departments', 'name')
      .populate('projectHead', 'name email')
      .populate('assignedUsers', 'name email role')
      .lean();

    if (projects.length === 0) {
      return res.json({
        success: true,
        data: {
          client,
          projects: [],
          workItems: [],
          slots: [],
          summary: {
            totalProjects: 0,
            totalWorkItems: 0,
            totalSlots: 0,
            completedSlots: 0,
            completionRate: 0
          }
        }
      });
    }

    const projectIds = projects.map(p => p._id);

    // Build work items query
    const workItemQuery = {
      project: { $in: projectIds },
      ...dateFilter
    };

    // Add status filter if provided
    if (status && status !== 'all') {
      workItemQuery.status = status;
    }

    // Add project filter if provided
    if (projectId && projectId !== 'all') {
      workItemQuery.project = projectId;
    }

    // Include or exclude deleted items
    if (!includeDeleted) {
      workItemQuery.isDeleted = { $ne: true };
    }

    // Get work items with detailed information
    const workItems = await WorkItem.find(workItemQuery)
      .populate('project', 'name')
      .populate('assignedTo', 'name email role')
      .populate('createdBy', 'name email')
      .populate('slotAssignment.assignedSlot')
      .sort({ createdAt: -1 })
      .lean();

    // Get slots for all projects
    const slots = await Slot.find({ 
      project: { $in: projectIds },
      ...dateFilter
    })
      .populate('project', 'name')
      .populate('assignedTo', 'name email role')
      .populate('createdBy', 'name email')
      .populate('assignedWorkItem', 'title status')
      .sort({ slotNumber: 1 })
      .lean();

    // Calculate summary statistics
    const totalSlots = slots.length;
    const completedSlots = slots.filter(slot => 
      slot.assignmentStatus === 'completed' || 
      slot.completionStatus?.isCompleted
    ).length;
    const completionRate = totalSlots > 0 ? Math.round((completedSlots / totalSlots) * 100) : 0;

    // Group work items by project
    const workItemsByProject = workItems.reduce((acc, item) => {
      const projectId = item.project._id.toString();
      if (!acc[projectId]) {
        acc[projectId] = [];
      }
      acc[projectId].push(item);
      return acc;
    }, {});

    // Group slots by project
    const slotsByProject = slots.reduce((acc, slot) => {
      const projectId = slot.project._id.toString();
      if (!acc[projectId]) {
        acc[projectId] = [];
      }
      acc[projectId].push(slot);
      return acc;
    }, {});

    // Enhance projects with work data
    const enhancedProjects = projects.map(project => {
      const projectId = project._id.toString();
      const projectWorkItems = workItemsByProject[projectId] || [];
      const projectSlots = slotsByProject[projectId] || [];
      
      const projectCompletedSlots = projectSlots.filter(slot => 
        slot.assignmentStatus === 'completed' || 
        slot.completionStatus?.isCompleted
      ).length;
      
      return {
        ...project,
        workItems: projectWorkItems,
        slots: projectSlots,
        statistics: {
          totalWorkItems: projectWorkItems.length,
          completedWorkItems: projectWorkItems.filter(item => item.status === 'Done').length,
          totalSlots: projectSlots.length,
          completedSlots: projectCompletedSlots,
          slotCompletionRate: projectSlots.length > 0 ? 
            Math.round((projectCompletedSlots / projectSlots.length) * 100) : 0
        }
      };
    });

    res.json({
      success: true,
      data: {
        client,
        projects: enhancedProjects,
        workItems,
        slots,
        summary: {
          totalProjects: projects.length,
          totalWorkItems: workItems.length,
          totalSlots,
          completedSlots,
          completionRate,
          activeProjects: projects.filter(p => p.status !== 'Completed').length,
          completedProjects: projects.filter(p => p.status === 'Completed').length
        }
      }
    });

  } catch (error) {
    logger.error('Error in getClientWorkOverview:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get client work overview',
      error: error.message
    });
  }
};

/**
 * Get detailed slot information for a client
 * @route GET /api/clients/:clientId/slots
 */
export const getClientSlots = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { 
      projectId, 
      status, 
      assignedTo,
      startDate,
      endDate,
      page = 1,
      limit = 50
    } = req.query;

    const client = await requireClientWorkAccess(req, res, clientId);
    if (!client) return;

    const projectIds = await getVisibleClientProjectIds(req.user, clientId);

    if (projectIds.length === 0) {
      return res.json({
        success: true,
        data: {
          slots: [],
          pagination: { page: 1, limit, total: 0, pages: 0 }
        }
      });
    }

    // Build query
    const query = { project: { $in: projectIds } };

    if (projectId && projectId !== 'all') {
      query.project = projectId;
    }

    if (status && status !== 'all') {
      query.assignmentStatus = status;
    }

    if (assignedTo && assignedTo !== 'all') {
      query.assignedTo = assignedTo;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Get total count
    const total = await Slot.countDocuments(query);

    // Get slots with pagination
    const slots = await Slot.find(query)
      .populate('project', 'name client')
      .populate('assignedTo', 'name email role')
      .populate('createdBy', 'name email')
      .populate('assignedWorkItem', 'title status type')
      .populate('completionStatus.completedBy', 'name email')
      .sort({ 'project': 1, slotNumber: 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    res.json({
      success: true,
      data: {
        slots,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    logger.error('Error in getClientSlots:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get client slots',
      error: error.message
    });
  }
};

/**
 * Get client work timeline
 * @route GET /api/clients/:clientId/timeline
 */
export const getClientWorkTimeline = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { 
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      endDate = new Date(),
      limit = 100
    } = req.query;

    const client = await requireClientWorkAccess(req, res, clientId);
    if (!client) return;

    const projectIds = await getVisibleClientProjectIds(req.user, clientId);

    if (projectIds.length === 0) {
      return res.json({
        success: true,
        data: { timeline: [] }
      });
    }

    // Get work items timeline
    const workItemsTimeline = await WorkItem.aggregate([
      {
        $match: {
          project: { $in: projectIds },
          createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
          isDeleted: { $ne: true }
        }
      },
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
          from: 'users',
          localField: 'assignedTo',
          foreignField: '_id',
          as: 'assignedToInfo'
        }
      },
      {
        $addFields: {
          eventType: 'work_item_created',
          eventDate: '$createdAt',
          project: { $arrayElemAt: ['$projectInfo', 0] },
          assignedTo: { $arrayElemAt: ['$assignedToInfo', 0] }
        }
      },
      {
        $project: {
          eventType: 1,
          eventDate: 1,
          title: 1,
          status: 1,
          type: 1,
          project: { _id: 1, name: 1 },
          assignedTo: { _id: 1, name: 1, email: 1 },
          completedAt: 1
        }
      }
    ]);

    // Get slot completion timeline
    const slotsTimeline = await Slot.aggregate([
      {
        $match: {
          project: { $in: projectIds },
          'completionStatus.completedAt': { 
            $gte: new Date(startDate), 
            $lte: new Date(endDate) 
          }
        }
      },
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
          from: 'users',
          localField: 'completionStatus.completedBy',
          foreignField: '_id',
          as: 'completedByInfo'
        }
      },
      {
        $addFields: {
          eventType: 'slot_completed',
          eventDate: '$completionStatus.completedAt',
          project: { $arrayElemAt: ['$projectInfo', 0] },
          completedBy: { $arrayElemAt: ['$completedByInfo', 0] }
        }
      },
      {
        $project: {
          eventType: 1,
          eventDate: 1,
          slotNumber: 1,
          title: 1,
          slotIdentifier: 1,
          project: { _id: 1, name: 1 },
          completedBy: { _id: 1, name: 1, email: 1 },
          completionStatus: 1
        }
      }
    ]);

    // Combine and sort timeline
    const timeline = [...workItemsTimeline, ...slotsTimeline]
      .sort((a, b) => new Date(b.eventDate) - new Date(a.eventDate))
      .slice(0, limit);

    res.json({
      success: true,
      data: { timeline }
    });

  } catch (error) {
    logger.error('Error in getClientWorkTimeline:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get client work timeline',
      error: error.message
    });
  }
};

/**
 * Get client work statistics
 * @route GET /api/clients/:clientId/statistics
 */
export const getClientWorkStatistics = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { 
      period = '30d' // 7d, 30d, 90d, 1y
    } = req.query;

    const client = await requireClientWorkAccess(req, res, clientId);
    if (!client) return;

    // Calculate date range based on period
    const now = new Date();
    let startDate;
    
    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default: // 30d
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get client projects visible to this user
    const projects = await Project.find(buildAssignedProjectQueryForUser(req.user, { client: clientId }))
      .select('_id name status')
      .lean();
    const projectIds = projects.map(p => p._id);

    if (projectIds.length === 0) {
      return res.json({
        success: true,
        data: {
          projects: { total: 0, active: 0, completed: 0 },
          workItems: { total: 0, completed: 0, inProgress: 0, pending: 0 },
          slots: { total: 0, completed: 0, assigned: 0, available: 0 },
          productivity: { completionRate: 0, averageCompletionTime: 0 }
        }
      });
    }

    // Project statistics
    const projectStats = {
      total: projects.length,
      active: projects.filter(p => p.status === 'In Progress').length,
      completed: projects.filter(p => p.status === 'Completed').length,
      pending: projects.filter(p => p.status === 'Pending').length
    };

    // Work item statistics
    const workItemStats = await WorkItem.aggregate([
      {
        $match: {
          project: { $in: projectIds },
          createdAt: { $gte: startDate },
          isDeleted: { $ne: true }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const workItems = {
      total: workItemStats.reduce((sum, stat) => sum + stat.count, 0),
      completed: workItemStats.find(s => s._id === 'Done')?.count || 0,
      inProgress: workItemStats.find(s => s._id === 'In Progress')?.count || 0,
      pending: workItemStats.find(s => s._id === 'To Do')?.count || 0,
      review: workItemStats.find(s => s._id === 'Review')?.count || 0
    };

    // Slot statistics
    const slotStats = await Slot.aggregate([
      {
        $match: {
          project: { $in: projectIds },
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$assignmentStatus',
          count: { $sum: 1 }
        }
      }
    ]);

    const slots = {
      total: slotStats.reduce((sum, stat) => sum + stat.count, 0),
      completed: slotStats.find(s => s._id === 'completed')?.count || 0,
      assigned: slotStats.find(s => s._id === 'assigned')?.count || 0,
      available: slotStats.find(s => s._id === 'available')?.count || 0
    };

    // Productivity metrics
    const completionRate = workItems.total > 0 ? 
      Math.round((workItems.completed / workItems.total) * 100) : 0;

    // Calculate average completion time
    const completedWorkItems = await WorkItem.find({
      project: { $in: projectIds },
      status: 'Done',
      completedAt: { $gte: startDate },
      isDeleted: { $ne: true }
    }).select('createdAt completedAt');

    const averageCompletionTime = completedWorkItems.length > 0 ?
      completedWorkItems.reduce((sum, item) => {
        const completionTime = (new Date(item.completedAt) - new Date(item.createdAt)) / (1000 * 60 * 60 * 24);
        return sum + completionTime;
      }, 0) / completedWorkItems.length : 0;

    res.json({
      success: true,
      data: {
        projects: projectStats,
        workItems,
        slots,
        productivity: {
          completionRate,
          averageCompletionTime: Math.round(averageCompletionTime * 10) / 10 // Round to 1 decimal
        },
        period,
        dateRange: { startDate, endDate: now }
      }
    });

  } catch (error) {
    logger.error('Error in getClientWorkStatistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get client work statistics',
      error: error.message
    });
  }
};

export default {
  getClientWorkOverview,
  getClientSlots,
  getClientWorkTimeline,
  getClientWorkStatistics
};