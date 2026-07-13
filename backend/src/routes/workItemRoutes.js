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
  editWorkItem,
  getEditHistory,
} from "../controllers/workItemController.js";
import { protect } from "../middleware/authMiddleware.js";
import { requireModulePermission } from "../authz/authzMiddleware.js";
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

const WORK_ITEM_ADMIN_VIEW_ROLES = ["admin", "superadmin", "hod", "hr", "manager"];
const WORK_ITEM_DEBUG_ROLES = ["admin", "superadmin", "hod"];
const WORK_ITEM_SLOT_ASSIGN_ROLES = ["admin", "superadmin", "hod"];
const WORK_ITEM_REASSIGN_ROLES = ["admin", "superadmin", "hr", "manager", "hod", "hop"];
const WORK_ITEM_DELETE_ROLES = ["admin", "superadmin", "hr", "manager"];

router.use(protect);

router.get(
  "/debug",
  requireModulePermission("work", "work.item.view", { legacyRoles: WORK_ITEM_DEBUG_ROLES }),
  debugWorkItems
);

router.get(
  "/my-work",
  queryValidation,
  validateRequest(queryValidation),
  requireModulePermission("work", "work.item.view", { legacyAllowed: true }),
  getMyWorkItems
);

router.get(
  "/created-by/me",
  queryValidation,
  validateRequest(queryValidation),
  requireModulePermission("work", "work.item.view", { legacyAllowed: true }),
  getCreatedByMe
);

router.get(
  "/calendar",
  queryValidation,
  validateRequest(queryValidation),
  requireModulePermission("work", "work.item.view", { legacyAllowed: true }),
  getCalendarWorkItems
);

router.get(
  "/overdue",
  requireModulePermission("work", "work.item.view", { legacyAllowed: true }),
  getOverdueWorkItems
);

router.get(
  "/pending-count/:userId",
  requireModulePermission("work", "work.item.view", { legacyAllowed: true }),
  getPendingWorkCount
);

router.get(
  "/project/:projectId",
  queryValidation,
  validateRequest(queryValidation),
  requireModulePermission("work", "work.item.view", { legacyAllowed: true }),
  getWorkItemsByProject
);

router.get(
  "/",
  queryValidation,
  validateRequest(queryValidation),
  requireModulePermission("work", "work.item.view", {
    legacyRoles: WORK_ITEM_ADMIN_VIEW_ROLES,
  }),
  getAllWorkItems
);

router.post(
  "/",
  createWorkItemLimiter,
  requireModulePermission("work", "work.item.create", { legacyAllowed: true }),
  createWorkItem
);

router.get(
  "/:id",
  requireModulePermission("work", "work.item.view", { legacyAllowed: true }),
  getWorkItemById
);

router.put(
  "/:id",
  updateWorkItemValidation,
  validateRequest(updateWorkItemValidation),
  requireModulePermission("work", "work.item.update", { legacyAllowed: true }),
  updateWorkItem
);

router.delete(
  "/:id",
  requireModulePermission("work", "work.item.update", {
    legacyRoles: WORK_ITEM_DELETE_ROLES,
  }),
  deleteWorkItem
);

router.put(
  "/:id/restore",
  requireModulePermission("work", "work.item.update", {
    legacyRoles: WORK_ITEM_DELETE_ROLES,
  }),
  restoreWorkItem
);

router.patch(
  "/:id/status",
  updateStatusValidation,
  validateRequest(updateStatusValidation),
  requireModulePermission("work", "work.item.update", { legacyAllowed: true }),
  updateWorkItemStatus
);

router.patch(
  "/:id/activate",
  requireModulePermission("work", "work.item.update", { legacyAllowed: true }),
  activateWorkItem
);

router.post(
  "/bulk-update",
  bulkUpdateValidation,
  validateRequest(bulkUpdateValidation),
  requireModulePermission("work", "work.item.update", { legacyAllowed: true }),
  bulkUpdateWorkItems
);

router.post(
  "/:id/comments",
  addCommentValidation,
  validateRequest(addCommentValidation),
  requireModulePermission("work", "work.item.update", { legacyAllowed: true }),
  addComment
);

router.delete(
  "/:id/comments/:commentId",
  requireModulePermission("work", "work.item.update", { legacyAllowed: true }),
  deleteComment
);

router.get(
  "/workflow-config/:projectId",
  requireModulePermission("work", "work.item.view", { legacyAllowed: true }),
  getWorkflowConfig
);

router.post(
  "/:id/progress-stage",
  requireModulePermission("work", "work.item.update", { legacyAllowed: true }),
  progressWorkflowStage
);

router.get(
  "/:id/workflow-progress",
  requireModulePermission("work", "work.item.view", { legacyAllowed: true }),
  getWorkflowProgress
);

router.post(
  "/:id/assign-slot",
  requireModulePermission("work", "work.item.update", {
    legacyRoles: WORK_ITEM_SLOT_ASSIGN_ROLES,
  }),
  assignWorkItemToSlot
);

router.put(
  "/:workItemId/slot/remove",
  requireModulePermission("work", "work.item.update", { legacyAllowed: true }),
  removeSlotAssignment
);

router.get(
  "/by-slot/:slotId",
  requireModulePermission("work", "work.item.view", { legacyAllowed: true }),
  getWorkItemsBySlot
);

router.put(
  "/:id/reassign",
  requireModulePermission("work", "work.item.update", {
    legacyRoles: WORK_ITEM_REASSIGN_ROLES,
  }),
  reassignWorkItem
);

router.put(
  "/:id/edit",
  requireModulePermission("work", "work.item.update", { legacyAllowed: true }),
  editWorkItem
);

router.get(
  "/:id/edit-history",
  requireModulePermission("work", "work.item.view", { legacyAllowed: true }),
  getEditHistory
);

export default router;
