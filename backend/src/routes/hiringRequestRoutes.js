import express from "express";
import { protect } from "../middleware/authMiddleware.js";
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

router.use(protect);

router.get("/pending-count", getPendingCount);
router.get("/", listHiringRequests);
router.post("/", createHiringRequest);
router.get("/:id/applications", getHiringRequestApplications);
router.get("/:id", getHiringRequest);
router.put("/:id", updateHiringRequest);
router.post("/:id/submit", submitHiringRequest);
router.put("/:id/review", reviewHiringRequest);

export default router;
