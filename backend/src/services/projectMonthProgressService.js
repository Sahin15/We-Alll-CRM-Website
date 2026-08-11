import Project from "../models/projectModel.js";
import WorkItem from "../models/workItemModel.js";
import logger from "../utils/logger.js";

/**
 * Calculate live monthly progress, planned vs actual deliverable stats, and health status
 * @param {String} projectId
 * @param {String} monthKey e.g. "2026-08"
 */
export const calculateMonthProgress = async (projectId, monthKey) => {
  try {
    const project = await Project.findById(projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    const deliverables = project.deliverables || [];

    // Filter deliverables planned for this monthKey
    const monthDeliverables = deliverables.filter((d) => {
      if (d.monthKey && d.monthKey === monthKey) return true;
      if (d.plannedDate) {
        const dMonthKey = new Date(d.plannedDate).toISOString().slice(0, 7);
        return dMonthKey === monthKey;
      }
      return false;
    });

    const totalPlannedDeliverables = monthDeliverables.length;
    const completedDeliverables = monthDeliverables.filter((d) =>
      ["delivered", "approved"].includes(d.status)
    ).length;

    const now = new Date();
    const delayedDeliverables = monthDeliverables.filter((d) => {
      if (["delivered", "approved"].includes(d.status)) return false;
      if (d.plannedDate && new Date(d.plannedDate) < now) return true;
      return false;
    }).length;

    const deliverableAchievementPercent =
      totalPlannedDeliverables > 0
        ? Math.round((completedDeliverables / totalPlannedDeliverables) * 100)
        : 0;

    // Fetch work items for this project and month
    const [yearStr, monthStr] = monthKey.split("-");
    const startOfMonth = new Date(Number(yearStr), Number(monthStr) - 1, 1);
    const endOfMonth = new Date(Number(yearStr), Number(monthStr), 0, 23, 59, 59);

    const workItems = await WorkItem.find({
      project: projectId,
      $or: [
        { "plannedMonth.year": Number(yearStr), "plannedMonth.month": Number(monthStr) },
        { dueDate: { $gte: startOfMonth, $lte: endOfMonth } },
      ],
    }).lean();

    const totalWorkItems = workItems.length;
    const completedWorkItems = workItems.filter(
      (wi) => wi.status === "Done" || wi.status === "Completed"
    ).length;

    const overdueWorkItems = workItems.filter((wi) => {
      if (wi.status === "Done" || wi.status === "Completed") return false;
      if (wi.dueDate && new Date(wi.dueDate) < now) return true;
      return false;
    }).length;

    const workItemAchievementPercent =
      totalWorkItems > 0
        ? Math.round((completedWorkItems / totalWorkItems) * 100)
        : 0;

    // Determine overall achievement percent (favor deliverables if present)
    const achievementPercent =
      totalPlannedDeliverables > 0
        ? deliverableAchievementPercent
        : workItemAchievementPercent;

    // Determine health status
    let healthStatus = "healthy";
    if (achievementPercent >= 80 && overdueWorkItems === 0) {
      healthStatus = "healthy";
    } else if (achievementPercent >= 50 || overdueWorkItems <= 2) {
      healthStatus = "at_risk";
    } else {
      healthStatus = "critical";
    }

    return {
      monthKey,
      totalPlannedDeliverables,
      completedDeliverables,
      delayedDeliverables,
      deliverableAchievementPercent,
      totalWorkItems,
      completedWorkItems,
      overdueWorkItems,
      workItemAchievementPercent,
      achievementPercent,
      healthStatus,
    };
  } catch (error) {
    logger.error("Error in calculateMonthProgress:", error);
    throw error;
  }
};
