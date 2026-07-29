import * as creativeWorkflowService from "../services/creativeWorkflowService.js";
import * as creativePostingService from "../services/creativePostingService.js";

const getActorId = (req) => req.user?._id || req.user?.id;

/**
 * POST /api/creative-workflow/:workItemId/start
 */
export const startWork = async (req, res) => {
  try {
    const result = await creativeWorkflowService.startWork(
      req.params.workItemId,
      getActorId(req)
    );
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error("creative startWork failed:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || "Failed to start creative work",
    });
  }
};

/**
 * POST /api/creative-workflow/:workItemId/submit-review
 */
export const submitForReview = async (req, res) => {
  try {
    const result = await creativeWorkflowService.submitForReview(
      req.params.workItemId,
      getActorId(req),
      { requireAttachment: req.body?.requireAttachment === true }
    );
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error("creative submitForReview failed:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || "Failed to submit for review",
    });
  }
};

/**
 * POST /api/creative-workflow/:workItemId/review
 * body: { decision, notes, qaRequired }
 */
export const recordReview = async (req, res) => {
  try {
    const result = await creativeWorkflowService.recordReviewDecision(
      req.params.workItemId,
      getActorId(req),
      {
        decision: req.body?.decision,
        notes: req.body?.notes,
        qaRequired: Boolean(req.body?.qaRequired),
      }
    );
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error("creative recordReview failed:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || "Failed to record review",
    });
  }
};

/**
 * POST /api/creative-workflow/:workItemId/rework
 */
export const startRework = async (req, res) => {
  try {
    const result = await creativeWorkflowService.startRework(
      req.params.workItemId,
      getActorId(req)
    );
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error("creative startRework failed:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || "Failed to start rework",
    });
  }
};

/**
 * POST /api/creative-workflow/:workItemId/qa
 * body: { pass: boolean, notes }
 */
export const recordQa = async (req, res) => {
  try {
    const result = await creativeWorkflowService.recordQaDecision(
      req.params.workItemId,
      getActorId(req),
      { pass: Boolean(req.body?.pass), notes: req.body?.notes }
    );
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error("creative recordQa failed:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || "Failed to record QA decision",
    });
  }
};

/**
 * POST /api/creative-workflow/:workItemId/deliver
 */
export const markDelivered = async (req, res) => {
  try {
    const result = await creativeWorkflowService.markDelivered(
      req.params.workItemId,
      getActorId(req)
    );
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error("creative markDelivered failed:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || "Failed to mark delivered",
    });
  }
};

/**
 * POST /api/creative-workflow/:workItemId/close
 */
export const closeTask = async (req, res) => {
  try {
    const result = await creativeWorkflowService.closeTask(
      req.params.workItemId,
      getActorId(req)
    );
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error("creative closeTask failed:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || "Failed to close task",
    });
  }
};

/**
 * GET /api/creative-workflow/:workItemId/revisions
 */
export const listRevisions = async (req, res) => {
  try {
    const revisions = await creativeWorkflowService.listRevisions(
      req.params.workItemId
    );
    return res.json({ success: true, data: revisions });
  } catch (error) {
    console.error("creative listRevisions failed:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || "Failed to list revisions",
    });
  }
};

/**
 * GET /api/creative-workflow/change-counts?workItemIds=id1,id2
 * Also accepts POST body { workItemIds: string[] } for compatibility.
 * Returns change-request counts per work item + total.
 */
export const getChangeRequestCounts = async (req, res) => {
  try {
    let workItemIds = [];
    if (Array.isArray(req.body?.workItemIds)) {
      workItemIds = req.body.workItemIds;
    } else if (typeof req.query.workItemIds === "string" && req.query.workItemIds.trim()) {
      workItemIds = req.query.workItemIds.split(",").map((id) => id.trim()).filter(Boolean);
    } else if (Array.isArray(req.query.workItemIds)) {
      workItemIds = req.query.workItemIds;
    }

    const data =
      await creativeWorkflowService.getChangeRequestCountsByWorkItems(workItemIds);
    return res.json({ success: true, data });
  } catch (error) {
    console.error("creative getChangeRequestCounts failed:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || "Failed to load change request counts",
    });
  }
};

/**
 * POST /api/creative-workflow/:workItemId/revisions/attachments
 * body: { name, url, type, size, storageKey, category, notes }
 */
export const addRevisionAttachment = async (req, res) => {
  try {
    const result = await creativeWorkflowService.addRevisionAttachment(
      req.params.workItemId,
      getActorId(req),
      req.body || {}
    );
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error("creative addRevisionAttachment failed:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || "Failed to add revision attachment",
    });
  }
};

/**
 * PUT /api/creative-workflow/:workItemId/posting
 * body: { requiresPosting, postingAssignedTo, postingDate }
 */
export const setPostingHandoff = async (req, res) => {
  try {
    const workItem = await creativePostingService.setPostingHandoff(
      req.params.workItemId,
      {
        requiresPosting: Boolean(req.body?.requiresPosting),
        postingAssignedTo: req.body?.postingAssignedTo,
        postingDate: req.body?.postingDate,
      },
      getActorId(req)
    );
    return res.json({ success: true, data: workItem });
  } catch (error) {
    console.error("creative setPostingHandoff failed:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || "Failed to set posting handoff",
    });
  }
};

/**
 * POST /api/creative-workflow/:workItemId/posting/submit
 * body: { postUrls: string[], postingNotes }
 */
export const submitPostingDone = async (req, res) => {
  try {
    const result = await creativePostingService.submitPostingDone(
      req.params.workItemId,
      {
        postUrls: req.body?.postUrls,
        postingNotes: req.body?.postingNotes,
      },
      getActorId(req)
    );
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error("creative submitPostingDone failed:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || "Failed to submit posting",
    });
  }
};
