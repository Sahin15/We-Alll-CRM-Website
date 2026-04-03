import express from "express";
import {
  getAllWorkItems,
  getMyWorkItems,
  getWorkItemById,
  createWorkItem,
  updateWorkItem,
  updateWorkItemStatus,
  deleteWorkItem,
  restoreWorkItem,
  bulkUpdateWorkItems,
  addComment,
  deleteComment,
  getCalendarWorkItems,
  getOverdueWorkItems,
  getWorkItemsByProject,
  getWorkflowConfig,
  progressWorkflowStage,
  getWorkflowProgress,
  debugWorkItems,
  assignWorkItemToSlot,
  reassignWorkItem,
  removeSlotAssignment,
  getWorkItemsGroupedBySlots,
  getWorkItemsBySlot,
  getPendingWorkCount,
  activateWorkItem,
  getCreatedByMe,
} from "../controllers/workItemController.js";
import { protect } from "../middleware/authMiddleware.js";
import { createWorkItemLimiter, validateRequest } from "../middleware/securityMiddleware.js";
import {
  createWorkItemValidation,
  updateWorkItemValidation,
  updateStatusValidation,
  bulkUpdateValidation,
  addCommentValidation,
  queryValidation,
} from "../validators/workItemValidators.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// Debug endpoint (admin only)
router.get("/debug", debugWorkItems);

// My Work - Get all work items for current user
router.get("/my-work", queryValidation, validateRequest(queryValidation), getMyWorkItems);

// Created by me - Get all work items created by current user
router.get("/created-by/me", queryValidation, validateRequest(queryValidation), getCreatedByMe);

// Calendar view - Get work items for calendar
router.get("/calendar", queryValidation, validateRequest(queryValidation), getCalendarWorkItems);

// Overdue items
router.get("/overdue", getOverdueWorkItems);

// Get pending work count for a user on a specific due date
router.get("/pending-count/:userId", getPendingWorkCount);

// Get work items by project
router.get("/project/:projectId", queryValidation, validateRequest(queryValidation), getWorkItemsByProject);

// Work item CRUD
router.route("/")
  .get(queryValidation, validateRequest(queryValidation), getAllWorkItems) // Get all work items (admin only)
  .post(
    createWorkItemLimiter,
    createWorkItem
  ); // Create new work item - validator removed for draft support

router.route("/:id")
  .get(getWorkItemById)    // Get work item by ID
  .put(
    updateWorkItemValidation,
    validateRequest(updateWorkItemValidation),
    updateWorkItem
  )     // Update work item
  .delete(deleteWorkItem); // Soft delete work item

// Restore soft deleted work item
router.put("/:id/restore", restoreWorkItem);

// Status update
router.patch(
  "/:id/status",
  updateStatusValidation,
  validateRequest(updateStatusValidation),
  updateWorkItemStatus
);

// Activate draft/scheduled work item
router.patch("/:id/activate", activateWorkItem);

// Bulk operations
router.post(
  "/bulk-update",
  bulkUpdateValidation,
  validateRequest(bulkUpdateValidation),
  bulkUpdateWorkItems
);

// Comments
router.post(
  "/:id/comments",
  addCommentValidation,
  validateRequest(addCommentValidation),
  addComment
);

// Delete comment
router.delete("/:id/comments/:commentId", deleteComment);

// Workflow configuration and progression
router.get("/workflow-config/:projectId", getWorkflowConfig);
router.post("/:id/progress-stage", progressWorkflowStage);
router.get("/:id/workflow-progress", getWorkflowProgress);

// Slot assignment (admin only)
router.post("/:id/assign-slot", assignWorkItemToSlot);

// Remove slot assignment
router.put("/:workItemId/slot/remove", removeSlotAssignment);

// Get work items by slot
router.get("/by-slot/:slotId", getWorkItemsBySlot);

// Work item reassignment (admin/manager only)
router.put("/:id/reassign", reassignWorkItem);

export default router;
