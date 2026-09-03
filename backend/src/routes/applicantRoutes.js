import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { requireModulePermission } from "../authz/authzMiddleware.js";
import {
  uploadDocument,
  handleDocumentUploadError,
} from "../middleware/documentMiddleware.js";
import {
  listApplicants,
  getApplicant,
  createApplicant,
  updateApplicant,
  uploadApplicantResume,
  archiveApplicant,
} from "../controllers/applicantController.js";

const router = express.Router();

const HR_PIPELINE_ROLES = ["admin", "superadmin", "hr", "manager"];
const hiringPipelineManage = requireModulePermission("hiring", "hiring.pipeline.manage", {
  legacyRoles: HR_PIPELINE_ROLES,
});

router.use(protect);
router.use(hiringPipelineManage);

router.get("/", listApplicants);
router.post("/", uploadDocument.single("resume"), handleDocumentUploadError, createApplicant);
router.get("/:id", getApplicant);
router.put("/:id", updateApplicant);
router.post(
  "/:id/resume",
  uploadDocument.single("resume"),
  handleDocumentUploadError,
  uploadApplicantResume
);
router.delete("/:id", archiveApplicant);

export default router;
