/**
 * Creative workflow transitions for Graphic Design / Video Main Tasks.
 * Slot side effects stay in WorkItem pre-save (Delivered → complete, Cancelled → release).
 * @see docs/WORKFLOW/CREATIVE_STATE_MACHINE.md
 */

import WorkItem from "../models/workItemModel.js";
import CreativeRevision from "../models/creativeRevisionModel.js";
import { isCreativeWorkflow } from "../utils/creativeStatusMap.js";

const REVIEW_DECISIONS = {
  approve: "approve",
  reject: "reject",
  minor: "minor",
  major: "major",
  send_back: "send_back",
};

/**
 * @param {string} workItemId
 */
async function loadCreativeWorkItem(workItemId) {
  const workItem = await WorkItem.findById(workItemId);
  if (!workItem || workItem.isDeleted) {
    const err = new Error("Work item not found");
    err.statusCode = 404;
    throw err;
  }
  if (!isCreativeWorkflow(workItem) && workItem.workflowMode !== "creative") {
    // Allow enabling creative mode on first action
    workItem.workflowMode = "creative";
  }
  return workItem;
}

function pushSystemComment(workItem, actorId, text) {
  workItem.comments = workItem.comments || [];
  workItem.comments.push({
    user: actorId,
    text,
    isSystemComment: true,
  });
}

/**
 * Start work: Assigned/To Do → In Progress; create Revision 1 if none.
 * Idempotent: does not re-post "Work started" when Revision 1 already exists.
 */
export async function startWork(workItemId, actorId) {
  const workItem = await loadCreativeWorkItem(workItemId);
  workItem.workflowMode = "creative";
  workItem.modifiedBy = actorId;

  let revision = await CreativeRevision.findOne({
    workItem: workItemId,
    isCurrentTip: true,
    softArchived: { $ne: true },
  });

  const createdRevision = !revision;
  if (!revision) {
    revision = await CreativeRevision.create({
      workItem: workItemId,
      revisionNumber: 1,
      parentRevision: null,
      createdBy: actorId,
      assignedTo: workItem.assignedTo || actorId,
      reason: "Initial draft",
      status: "draft",
      isCurrentTip: true,
    });
  }

  const previousStatus = workItem.status;
  workItem.status = "In Progress";

  // Only log once — when Revision 1 is actually created (avoids duplicate timeline rows)
  if (createdRevision) {
    pushSystemComment(workItem, actorId, "Work started — Revision 1 ready");
  } else if (previousStatus === "In Progress") {
    // Already started; nothing to persist beyond ensuring creative mode
    await workItem.save();
    return { workItem, revision };
  }

  await workItem.save();
  return { workItem, revision };
}

/**
 * Submit current tip revision for review.
 */
export async function submitForReview(workItemId, actorId, { requireAttachment = false } = {}) {
  const workItem = await loadCreativeWorkItem(workItemId);
  const revision = await CreativeRevision.findOne({
    workItem: workItemId,
    isCurrentTip: true,
    softArchived: { $ne: true },
  });

  if (!revision) {
    const err = new Error("No current revision to submit");
    err.statusCode = 400;
    throw err;
  }

  const activeFiles = (revision.attachments || []).filter((a) => !a.softDeprecated);
  if (requireAttachment && activeFiles.length === 0) {
    const err = new Error("Upload at least one file before submitting for review");
    err.statusCode = 400;
    throw err;
  }

  revision.status = "submitted";
  revision.submittedAt = new Date();
  revision.submittedBy = actorId;
  await revision.save();

  workItem.workflowMode = "creative";
  workItem.status = "Submitted for Review";
  workItem.modifiedBy = actorId;
  pushSystemComment(
    workItem,
    actorId,
    `Revision ${revision.revisionNumber} submitted for review`
  );
  await workItem.save();

  return { workItem, revision };
}

/**
 * Record a review decision on the current tip.
 */
export async function recordReviewDecision(
  workItemId,
  actorId,
  { decision, notes = "", qaRequired = false } = {}
) {
  const normalized = String(decision || "").toLowerCase().replace(/\s+/g, "_");
  const map = {
    approve: REVIEW_DECISIONS.approve,
    approved: REVIEW_DECISIONS.approve,
    reject: REVIEW_DECISIONS.reject,
    rejected: REVIEW_DECISIONS.reject,
    minor: REVIEW_DECISIONS.minor,
    request_minor_changes: REVIEW_DECISIONS.minor,
    major: REVIEW_DECISIONS.major,
    request_major_rework: REVIEW_DECISIONS.major,
    send_back: REVIEW_DECISIONS.send_back,
    send_back_with_comments: REVIEW_DECISIONS.send_back,
  };

  const resolved = map[normalized];
  if (!resolved) {
    const err = new Error("Invalid review decision");
    err.statusCode = 400;
    throw err;
  }

  if (
    (resolved === REVIEW_DECISIONS.reject ||
      resolved === REVIEW_DECISIONS.major ||
      resolved === REVIEW_DECISIONS.minor ||
      resolved === REVIEW_DECISIONS.send_back) &&
    !String(notes || "").trim()
  ) {
    const err = new Error("Review / QA notes are required when requesting changes");
    err.statusCode = 400;
    throw err;
  }

  const workItem = await loadCreativeWorkItem(workItemId);
  if (workItem.status !== "Submitted for Review") {
    const err = new Error("Work item is not submitted for review");
    err.statusCode = 400;
    throw err;
  }

  const revision = await CreativeRevision.findOne({
    workItem: workItemId,
    isCurrentTip: true,
  });
  if (!revision) {
    const err = new Error("No current revision found");
    err.statusCode = 400;
    throw err;
  }

  revision.reviewedAt = new Date();
  revision.reviewedBy = actorId;
  revision.reviewNotes = notes || "";
  revision.feedback = notes || revision.feedback;
  revision.lastDecision = resolved;

  if (resolved === REVIEW_DECISIONS.approve) {
    revision.status = "approved";
    revision.approvalNotes = notes || "";
    revision.approvedAt = new Date();
    revision.approvedBy = actorId;
    revision.decisionSeverity = "none";
    workItem.status = qaRequired ? "QA Review" : "Approved";
  } else if (resolved === REVIEW_DECISIONS.reject) {
    revision.status = "rejected";
    revision.decisionSeverity = "reject";
    workItem.status = "Changes Requested";
  } else {
    revision.status = "changes_requested";
    revision.decisionSeverity =
      resolved === REVIEW_DECISIONS.minor ? "minor" : "major";
    workItem.status = "Changes Requested";
  }

  await revision.save();
  workItem.workflowMode = "creative";
  workItem.modifiedBy = actorId;

  const severityLabel =
    revision.decisionSeverity && revision.decisionSeverity !== "none"
      ? ` (${revision.decisionSeverity})`
      : "";
  const notesSuffix = notes?.trim() ? ` — ${String(notes).trim().slice(0, 240)}` : "";
  pushSystemComment(
    workItem,
    actorId,
    resolved === REVIEW_DECISIONS.approve
      ? `Approved Revision ${revision.revisionNumber}${notesSuffix}`
      : `Requested changes${severityLabel} on Revision ${revision.revisionNumber}${notesSuffix}`
  );
  await workItem.save();

  return { workItem, revision };
}

/**
 * Start rework: create next revision with parent link. Does not touch slots.
 */
export async function startRework(workItemId, actorId) {
  const workItem = await loadCreativeWorkItem(workItemId);
  if (workItem.status !== "Changes Requested") {
    const err = new Error("Rework can only start from Changes Requested");
    err.statusCode = 400;
    throw err;
  }

  const current = await CreativeRevision.findOne({
    workItem: workItemId,
    isCurrentTip: true,
  });
  if (!current) {
    const err = new Error("No current revision found");
    err.statusCode = 400;
    throw err;
  }

  current.isCurrentTip = false;
  if (current.status !== "rejected") {
    current.status = "superseded";
  }
  await current.save();

  const nextNumber = current.revisionNumber + 1;
  const reason =
    current.lastDecision === "reject"
      ? `Reject response — ${current.reviewNotes || "see review notes"}`
      : `Changes requested (${current.decisionSeverity}) — ${current.reviewNotes || ""}`;

  const revision = await CreativeRevision.create({
    workItem: workItemId,
    revisionNumber: nextNumber,
    parentRevision: current._id,
    createdBy: actorId,
    assignedTo: workItem.assignedTo || actorId,
    reason: reason.slice(0, 1000),
    feedback: current.reviewNotes || "",
    status: "draft",
    isCurrentTip: true,
    attachments: [],
  });

  workItem.status = "Rework In Progress";
  workItem.workflowMode = "creative";
  workItem.modifiedBy = actorId;
  pushSystemComment(
    workItem,
    actorId,
    `Revision ${nextNumber} created (based on Revision ${current.revisionNumber})`
  );
  await workItem.save();

  return { workItem, revision };
}

/**
 * QA pass/fail from QA Review.
 */
export async function recordQaDecision(workItemId, actorId, { pass, notes = "" } = {}) {
  const workItem = await loadCreativeWorkItem(workItemId);
  if (workItem.status !== "QA Review") {
    const err = new Error("Work item is not in QA Review");
    err.statusCode = 400;
    throw err;
  }

  if (!pass && !String(notes || "").trim()) {
    const err = new Error("Notes are required when QA fails");
    err.statusCode = 400;
    throw err;
  }

  workItem.modifiedBy = actorId;
  if (pass) {
    workItem.status = "Approved";
    pushSystemComment(workItem, actorId, "QA passed");
  } else {
    workItem.status = "Changes Requested";
    const tip = await CreativeRevision.findOne({
      workItem: workItemId,
      isCurrentTip: true,
    });
    if (tip) {
      tip.status = "changes_requested";
      tip.reviewNotes = notes;
      tip.feedback = notes;
      tip.lastDecision = "major";
      tip.decisionSeverity = "major";
      tip.reviewedAt = new Date();
      tip.reviewedBy = actorId;
      await tip.save();
    }
    pushSystemComment(workItem, actorId, `QA failed: ${notes}`);
  }

  await workItem.save();
  return { workItem };
}

/**
 * Mark delivered — triggers slot complete via WorkItem pre-save.
 * If requiresPosting, move to Awaiting Posting after Delivered save.
 */
export async function markDelivered(workItemId, actorId) {
  const workItem = await loadCreativeWorkItem(workItemId);
  if (workItem.status !== "Approved" && workItem.status !== "QA Review") {
    // Allow Approved primarily; QA Review should pass first
    if (workItem.status !== "Approved") {
      const err = new Error("Only Approved work can be marked Delivered");
      err.statusCode = 400;
      throw err;
    }
  }

  const tip = await CreativeRevision.findOne({
    workItem: workItemId,
    isCurrentTip: true,
  });
  if (tip && tip.status === "approved") {
    tip.isDeliveredRevision = true;
    tip.status = "delivered";
    await tip.save();
  }

  workItem.status = "Delivered";
  workItem.workflowMode = "creative";
  workItem.modifiedBy = actorId;
  pushSystemComment(workItem, actorId, "Marked Delivered");
  await workItem.save();

  if (workItem.requiresPosting && workItem.postingAssignedTo && workItem.postingDate) {
    workItem.status = "Awaiting Posting";
    workItem.postingStatus =
      workItem.postingStatus === "not_required" ? "pending" : workItem.postingStatus;
    pushSystemComment(workItem, actorId, "Awaiting Posting department");
    await workItem.save();
  }

  return { workItem, revision: tip };
}

/**
 * Close task — from Delivered (no posting) or Posted (posting required).
 */
export async function closeTask(workItemId, actorId) {
  const workItem = await loadCreativeWorkItem(workItemId);

  if (workItem.requiresPosting) {
    if (workItem.status !== "Posted") {
      const err = new Error("Close requires Posted status when posting is required");
      err.statusCode = 400;
      throw err;
    }
  } else if (workItem.status !== "Delivered" && workItem.status !== "Posted") {
    const err = new Error("Close requires Delivered status when posting is not required");
    err.statusCode = 400;
    throw err;
  }

  workItem.status = "Closed";
  workItem.modifiedBy = actorId;
  pushSystemComment(workItem, actorId, "Task closed");
  await workItem.save();
  return { workItem };
}

/**
 * Add attachment metadata to current draft tip.
 */
export async function addRevisionAttachment(workItemId, actorId, fileMeta) {
  const revision = await CreativeRevision.findOne({
    workItem: workItemId,
    isCurrentTip: true,
  });
  if (!revision) {
    const err = new Error("No current revision found");
    err.statusCode = 400;
    throw err;
  }
  if (revision.status !== "draft") {
    const err = new Error("Files can only be added to a draft revision");
    err.statusCode = 400;
    throw err;
  }

  revision.attachments.push({
    name: fileMeta.name,
    url: fileMeta.url,
    type: fileMeta.type || "other",
    size: fileMeta.size,
    storageKey: fileMeta.storageKey,
    category: fileMeta.category || "other",
    notes: fileMeta.notes || "",
    uploadedBy: actorId,
    uploadedAt: new Date(),
  });
  await revision.save();
  return { revision };
}

/**
 * List revisions for a work item (newest first).
 */
export async function listRevisions(workItemId) {
  return CreativeRevision.find({
    workItem: workItemId,
    softArchived: { $ne: true },
  })
    .sort({ revisionNumber: -1 })
    .populate("createdBy", "name email")
    .populate("assignedTo", "name email")
    .populate("reviewedBy", "name email")
    .populate("submittedBy", "name email")
    .populate("approvedBy", "name email")
    .populate("parentRevision", "revisionNumber");
}

const CHANGE_REQUEST_STATUSES = ["changes_requested", "rejected"];
const CHANGE_REQUEST_SEVERITIES = ["minor", "major", "reject"];
const CHANGE_REQUEST_DECISIONS = ["minor", "major", "reject", "send_back"];

/**
 * Count creative change requests per work item (minor/major/reject reviews).
 * @param {string[]} workItemIds
 * @returns {Promise<{ byWorkItem: Record<string, number>, total: number }>}
 */
export async function getChangeRequestCountsByWorkItems(workItemIds = []) {
  const ids = [...new Set((workItemIds || []).map((id) => String(id)).filter(Boolean))];
  const byWorkItem = {};
  ids.forEach((id) => {
    byWorkItem[id] = 0;
  });

  if (ids.length === 0) {
    return { byWorkItem, total: 0 };
  }

  const revisions = await CreativeRevision.find({
    workItem: { $in: ids },
    softArchived: { $ne: true },
    $or: [
      { status: { $in: CHANGE_REQUEST_STATUSES } },
      { decisionSeverity: { $in: CHANGE_REQUEST_SEVERITIES } },
      { lastDecision: { $in: CHANGE_REQUEST_DECISIONS } },
    ],
  }).select("workItem");

  revisions.forEach((rev) => {
    const key = rev.workItem?.toString();
    if (!key) return;
    byWorkItem[key] = (byWorkItem[key] || 0) + 1;
  });

  const total = Object.values(byWorkItem).reduce((sum, n) => sum + n, 0);
  return { byWorkItem, total };
}

export default {
  startWork,
  submitForReview,
  recordReviewDecision,
  startRework,
  recordQaDecision,
  markDelivered,
  closeTask,
  addRevisionAttachment,
  listRevisions,
  getChangeRequestCountsByWorkItems,
};
