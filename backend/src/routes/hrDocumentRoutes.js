import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  listTemplates,
  getTemplateDetail,
  prefillTemplate,
  previewHrDocument,
  generateHrDocument,
} from "../controllers/hrDocumentController.js";

const router = express.Router();

router.use(protect);

router.get("/templates", listTemplates);
router.get("/templates/:slug", getTemplateDetail);
router.get("/templates/:slug/prefill/:userId", prefillTemplate);
router.post("/templates/:slug/preview", previewHrDocument);
router.post("/templates/:slug/generate", generateHrDocument);

export default router;
