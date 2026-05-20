import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  createHiringApplication,
  updateApplicationStage,
  createOfferFromApplication,
} from "../controllers/hiringApplicationController.js";

const router = express.Router();

router.use(protect);

router.post("/", createHiringApplication);
router.put("/:id/stage", updateApplicationStage);
router.post("/:id/create-offer", createOfferFromApplication);

export default router;
