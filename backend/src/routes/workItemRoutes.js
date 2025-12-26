import express from "express";
import {
  getMyWorkItems,
  getWorkItemById,
  createWorkItem,
  updateWorkItem,
  updateWorkItemStatus,
  deleteWorkItem,
  restoreWorkItem,
  bulkUpdateWorkItems,
  addComment,
  getCalendarWorkItems,
  getOverdueWorkItems,
  getWorkItemsByProject,
  getWorkflowConfig,
  progressWorkflowStage,
  getWorkflowProgress,
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

// My Work - Get all work items for current user
router.get("/my-work", queryValidation, validateRequest(queryValidation), getMyWorkItems);

// Calendar view - Get work items for calendar
router.get("/calendar", queryValidation, validateRequest(queryValidation), getCalendarWorkItems);

// Overdue items
router.get("/overdue", getOverdueWorkItems);

// Get work items by project
router.get("/project/:projectId", queryValidation, validateRequest(queryValidation), getWorkItemsByProject);

// Work item CRUD
router.route("/")
  .post(
    createWorkItemLimiter,
    createWorkItemValidation,
    validateRequest(createWorkItemValidation),
    createWorkItem
  ); // Create new work item

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

// Workflow configuration and progression
router.get("/workflow-config/:projectId", getWorkflowConfig);
router.post("/:id/progress-stage", progressWorkflowStage);
router.get("/:id/workflow-progress", getWorkflowProgress);

export default router;
