import ProjectActivityLog from "../models/projectActivityLogModel.js";
import { canUserViewProject, canUserViewClient } from "../services/resourceVisibilityService.js";
import logger from "../utils/logger.js";

/**
 * Get project/client activity logs for audit timeline
 * GET /api/projects/:projectId/activities or GET /api/clients/:clientId/activities
 */
export const getProjectActivityLogs = async (req, res) => {
  try {
    const { projectId, clientId } = req.params;

    if (projectId) {
      const hasAccess = await canUserViewProject(req.user, projectId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied to this project" });
      }
    } else if (clientId) {
      const hasAccess = await canUserViewClient(req.user, clientId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied to this client" });
      }
    } else {
      return res.status(400).json({ message: "Either project or client ID is required" });
    }

    const query = {};
    if (projectId) query.project = projectId;
    if (clientId) query.client = clientId;

    const activities = await ProjectActivityLog.find(query)
      .populate("actor", "name email avatar role")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.status(200).json({
      success: true,
      data: activities,
      count: activities.length,
    });
  } catch (error) {
    logger.error("Error fetching project activity logs:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
