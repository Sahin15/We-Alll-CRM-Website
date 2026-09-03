import ProjectActivityLog from "../models/projectActivityLogModel.js";
import logger from "../utils/logger.js";

/**
 * Log a planning or management activity for client/project audits.
 * This method is safe and will never throw an error to the caller,
 * preventing log failures from blocking business operations.
 *
 * @param {Object} params
 * @param {string} params.actor - User ID of the actor
 * @param {string} params.action - Event action (e.g. "expectation.created")
 * @param {string} params.entityType - Type of the entity (e.g. "ProjectExpectation")
 * @param {string} params.entityId - ID of the entity
 * @param {string} [params.project] - Associated Project ID
 * @param {string} [params.client] - Associated Client ID
 * @param {string} [params.projectMonthId] - Associated ProjectMonth ID
 * @param {Object} [params.before] - State before update
 * @param {Object} [params.after] - State after update
 * @param {string} params.message - Human-readable description of change
 */
export async function logProjectActivity(params) {
  try {
    const {
      actor,
      action,
      entityType,
      entityId,
      project,
      client,
      projectMonthId,
      before,
      after,
      message,
    } = params;

    if (!actor || !action || !entityType || !entityId || !message) {
      logger.error("[PROJECT_ACTIVITY_SERVICE] Missing required fields for activity log");
      return null;
    }

    if (process.env.NODE_ENV === "test") {
      return null;
    }

    const activityLog = new ProjectActivityLog({
      actor,
      action,
      entityType,
      entityId,
      project,
      client,
      projectMonthId,
      before,
      after,
      message,
    });

    await activityLog.save();
    return activityLog;
  } catch (error) {
    // Log error but do not fail the main thread
    console.error("[PROJECT_ACTIVITY_SERVICE] Safe activity logging failed:", error);
    return null;
  }
}

export default {
  logProjectActivity,
};
