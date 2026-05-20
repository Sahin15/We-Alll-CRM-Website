import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  listOffers,
  getOffer,
  createOffer,
  updateOffer,
  previewOfferLetter,
  generateOfferLetter,
  convertOfferToEmployee,
  getOfferByUserId,
} from "../controllers/offerController.js";

const router = express.Router();

router.use(protect);

router.get("/", listOffers);
router.get("/by-user/:userId", getOfferByUserId);
router.post("/", createOffer);
router.get("/:id/preview", previewOfferLetter);
router.post("/:id/generate", generateOfferLetter);
router.post("/:id/convert-to-employee", convertOfferToEmployee);
router.get("/:id", getOffer);
router.put("/:id", updateOffer);

export default router;
