import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import {
  getMyActiveTrack,
  initiateGrowthTrack,
  addWeeklyTarget,
  updateTargetProgress,
  acknowledgeNotice,
  logReviewMeeting,
  finalizeGrowthTrack,
  getAllGrowthTracks,
  getManagerGrowthTracks,
} from "../controllers/growthTrackController.js";

const router = express.Router();

// Employee: Get current active track & acknowledge notices
router.get("/my-active", protect, getMyActiveTrack);
router.post("/:trackId/notices/:noticeId/acknowledge", protect, acknowledgeNotice);

// Manager / HR / Admin: Initiate & Manage Growth Tracks
router.post(
  "/initiate",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "manager", "hod"),
  initiateGrowthTrack
);

router.post(
  "/:trackId/targets",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "manager", "hod"),
  addWeeklyTarget
);

router.put(
  "/:trackId/targets/:targetId",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "manager", "hod"),
  updateTargetProgress
);

router.post(
  "/:trackId/reviews",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "manager", "hod"),
  logReviewMeeting
);

router.post(
  "/:trackId/finalize",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "manager", "hod"),
  finalizeGrowthTrack
);

// View list of tracks (all vs team reporting)
router.get(
  "/all",
  protect,
  authorizeRoles("admin", "superadmin", "hr"),
  getAllGrowthTracks
);

router.get(
  "/manager",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "manager", "hod"),
  getManagerGrowthTracks
);

export default router;
