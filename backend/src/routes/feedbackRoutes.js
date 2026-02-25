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
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import { uploadDocument, handleDocumentUploadError } from "../middleware/documentMiddleware.js";

const router = express.Router();

// Employee routes
router.post(
  "/",
  protect,
  uploadDocument.array("attachments", 5),
  handleDocumentUploadError,
  createFeedback
);

router.get("/my-feedback", protect, getMyFeedback);
router.post("/:id/upvote", protect, toggleUpvote);

// All employees can view feedback (for transparency and collaboration)
router.get("/", protect, getAllFeedback);

router.get(
  "/statistics",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "manager"),
  getFeedbackStatistics
);

router.get(
  "/trending",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "manager"),
  getTrendingFeedback
);

// Shared routes (with permission checks inside controller)
router.get("/:id", protect, getFeedbackById);

router.put(
  "/:id",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "manager"),
  updateFeedback
);

router.delete("/:id", protect, deleteFeedback);

export default router;