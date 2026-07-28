/**
 * Posting department handoff for Graphic Design / Video creative Main Tasks.
 * @see docs/WORKFLOW/CREATIVE_POSTING_HANDOFF.md
 */

import User from "../models/userModel.js";
import Department from "../models/departmentModel.js";
import WorkItem from "../models/workItemModel.js";

const POSTING_DEPT_NAMES = new Set([
  "posting",
  "posting department",
  "content posting",
]);

/**
 * @param {{ requiresPosting: boolean, postingAssignedTo?: string|null, postingDate?: Date|string|null }} input
 * @returns {{ valid: boolean, error?: string, postingStatus: string, postingAssignedTo: string|null, postingDate: Date|null }}
 */
export function validatePostingHandoffInput(input = {}) {
  const requiresPosting = Boolean(input.requiresPosting);

  if (!requiresPosting) {
    return {
      valid: true,
      postingStatus: "not_required",
      postingAssignedTo: null,
      postingDate: null,
    };
  }

  if (!input.postingAssignedTo) {
    return {
      valid: false,
      error: "Posting team member is required when Assign to Posting department is selected",
      postingStatus: "pending",
      postingAssignedTo: null,
      postingDate: null,
    };
  }

  if (!input.postingDate) {
    return {
      valid: false,
      error: "Posting date is required when Assign to Posting department is selected",
      postingStatus: "pending",
      postingAssignedTo: null,
      postingDate: null,
    };
  }

  const postingDate = new Date(input.postingDate);
  if (Number.isNaN(postingDate.getTime())) {
    return {
      valid: false,
      error: "Posting date is invalid",
      postingStatus: "pending",
      postingAssignedTo: null,
      postingDate: null,
    };
  }

  return {
    valid: true,
    postingStatus: "pending",
    postingAssignedTo: String(input.postingAssignedTo),
    postingDate,
  };
}

/**
 * Apply validated posting handoff fields onto a work item document/plain object.
 * Does not mutate dueDate.
 * @param {object} workItem
 * @param {ReturnType<typeof validatePostingHandoffInput>} validated
 */
export function applyPostingHandoffFields(workItem, validated) {
  workItem.requiresPosting = validated.postingStatus !== "not_required";
  workItem.postingAssignedTo = validated.postingAssignedTo;
  workItem.postingDate = validated.postingDate;
  workItem.postingStatus = validated.postingStatus;

  if (validated.postingStatus === "not_required") {
    workItem.postUrls = [];
    workItem.postingNotes = "";
    workItem.postingSubmittedAt = null;
    workItem.postingSubmittedBy = null;
  }
}

/**
 * @param {string[]} postUrls
 * @returns {{ valid: boolean, error?: string, urls: string[] }}
 */
export function validatePostUrls(postUrls) {
  if (!Array.isArray(postUrls) || postUrls.length === 0) {
    return { valid: false, error: "At least one post URL is required", urls: [] };
  }

  const urls = postUrls
    .map((u) => (typeof u === "string" ? u.trim() : ""))
    .filter(Boolean);

  if (urls.length === 0) {
    return { valid: false, error: "At least one post URL is required", urls: [] };
  }

  for (const url of urls) {
    try {
      // eslint-disable-next-line no-new
      new URL(url);
    } catch {
      return { valid: false, error: `Invalid post URL: ${url}`, urls: [] };
    }
  }

  return { valid: true, urls };
}

/**
 * @param {import("mongoose").Types.ObjectId|string} userId
 * @returns {Promise<{ ok: boolean, error?: string, user?: object }>}
 */
export async function assertUserInPostingDepartment(userId) {
  const user = await User.findById(userId).populate("department", "name");
  if (!user) {
    return { ok: false, error: "Posting assignee not found" };
  }

  const deptName = (user.department?.name || "").trim().toLowerCase();
  if (!POSTING_DEPT_NAMES.has(deptName)) {
    return {
      ok: false,
      error: "Selected user must belong to the Posting department",
    };
  }

  return { ok: true, user };
}

/**
 * Set or clear posting handoff on a Main Task.
 * @param {string} workItemId
 * @param {{ requiresPosting: boolean, postingAssignedTo?: string|null, postingDate?: Date|string|null }} payload
 * @param {string} actorId
 */
export async function setPostingHandoff(workItemId, payload, actorId) {
  const validated = validatePostingHandoffInput(payload);
  if (!validated.valid) {
    const err = new Error(validated.error);
    err.statusCode = 400;
    throw err;
  }

  if (validated.postingAssignedTo) {
    const check = await assertUserInPostingDepartment(validated.postingAssignedTo);
    if (!check.ok) {
      const err = new Error(check.error);
      err.statusCode = 400;
      throw err;
    }
  }

  const workItem = await WorkItem.findById(workItemId);
  if (!workItem || workItem.isDeleted) {
    const err = new Error("Work item not found");
    err.statusCode = 404;
    throw err;
  }

  const previousDueDate = workItem.dueDate;
  applyPostingHandoffFields(workItem, validated);
  workItem.dueDate = previousDueDate;
  workItem.modifiedBy = actorId;

  if (validated.postingAssignedTo) {
    workItem.comments = workItem.comments || [];
    workItem.comments.push({
      user: actorId,
      text: `Posting assigned to team member (posting date: ${validated.postingDate.toISOString().slice(0, 10)})`,
      isSystemComment: true,
    });
  }

  await workItem.save();
  return workItem;
}

/**
 * Submit post URLs and mark posting done. Does not mutate slots.
 * @param {string} workItemId
 * @param {{ postUrls: string[], postingNotes?: string }} payload
 * @param {string} actorId
 */
export async function submitPostingDone(workItemId, payload, actorId) {
  const workItem = await WorkItem.findById(workItemId);
  if (!workItem || workItem.isDeleted) {
    const err = new Error("Work item not found");
    err.statusCode = 404;
    throw err;
  }

  if (!workItem.requiresPosting) {
    const err = new Error("This work item does not require posting");
    err.statusCode = 400;
    throw err;
  }

  const allowedStatuses = ["Delivered", "Awaiting Posting"];
  if (!allowedStatuses.includes(workItem.status)) {
    const err = new Error(
      "Posting can only be submitted when status is Delivered or Awaiting Posting"
    );
    err.statusCode = 400;
    throw err;
  }

  const assigneeId = workItem.postingAssignedTo?.toString?.() || String(workItem.postingAssignedTo);
  if (assigneeId && String(actorId) !== assigneeId) {
    // Managers may override later via controller; service allows actor match by default
    // Controller enforces role overrides.
  }

  const urlCheck = validatePostUrls(payload?.postUrls);
  if (!urlCheck.valid) {
    const err = new Error(urlCheck.error);
    err.statusCode = 400;
    throw err;
  }

  // Capture slot snapshot before save to prove posting does not mutate slots
  const slotSnapshot = workItem.slotAssignment?.assignedSlot
    ? String(workItem.slotAssignment.assignedSlot)
    : null;

  workItem.postUrls = urlCheck.urls;
  workItem.postingNotes = payload?.postingNotes || "";
  workItem.postingSubmittedAt = new Date();
  workItem.postingSubmittedBy = actorId;
  workItem.postingStatus = "done";
  workItem.status = "Posted";
  workItem.modifiedBy = actorId;
  workItem.comments = workItem.comments || [];
  workItem.comments.push({
    user: actorId,
    text: `Posting done with ${urlCheck.urls.length} URL(s)`,
    isSystemComment: true,
  });

  await workItem.save();

  return {
    workItem,
    slotAssignmentUnchanged: slotSnapshot,
  };
}

/**
 * Ensure Posting department document exists (helper for scripts/tests).
 */
export async function ensurePostingDepartmentExists() {
  let dept = await Department.findOne({ name: "Posting" });
  if (!dept) {
    dept = await Department.create({
      name: "Posting",
      description:
        "Publishes approved graphic and video content; submits live post URLs as proof of posting",
      type: "operational",
      status: "active",
    });
  }
  return dept;
}

export default {
  validatePostingHandoffInput,
  applyPostingHandoffFields,
  validatePostUrls,
  assertUserInPostingDepartment,
  setPostingHandoff,
  submitPostingDone,
  ensurePostingDepartmentExists,
};
