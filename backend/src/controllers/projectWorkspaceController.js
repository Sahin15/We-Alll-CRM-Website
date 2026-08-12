/**
 * Project Workspace Controller
 * Handles project workspace data including work items, team, and statistics
 */

import Project from "../models/projectModel.js";
import WorkItem from "../models/workItemModel.js";
import ProjectExpectation from "../models/projectExpectationModel.js";
import ProjectCommitment from "../models/projectCommitmentModel.js";
import ProjectActivityLog from "../models/projectActivityLogModel.js";
import { getProjectStatistics, getTeamWorkload } from "../services/projectProgressService.js";
import { calculateMonthProgress } from "../services/projectMonthProgressService.js";
import { canUserViewProject } from "../services/resourceVisibilityService.js";

// @desc    Get project workspace data (overview)
// @route   GET /api/projects/:id/workspace
// @access  Private
export const getProjectWorkspace = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get project
    const project = await Project.findById(id)
      .populate("client", "name company email phone")
      .populate("department", "name")
      .populate("projectHead", "name email designation")
      .populate("assignedUsers", "name email designation")
      .populate("teamMembers.user", "name email role designation")
      .populate("teamMembers.assignedBy", "name email")
      .populate("createdBy", "name email");
    
    if (!project) {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Project not found" },
      });
    }
    
    // Check access
    const hasAccess = await canUserViewProject(req.user, project);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN", message: "Access denied" },
      });
    }

    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    
    // Get statistics with error handling
    let statistics = {
      total: 0,
      toDo: 0,
      inProgress: 0,
      review: 0,
      done: 0,
      overdue: 0,
      completionRate: 0,
      tasks: 0,
      content: 0,
      averageCompletionTime: 0
    };
    
    try {
      statistics = await getProjectStatistics(id);
    } catch (statError) {
      // Use default statistics on error
    }
    
    // Get team workload with error handling
    let teamWorkload = [];
    try {
      teamWorkload = await getTeamWorkload(id);
    } catch (workloadError) {
      // Use empty array on error
    }

    // Get live monthly progress
    let monthProgress = null;
    try {
      monthProgress = await calculateMonthProgress(id, currentMonthKey);
    } catch (mpError) {
      // Ignore if month progress fails
    }

    // Get expectations and commitments count
    let expectationsSummary = { total: 0, met: 0, open: 0 };
    let commitmentsCount = 0;
    try {
      const expectations = await ProjectExpectation.find({ project: id }).lean();
      expectationsSummary = {
        total: expectations.length,
        met: expectations.filter((e) => e.status === "met").length,
        open: expectations.filter((e) => e.status === "open" || e.status === "in_progress").length,
      };
      commitmentsCount = await ProjectCommitment.countDocuments({ project: id });
    } catch (expError) {
      // Ignore
    }

    // Get recent activities
    let recentActivities = [];
    try {
      recentActivities = await ProjectActivityLog.find({ project: id })
        .populate("actor", "name email avatar")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();
    } catch (actError) {
      // Ignore
    }
    
    res.status(200).json({
      success: true,
      data: {
        project,
        statistics,
        teamWorkload,
        monthProgress,
        expectationsSummary,
        commitmentsCount,
        recentActivities,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Failed to fetch project workspace",
        details: error.message
      },
    });
  }
};

// @desc    Get work items grouped by status (for kanban board)
// @route   GET /api/projects/:id/work-board
// @access  Private
export const getWorkBoard = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check project access
    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Project not found",
        },
      });
    }

    if (!canUserViewProject(req.user, project)) {
      return res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Access denied",
        },
      });
    }
    
    // Get all work items for the project
    const workItems = await WorkItem.find({ project: id })
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email")
      .sort({ dueDate: 1 });
    
    // Group by status
    const board = {
      "To Do": workItems.filter(item => item.status === "To Do"),
      "In Progress": workItems.filter(item => item.status === "In Progress"),
      "Review": workItems.filter(item => item.status === "Review"),
      "Done": workItems.filter(item => item.status === "Done"),
    };
    
    // Calculate counts
    const counts = {
      "To Do": board["To Do"].length,
      "In Progress": board["In Progress"].length,
      "Review": board["Review"].length,
      "Done": board["Done"].length,
      total: workItems.length,
    };
    
    res.status(200).json({
      success: true,
      data: {
        board,
        counts,
      },
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Failed to fetch work board",
        details: error.message,
      },
    });
  }
};

// @desc    Get project team with workload
// @route   GET /api/projects/:id/team
// @access  Private
export const getProjectTeam = async (req, res) => {
  try {
    const { id } = req.params;
    
    const project = await Project.findById(id)
      .populate("projectHead", "name email designation")
      .populate("assignedUsers", "name email designation")
      .populate("teamMembers.user", "name email role designation")
      .populate("teamMembers.assignedBy", "name email");
    
    if (!project) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Project not found",
        },
      });
    }
    
    // Get team workload
    const teamWorkload = await getTeamWorkload(id);
    
    res.status(200).json({
      success: true,
      data: {
        projectHead: project.projectHead,
        teamMembers: project.assignedUsers,
        workload: teamWorkload,
      },
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Failed to fetch project team",
        details: error.message,
      },
    });
  }
};

export default {
  getProjectWorkspace,
  getWorkBoard,
  getProjectTeam,
};
