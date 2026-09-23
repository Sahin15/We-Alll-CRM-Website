import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { requireModulePermission } from "../authz/authzMiddleware.js";
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

const VIEW_ROLES = ["admin", "superadmin", "hr", "manager", "hod", "employee"];
const MANAGE_ROLES = ["admin", "superadmin", "hr", "manager", "hod"];

// Employee: Get current active track & acknowledge notices
router.get(
  "/my-active",
  protect,
  requireModulePermission("growth_track", "growth_track.view", { legacyRoles: VIEW_ROLES }),
  getMyActiveTrack
);

router.post(
  "/:trackId/notices/:noticeId/acknowledge",
  protect,
  requireModulePermission("growth_track", "growth_track.view", { legacyRoles: VIEW_ROLES }),
  acknowledgeNotice
);

// Manager / HR / Admin: Initiate & Manage Growth Tracks
router.post(
  "/initiate",
  protect,
  requireModulePermission("growth_track", "growth_track.manage", { legacyRoles: MANAGE_ROLES }),
  initiateGrowthTrack
);

router.post(
  "/:trackId/targets",
  protect,
  requireModulePermission("growth_track", "growth_track.manage", { legacyRoles: MANAGE_ROLES }),
  addWeeklyTarget
);

router.put(
  "/:trackId/targets/:targetId",
  protect,
  requireModulePermission("growth_track", "growth_track.manage", { legacyRoles: MANAGE_ROLES }),
  updateTargetProgress
);

router.post(
  "/:trackId/reviews",
  protect,
  requireModulePermission("growth_track", "growth_track.manage", { legacyRoles: MANAGE_ROLES }),
  logReviewMeeting
);

router.post(
  "/:trackId/finalize",
  protect,
  requireModulePermission("growth_track", "growth_track.manage", { legacyRoles: MANAGE_ROLES }),
  finalizeGrowthTrack
);

// View list of tracks (all vs team reporting)
router.get(
  "/all",
  protect,
  requireModulePermission("growth_track", "growth_track.manage", { legacyRoles: ["admin", "superadmin", "hr"] }),
  getAllGrowthTracks
);

router.get(
  "/manager",
  protect,
  requireModulePermission("growth_track", "growth_track.view", { legacyRoles: MANAGE_ROLES }),
  getManagerGrowthTracks
);

export default router;
