/**
 * Enforce single active creative task per assignee.
 */

import WorkItem from "../models/workItemModel.js";
import { ACTIVE_ASSIGNMENT_STATUSES } from "./creativeWorkflowRules.js";

/**
 * Find another actively running creative task for the assignee.
 * @param {string|import('mongoose').Types.ObjectId} assigneeId
 * @param {string|import('mongoose').Types.ObjectId|null} [excludeWorkItemId]
 */
export async function findActiveCreativeWorkForAssignee(assigneeId, excludeWorkItemId = null) {
  if (!assigneeId) return null;

  const userRef = { $in: [assigneeId, String(assigneeId)] };
  const query = {
    isDeleted: { $ne: true },
    workflowMode: "creative",
    status: { $in: ACTIVE_ASSIGNMENT_STATUSES },
    $or: [{ assignedTo: userRef }, { assignedToMultiple: userRef }],
  };

  if (excludeWorkItemId) {
    query._id = { $ne: excludeWorkItemId };
  }

  return WorkItem.findOne(query).select("_id title status assignedTo").lean();
}

/**
 * Throw 409 if assignee already has another active creative task.
 * @param {string|import('mongoose').Types.ObjectId} assigneeId
 * @param {string|import('mongoose').Types.ObjectId|null} [excludeWorkItemId]
 */
export async function assertNoOtherActiveCreativeWork(assigneeId, excludeWorkItemId = null) {
  const active = await findActiveCreativeWorkForAssignee(assigneeId, excludeWorkItemId);
  if (!active) return;

  const err = new Error(
    `You are working on "${active.title}". Hold it first to start this task.`
  );
  err.statusCode = 409;
  err.activeWorkItem = active;
  throw err;
}
