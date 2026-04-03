/**
 * Project Progress Service
 * Handles automatic calculation and updating of project progress based on work items
 */

import WorkItem from "../models/workItemModel.js";
import Project from "../models/projectModel.js";

/**
 * Calculate project progress based on work items
 * @param {string} projectId - Project ID
 * @returns {Promise<number>} - Progress percentage (0-100)
 */
export const calculateProjectProgress = async (projectId) => {
  try {
    // Get all work items for the project
    const workItems = await WorkItem.find({ project: projectId });
    
    if (workItems.length === 0) {
      return 0;
    }
    
    // Count completed work items
    const completedCount = workItems.filter(item => item.status === "Done").length;
    
    // Calculate percentage
    const progress = Math.round((completedCount / workItems.length) * 100);
    
    return progress;
  } catch (error) {
    
    throw error;
  }
};

/**
 * Update project progress
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} - Updated project
 */
export const updateProjectProgress = async (projectId) => {
  try {
    // Calculate new progress
    const progress = await calculateProjectProgress(projectId);
    
    // Update project
    const project = await Project.findByIdAndUpdate(
      projectId,
      { progress },
      { new: true }
    );
    
    // Auto-update project status based on progress
    if (progress === 100 && project.status !== "Completed") {
      project.status = "Completed";
      await project.save();
    } else if (progress > 0 && progress < 100 && project.status === "Pending") {
      project.status = "In Progress";
      await project.save();
    }
    
    return project;
  } catch (error) {
    
    throw error;
  }
};

/**
 * Get project statistics
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} - Project statistics
 */
export const getProjectStatistics = async (projectId) => {
  try {
    const workItems = await WorkItem.find({ project: projectId });
    
    const stats = {
      total: workItems.length,
      toDo: workItems.filter(item => item.status === "To Do").length,
      inProgress: workItems.filter(item => item.status === "In Progress").length,
      review: workItems.filter(item => item.status === "Review").length,
      done: workItems.filter(item => item.status === "Done").length,
      overdue: workItems.filter(item => {
        if (item.status === "Done") return false;
        return item.dueDate && new Date(item.dueDate) < new Date();
      }).length,
      progress: await calculateProjectProgress(projectId),
    };
    
    // Calculate by type
    stats.tasks = workItems.filter(item => item.type === "task").length;
    stats.content = workItems.filter(item => item.type === "content").length;
    
    // Calculate completion rate
    stats.completionRate = stats.total > 0 
      ? Math.round((stats.done / stats.total) * 100) 
      : 0;
    
    // Calculate average completion time (for completed items)
    const completedItems = workItems.filter(item => item.status === "Done" && item.completedAt);
    if (completedItems.length > 0) {
      const totalTime = completedItems.reduce((sum, item) => {
        const created = new Date(item.createdAt);
        const completed = new Date(item.completedAt);
        return sum + (completed - created);
      }, 0);
      
      // Average time in days
      stats.averageCompletionTime = Math.round(totalTime / completedItems.length / (1000 * 60 * 60 * 24));
    } else {
      stats.averageCompletionTime = 0;
    }
    
    return stats;
  } catch (error) {
    
    throw error;
  }
};

/**
 * Get team member workload for a project
 * @param {string} projectId - Project ID
 * @returns {Promise<Array>} - Array of team members with workload
 */
export const getTeamWorkload = async (projectId) => {
  try {
    const workItems = await WorkItem.find({ project: projectId })
      .populate("assignedTo", "name email");
    
    // Group by assignee
    const workloadMap = {};
    
    workItems.forEach(item => {
      // Skip items without assignee
      if (!item.assignedTo || !item.assignedTo._id) {
        return;
      }
      
      const userId = item.assignedTo._id.toString();
      
      if (!workloadMap[userId]) {
        workloadMap[userId] = {
          user: item.assignedTo,
          total: 0,
          toDo: 0,
          inProgress: 0,
          review: 0,
          done: 0,
          overdue: 0,
        };
      }
      
      workloadMap[userId].total++;
      
      // Count by status
      if (item.status === "To Do") workloadMap[userId].toDo++;
      else if (item.status === "In Progress") workloadMap[userId].inProgress++;
      else if (item.status === "Review") workloadMap[userId].review++;
      else if (item.status === "Done") workloadMap[userId].done++;
      
      // Count overdue
      if (item.status !== "Done" && item.dueDate && new Date(item.dueDate) < new Date()) {
        workloadMap[userId].overdue++;
      }
    });
    
    // Convert to array and calculate percentages
    const workload = Object.values(workloadMap).map(member => ({
      ...member,
      completionRate: member.total > 0 
        ? Math.round((member.done / member.total) * 100) 
        : 0,
      activeItems: member.total - member.done,
    }));
    
    // Sort by active items (descending)
    workload.sort((a, b) => b.activeItems - a.activeItems);
    
    return workload;
  } catch (error) {
    
    throw error;
  }
};

/**
 * Hook to update project progress when work item status changes
 * Call this after creating, updating, or deleting work items
 * @param {string} projectId - Project ID
 */
export const syncProjectProgress = async (projectId) => {
  try {
    await updateProjectProgress(projectId);
  } catch (error) {
    
    // Don't throw - this is a background operation
  }
};

export default {
  calculateProjectProgress,
  updateProjectProgress,
  getProjectStatistics,
  getTeamWorkload,
  syncProjectProgress,
};
