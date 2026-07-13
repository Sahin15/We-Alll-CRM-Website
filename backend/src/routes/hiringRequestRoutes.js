import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { requireModulePermission } from "../authz/authzMiddleware.js";
import {
  listHiringRequests,
  getHiringRequest,
  getHiringRequestApplications,
  createHiringRequest,
  updateHiringRequest,
  submitHiringRequest,
  reviewHiringRequest,
  getPendingCount,
} from "../controllers/hiringRequestController.js";

const router = express.Router();

const HR_PIPELINE_ROLES = ["admin", "superadmin", "hr", "manager"];

router.use(protect);

router.get(
  "/pending-count",
  requireModulePermission("hiring", "hiring.pipeline.manage", {
    legacyRoles: HR_PIPELINE_ROLES,
  }),
  getPendingCount
);
router.get(
  "/",
  requireModulePermission("hiring", "hiring.request.view", { legacyAllowed: true }),
  listHiringRequests
);
router.post(
  "/",
  requireModulePermission("hiring", "hiring.request.create", { legacyAllowed: true }),
  createHiringRequest
);
router.get(
  "/:id/applications",
  requireModulePermission("hiring", "hiring.request.view", { legacyAllowed: true }),
  getHiringRequestApplications
);
router.get(
  "/:id",
  requireModulePermission("hiring", "hiring.request.view", { legacyAllowed: true }),
  getHiringRequest
);
router.put(
  "/:id",
  requireModulePermission("hiring", "hiring.request.view", { legacyAllowed: true }),
  updateHiringRequest
);
router.post(
  "/:id/submit",
  requireModulePermission("hiring", "hiring.request.create", { legacyAllowed: true }),
  submitHiringRequest
);
router.put(
  "/:id/review",
  requireModulePermission("hiring", "hiring.pipeline.manage", {
    legacyRoles: HR_PIPELINE_ROLES,
  }),
  reviewHiringRequest
);

export default router;
