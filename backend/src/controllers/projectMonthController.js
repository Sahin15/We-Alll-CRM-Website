import ProjectMonth from "../models/projectMonthModel.js";
import Project from "../models/projectModel.js";
import { canUserViewProject } from "../services/resourceVisibilityService.js";
import { logProjectActivity } from "../services/projectActivityService.js";
import { calculateMonthProgress } from "../services/projectMonthProgressService.js";
import logger from "../utils/logger.js";

/**
 * Get or auto-create a ProjectMonth record for a given project and monthKey
 * GET /api/projects/:projectId/month?monthKey=2026-08
 */
export const getOrCreateProjectMonth = async (req, res) => {
  try {
    const { projectId } = req.params;
    let { monthKey } = req.query;

    if (!monthKey) {
      const now = new Date();
      monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    }

    const hasAccess = await canUserViewProject(req.user, projectId);
    if (!hasAccess) {
      return res.status(403).json({ message: "Access denied to this project" });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    let projectMonth = await ProjectMonth.findOne({
      project: projectId,
      $or: [{ periodIdentifier: monthKey }, { monthKey }],
    })
      .populate("goals.owner", "name email")
      .populate("nextMonthGoals.owner", "name email");

    if (!projectMonth) {
      const [yearStr, monthStr] = monthKey.split("-");
      projectMonth = new ProjectMonth({
        project: projectId,
        client: project.client,
        periodIdentifier: monthKey,
        year: Number(yearStr),
        month: Number(monthStr),
        status: "draft",
        goals: [],
        plannedDeliverables: [],
        nextMonthGoals: [],
        summaryNotes: "",
      });
      await projectMonth.save();

      await logProjectActivity({
        actor: req.user._id || req.user.id,
        action: "month.created",
        entityType: "ProjectMonth",
        entityId: projectMonth._id,
        project: projectId,
        client: project.client,
        after: projectMonth.toObject(),
        message: `Project month created for ${monthKey}`,
      });
    }

    res.status(200).json({
      success: true,
      data: projectMonth,
    });
  } catch (error) {
    logger.error("Error in getOrCreateProjectMonth:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * Update ProjectMonth goals and status
 * PUT /api/project-months/:id
 */
export const updateProjectMonthGoals = async (req, res) => {
  try {
    const { id } = req.params;

    const projectMonth = await ProjectMonth.findById(id);
    if (!projectMonth) {
      return res.status(404).json({ message: "Project month record not found" });
    }

    const hasAccess = await canUserViewProject(req.user, projectMonth.project);
    if (!hasAccess) {
      return res.status(403).json({ message: "Access denied to this project" });
    }

    const beforeState = projectMonth.toObject();

    const { status, goals, plannedDeliverables, nextMonthGoals, summaryNotes } = req.body;

    if (status !== undefined) projectMonth.status = status;
    if (goals !== undefined) projectMonth.goals = goals;
    if (plannedDeliverables !== undefined)
      projectMonth.plannedDeliverables = plannedDeliverables;
    if (nextMonthGoals !== undefined) projectMonth.nextMonthGoals = nextMonthGoals;
    if (summaryNotes !== undefined) projectMonth.summaryNotes = summaryNotes.trim();

    await projectMonth.save();

    await logProjectActivity({
      actor: req.user._id || req.user.id,
      action: "month.updated",
      entityType: "ProjectMonth",
      entityId: projectMonth._id,
      project: projectMonth.project,
      client: projectMonth.client,
      before: beforeState,
      after: projectMonth.toObject(),
      message: `Project month updated for ${projectMonth.monthKey}`,
    });

    res.status(200).json({
      success: true,
      data: projectMonth,
    });
  } catch (error) {
    logger.error("Error updating project month goals:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * Get all monthly history records for a project
 * GET /api/projects/:projectId/months-history
 */
export const getProjectMonthsHistory = async (req, res) => {
  try {
    const { projectId } = req.params;

    const hasAccess = await canUserViewProject(req.user, projectId);
    if (!hasAccess) {
      return res.status(403).json({ message: "Access denied to this project" });
    }

    const months = await ProjectMonth.find({ project: projectId })
      .sort({ monthKey: -1 })
      .lean();

    res.status(200).json({
      success: true,
      data: months,
      count: months.length,
    });
  } catch (error) {
    logger.error("Error fetching project month history:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * Get live month progress metrics
 * GET /api/projects/:projectId/month-progress?monthKey=2026-08
 */
export const getMonthProgress = async (req, res) => {
  try {
    const { projectId } = req.params;
    let { monthKey } = req.query;

    if (!monthKey) {
      const now = new Date();
      monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    }

    const hasAccess = await canUserViewProject(req.user, projectId);
    if (!hasAccess) {
      return res.status(403).json({ message: "Access denied to this project" });
    }

    const progress = await calculateMonthProgress(projectId, monthKey);

    res.status(200).json({
      success: true,
      data: progress,
    });
  } catch (error) {
    logger.error("Error in getMonthProgress:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * Submit monthly report (freezes autoSnapshot data)
 * POST /api/project-months/:id/submit
 */
export const submitProjectMonthReport = async (req, res) => {
  try {
    const { id } = req.params;

    const projectMonth = await ProjectMonth.findById(id);
    if (!projectMonth) {
      return res.status(404).json({ message: "Project month record not found" });
    }

    const hasAccess = await canUserViewProject(req.user, projectMonth.project);
    if (!hasAccess) {
      return res.status(403).json({ message: "Access denied to this project" });
    }

    const beforeState = projectMonth.toObject();

    // Calculate progress snapshot
    const progress = await calculateMonthProgress(
      projectMonth.project,
      projectMonth.periodIdentifier || projectMonth.monthKey
    );

    projectMonth.autoSnapshot = {
      plannedDeliverables: progress.totalPlannedDeliverables,
      completedDeliverables: progress.completedDeliverables,
      delayedDeliverables: progress.delayedDeliverables,
      plannedWorkItems: progress.totalWorkItems,
      completedWorkItems: progress.completedWorkItems,
      overdueWorkItems: progress.overdueWorkItems,
      achievementPercent: progress.achievementPercent,
      executionNote: `Report submitted on ${new Date().toISOString()}`,
    };

    projectMonth.status = "submitted";
    await projectMonth.save();

    await logProjectActivity({
      actor: req.user._id || req.user.id,
      action: "month.submitted",
      entityType: "ProjectMonth",
      entityId: projectMonth._id,
      project: projectMonth.project,
      client: projectMonth.client,
      before: beforeState,
      after: projectMonth.toObject(),
      message: `Monthly report submitted for ${projectMonth.periodIdentifier || projectMonth.monthKey}`,
    });

    res.status(200).json({
      success: true,
      data: projectMonth,
    });
  } catch (error) {
    logger.error("Error submitting project month report:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * Review monthly report with management comments
 * POST /api/project-months/:id/review
 */
export const reviewProjectMonthReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { comment, executiveSummary, keyAchievements } = req.body;

    const projectMonth = await ProjectMonth.findById(id);
    if (!projectMonth) {
      return res.status(404).json({ message: "Project month record not found" });
    }

    const hasAccess = await canUserViewProject(req.user, projectMonth.project);
    if (!hasAccess) {
      return res.status(403).json({ message: "Access denied to this project" });
    }

    const beforeState = projectMonth.toObject();

    if (comment && comment.trim()) {
      projectMonth.managementComments.push({
        comment: comment.trim(),
        by: req.user._id || req.user.id,
        at: new Date(),
      });
    }

    if (executiveSummary !== undefined) {
      projectMonth.executiveSummary = executiveSummary.trim();
    }

    if (keyAchievements !== undefined) {
      projectMonth.keyAchievements = keyAchievements.trim();
    }

    projectMonth.status = "reviewed";
    projectMonth.reviewedBy = req.user._id || req.user.id;
    projectMonth.reviewedAt = new Date();

    await projectMonth.save();

    await logProjectActivity({
      actor: req.user._id || req.user.id,
      action: "month.reviewed",
      entityType: "ProjectMonth",
      entityId: projectMonth._id,
      project: projectMonth.project,
      client: projectMonth.client,
      before: beforeState,
      after: projectMonth.toObject(),
      message: `Monthly report reviewed for ${projectMonth.periodIdentifier || projectMonth.monthKey}`,
    });

    res.status(200).json({
      success: true,
      data: projectMonth,
    });
  } catch (error) {
    logger.error("Error reviewing project month report:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
