import WorkItem from "../models/workItemModel.js";
import * as creativeWorkflowService from "../services/creativeWorkflowService.js";
import * as creativePostingService from "../services/creativePostingService.js";
import {
  assertCanReviewCreativeWork,
  assertCanPerformAssigneeAction,
  canMarkCreativeDone,
  canSubmitPostingDone,
  loadProjectForCreativeAuth,
} from "../utils/creativeWorkflowAuth.js";
import { resolveQaPassFromBody } from "../utils/creativeWorkflowRules.js";

const getActorId = (req) => req.user?._id || req.user?.id;

/**
 * @param {string} workItemId
 */
async function loadWorkItemContext(workItemId) {
  const workItem = await WorkItem.findById(workItemId);
  if (!workItem || workItem.isDeleted) {
    const err = new Error("Work item not found");
    err.statusCode = 404;
    throw err;
  }
  const project = await loadProjectForCreativeAuth(workItem.project);
  return { workItem, project };
}

/**
 * POST /api/creative-workflow/:workItemId/start
 */
export const startWork = async (req, res) => {
  try {
    const { workItem, project } = await loadWorkItemContext(req.params.workItemId);
    assertCanPerformAssigneeAction(req.user, workItem);

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
      activeWorkItem: error.activeWorkItem || undefined,
    });
  }
};

/**
 * POST /api/creative-workflow/:workItemId/submit-review
 */
export const submitForReview = async (req, res) => {
  try {
    const { workItem } = await loadWorkItemContext(req.params.workItemId);
    assertCanPerformAssigneeAction(req.user, workItem);

    const result = await creativeWorkflowService.submitForReview(
      req.params.workItemId,
      getActorId(req)
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
    const { workItem, project } = await loadWorkItemContext(req.params.workItemId);
    assertCanReviewCreativeWork(req.user, workItem, project);

    const result = await creativeWorkflowService.recordReviewDecision(
      req.params.workItemId,
      getActorId(req),
      {
        decision: req.body?.decision,
        notes: req.body?.notes,
        qaRequired: true,
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
    const { workItem } = await loadWorkItemContext(req.params.workItemId);
    assertCanPerformAssigneeAction(req.user, workItem);

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
      activeWorkItem: error.activeWorkItem || undefined,
    });
  }
};

/**
 * POST /api/creative-workflow/:workItemId/hold
 */
export const holdWork = async (req, res) => {
  try {
    const { workItem } = await loadWorkItemContext(req.params.workItemId);
    assertCanPerformAssigneeAction(req.user, workItem);

    const result = await creativeWorkflowService.holdWork(
      req.params.workItemId,
      getActorId(req)
    );
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error("creative holdWork failed:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || "Failed to hold work",
    });
  }
};

/**
 * POST /api/creative-workflow/:workItemId/resume
 */
export const resumeWork = async (req, res) => {
  try {
    const { workItem } = await loadWorkItemContext(req.params.workItemId);
    assertCanPerformAssigneeAction(req.user, workItem);

    const result = await creativeWorkflowService.resumeWork(
      req.params.workItemId,
      getActorId(req)
    );
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error("creative resumeWork failed:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || "Failed to resume work",
      activeWorkItem: error.activeWorkItem || undefined,
    });
  }
};

/**
 * GET /api/creative-workflow/my-active
 */
export const getMyActiveCreativeWork = async (req, res) => {
  try {
    const active = await creativeWorkflowService.getMyActiveCreativeWork(getActorId(req));
    return res.json({ success: true, data: active });
  } catch (error) {
    console.error("creative getMyActiveCreativeWork failed:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || "Failed to load active creative work",
    });
  }
};

/**
 * POST /api/creative-workflow/:workItemId/qa
 * body: { decision: "pass"|"fail", pass?: boolean, notes?: string }
 */
export const recordQa = async (req, res) => {
  try {
    const { workItem, project } = await loadWorkItemContext(req.params.workItemId);
    assertCanReviewCreativeWork(req.user, workItem, project);

    const passResolved = resolveQaPassFromBody(req.body);
    if (passResolved === null) {
      return res.status(400).json({
        success: false,
        error: 'QA decision is required. Send decision: "pass" or "fail".',
      });
    }

    const result = await creativeWorkflowService.recordQaDecision(
      req.params.workItemId,
      getActorId(req),
      { pass: passResolved, notes: req.body?.notes }
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
    const { workItem, project } = await loadWorkItemContext(req.params.workItemId);
    assertCanReviewCreativeWork(req.user, workItem, project);

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
    const { workItem, project } = await loadWorkItemContext(req.params.workItemId);
    if (!canMarkCreativeDone(req.user, workItem, project)) {
      return res.status(403).json({
        success: false,
        error:
          "Only the creative assignee, assigner, project head, or department HoD can mark this task done",
      });
    }

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
 */
export const addRevisionAttachment = async (req, res) => {
  try {
    const { workItem } = await loadWorkItemContext(req.params.workItemId);
    assertCanPerformAssigneeAction(req.user, workItem);

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
 */
export const setPostingHandoff = async (req, res) => {
  try {
    const { workItem, project } = await loadWorkItemContext(req.params.workItemId);
    assertCanReviewCreativeWork(req.user, workItem, project);

    const workItemResult = await creativePostingService.setPostingHandoff(
      req.params.workItemId,
      {
        requiresPosting: Boolean(req.body?.requiresPosting),
        postingAssignedTo: req.body?.postingAssignedTo,
        postingDate: req.body?.postingDate,
      },
      getActorId(req)
    );
    return res.json({ success: true, data: workItemResult });
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
 */
export const submitPostingDone = async (req, res) => {
  try {
    const { workItem, project } = await loadWorkItemContext(req.params.workItemId);
    if (!canSubmitPostingDone(req.user, workItem)) {
      return res.status(403).json({
        success: false,
        error: "Only the selected posting team member can submit live post links",
      });
    }

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
