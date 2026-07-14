import express from "express";
import {
  createFeedback,
  getAllFeedback,
  getMyFeedback,
  getFeedbackById,
  updateFeedback,
  toggleUpvote,
  getFeedbackStatistics,
  getTrendingFeedback,
  deleteFeedback
} from "../controllers/feedbackController.js";
import { protect } from "../middleware/authMiddleware.js";
import { requireModulePermission } from "../authz/authzMiddleware.js";
import { uploadDocument, handleDocumentUploadError } from "../middleware/documentMiddleware.js";

const router = express.Router();

const FEEDBACK_MODERATOR_ROLES = ["admin", "superadmin", "hr", "manager"];

const feedbackModeration = requireModulePermission("company", "company.announcement.manage", {
  legacyRoles: FEEDBACK_MODERATOR_ROLES,
});
const feedbackAnalytics = requireModulePermission("reports", "reports.analytics.view", {
  legacyRoles: FEEDBACK_MODERATOR_ROLES,
});

router.post(
  "/",
  protect,
  uploadDocument.array("attachments", 5),
  handleDocumentUploadError,
  createFeedback
);

router.get("/my-feedback", protect, getMyFeedback);
router.post("/:id/upvote", protect, toggleUpvote);

router.get("/", protect, getAllFeedback);

router.get("/statistics", protect, feedbackAnalytics, getFeedbackStatistics);

router.get("/trending", protect, feedbackAnalytics, getTrendingFeedback);

router.get("/:id", protect, getFeedbackById);

router.put("/:id", protect, feedbackModeration, updateFeedback);

router.delete("/:id", protect, deleteFeedback);

export default router;
