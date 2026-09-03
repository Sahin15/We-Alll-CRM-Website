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
const HIRING_REQUEST_VIEW_ROLES = ["admin", "superadmin", "hr", "manager", "hod"];
const HIRING_REQUEST_CREATE_ROLES = ["admin", "superadmin", "hod"];

const hiringRequestView = requireModulePermission("hiring", "hiring.request.view", {
  legacyRoles: HIRING_REQUEST_VIEW_ROLES,
});
const hiringRequestCreate = requireModulePermission("hiring", "hiring.request.create", {
  legacyRoles: HIRING_REQUEST_CREATE_ROLES,
});

router.use(protect);

router.get(
  "/pending-count",
  requireModulePermission("hiring", "hiring.pipeline.manage", {
    legacyRoles: HR_PIPELINE_ROLES,
  }),
  getPendingCount
);
router.get("/", hiringRequestView, listHiringRequests);
router.post("/", hiringRequestCreate, createHiringRequest);
router.get("/:id/applications", hiringRequestView, getHiringRequestApplications);
router.get("/:id", hiringRequestView, getHiringRequest);
router.put("/:id", hiringRequestView, updateHiringRequest);
router.post("/:id/submit", hiringRequestCreate, submitHiringRequest);
router.put(
  "/:id/review",
  requireModulePermission("hiring", "hiring.pipeline.manage", {
    legacyRoles: HR_PIPELINE_ROLES,
  }),
  reviewHiringRequest
);

export default router;
