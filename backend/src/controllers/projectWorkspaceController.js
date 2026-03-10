/**
 * Project Workspace Controller
 * Handles project workspace data including work items, team, and statistics
 */

import Project from "../models/projectModel.js";
import WorkItem from "../models/workItemModel.js";
import { getProjectStatistics, getTeamWorkload } from "../services/projectProgressService.js";

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
    const isProjectHead = project.projectHead?._id?.toString() === req.user._id.toString();
    const isTeamMember = project.assignedUsers?.some(
      user => user._id.toString() === req.user._id.toString()
    );
    const isAdmin = ["admin", "superadmin", "hod", "hr", "manager"].includes(req.user.role);
    
    if (!isProjectHead && !isTeamMember && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN", message: "Access denied" },
      });
    }
    
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
    
    res.status(200).json({
      success: true,
      data: { project, statistics, teamWorkload },
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
    console.error("Error fetching work board:", error);
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
    console.error("Error fetching project team:", error);
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
