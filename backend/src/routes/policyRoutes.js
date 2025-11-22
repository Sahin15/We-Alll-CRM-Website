import express from "express";
import {
  getPolicies,
  getPolicyById,
  createPolicy,
  updatePolicy,
  deletePolicy,
  getRecentPolicies,
  getPolicyCategories,
} from "../controllers/policyController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/", getPolicies);
router.get("/recent", getRecentPolicies);
router.get("/categories", getPolicyCategories);
router.get("/:id", getPolicyById);

router.post(
  "/",
  authorizeRoles("admin", "superadmin", "hr", "manager"),
  createPolicy
);

router.put(
  "/:id",
  authorizeRoles("admin", "superadmin", "hr", "manager"),
  updatePolicy
);

router.delete(
  "/:id",
  authorizeRoles("admin", "superadmin", "hr"),
  deletePolicy
);

export default router;
