import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  getHiringApplication,
  createHiringApplication,
  updateApplicationStage,
  scheduleInterview,
  completeInterview,
  createOfferFromApplication,
} from "../controllers/hiringApplicationController.js";

const router = express.Router();

router.use(protect);

router.post("/", createHiringApplication);
router.get("/:id", getHiringApplication);
router.put("/:id/stage", updateApplicationStage);
router.post("/:id/interviews", scheduleInterview);
router.put("/:id/interviews/:interviewId", completeInterview);
router.post("/:id/create-offer", createOfferFromApplication);

export default router;
