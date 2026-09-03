import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { requireModulePermission } from "../authz/authzMiddleware.js";
import {
  getHiringApplication,
  createHiringApplication,
  updateApplicationStage,
  scheduleInterview,
  completeInterview,
  createOfferFromApplication,
} from "../controllers/hiringApplicationController.js";

const router = express.Router();

const HR_PIPELINE_ROLES = ["admin", "superadmin", "hr", "manager"];

router.use(protect);

router.post(
  "/",
  requireModulePermission("hiring", "hiring.pipeline.manage", {
    legacyRoles: HR_PIPELINE_ROLES,
  }),
  createHiringApplication
);
router.get(
  "/:id",
  requireModulePermission("hiring", "hiring.pipeline.manage", {
    legacyRoles: HR_PIPELINE_ROLES,
  }),
  getHiringApplication
);
router.put(
  "/:id/stage",
  requireModulePermission("hiring", "hiring.pipeline.manage", {
    legacyRoles: HR_PIPELINE_ROLES,
  }),
  updateApplicationStage
);
router.post(
  "/:id/interviews",
  requireModulePermission("hiring", "hiring.pipeline.manage", {
    legacyRoles: HR_PIPELINE_ROLES,
  }),
  scheduleInterview
);
router.put(
  "/:id/interviews/:interviewId",
  requireModulePermission("hiring", "hiring.pipeline.manage", {
    legacyRoles: HR_PIPELINE_ROLES,
  }),
  completeInterview
);
router.post(
  "/:id/create-offer",
  requireModulePermission("hiring", "hiring.pipeline.manage", {
    legacyRoles: HR_PIPELINE_ROLES,
  }),
  createOfferFromApplication
);

export default router;
