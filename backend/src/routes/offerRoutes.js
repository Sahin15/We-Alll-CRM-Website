import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { requireModulePermission } from "../authz/authzMiddleware.js";
import {
  listOffers,
  getOffer,
  createOffer,
  updateOffer,
  previewOfferLetter,
  generateOfferLetter,
  convertOfferToEmployee,
  getOfferByUserId,
  deleteOffer,
} from "../controllers/offerController.js";

const router = express.Router();

const HR_PIPELINE_ROLES = ["admin", "superadmin", "hr", "manager"];
const hiringPipelineManage = requireModulePermission("hiring", "hiring.pipeline.manage", {
  legacyRoles: HR_PIPELINE_ROLES,
});

router.use(protect);
router.use(hiringPipelineManage);

router.get("/", listOffers);
router.get("/by-user/:userId", getOfferByUserId);
router.post("/", createOffer);
router.get("/:id/preview", previewOfferLetter);
router.post("/:id/generate", generateOfferLetter);
router.post("/:id/convert-to-employee", convertOfferToEmployee);
router.get("/:id", getOffer);
router.put("/:id", updateOffer);
router.delete("/:id", deleteOffer);

export default router;
