import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { requireModulePermission } from "../authz/authzMiddleware.js";
import {
  startWork,
  submitForReview,
  recordReview,
  startRework,
  recordQa,
  markDelivered,
  closeTask,
  listRevisions,
  addRevisionAttachment,
  setPostingHandoff,
  submitPostingDone,
} from "../controllers/creativeWorkflowController.js";

const router = express.Router();

const CREATIVE_ROLES = [
  "employee",
  "hod",
  "manager",
  "hr",
  "admin",
  "superadmin",
];

const creativeAccess = requireModulePermission("work", "work.item.view", {
  legacyRoles: CREATIVE_ROLES,
});

const creativeManage = requireModulePermission("work", "work.item.update", {
  legacyRoles: ["hod", "manager", "hr", "admin", "superadmin", "employee"],
});

router.use(protect);

router.get("/:workItemId/revisions", creativeAccess, listRevisions);
router.post("/:workItemId/start", creativeManage, startWork);
router.post("/:workItemId/submit-review", creativeManage, submitForReview);
router.post("/:workItemId/review", creativeManage, recordReview);
router.post("/:workItemId/rework", creativeManage, startRework);
router.post("/:workItemId/qa", creativeManage, recordQa);
router.post("/:workItemId/deliver", creativeManage, markDelivered);
router.post("/:workItemId/close", creativeManage, closeTask);
router.post("/:workItemId/revisions/attachments", creativeManage, addRevisionAttachment);
router.put("/:workItemId/posting", creativeManage, setPostingHandoff);
router.post("/:workItemId/posting/submit", creativeManage, submitPostingDone);

export default router;
