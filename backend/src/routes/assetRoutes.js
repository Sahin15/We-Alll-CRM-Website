import express from "express";
import assetController from "../controllers/assetController.js";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// ============================================
// STATIC ROUTES - MUST come before /:id routes
// ============================================

// Dashboard
router.get("/dashboard", authorizeRoles("admin", "hr", "superadmin", "hod", "manager"), assetController.getDashboard);

// My Assets (Employee)
router.get("/my-assets", assetController.getMyAssets);

// Warranty
router.get("/warranty", authorizeRoles("admin", "hr", "superadmin", "hod", "manager"), assetController.getWarrantyAssets);

// History
router.get("/history", authorizeRoles("admin", "hr", "superadmin", "hod", "manager"), assetController.getAssignmentHistory);

// Repair Operations
router.get("/repairs", authorizeRoles("admin", "hr", "superadmin", "hod", "manager"), assetController.getAllRepairs);
router.post("/repairs", authorizeRoles("admin", "superadmin", "hr", "manager"), assetController.createRepair);
router.put("/repairs/:repairId", authorizeRoles("admin", "superadmin", "hr", "manager"), assetController.updateRepair);
router.post("/repairs/:repairId/complete", authorizeRoles("admin", "superadmin", "hr", "manager"), assetController.completeRepair);

// ============================================
// ASSET CRUD - List all assets
// ============================================
router.get("/", authorizeRoles("admin", "hr", "superadmin", "hod", "manager"), assetController.getAllAssets);
router.post("/", authorizeRoles("admin", "superadmin", "hr", "manager"), assetController.createAsset);

// ============================================
// DYNAMIC ROUTES - MUST come last
// ============================================

// Get single asset by ID
router.get("/:id", authorizeRoles("admin", "hr", "superadmin", "hod", "manager"), assetController.getAssetById);

// Update/Delete asset
router.put("/:id", authorizeRoles("admin", "superadmin", "hr", "manager"), assetController.updateAsset);
router.delete("/:id", authorizeRoles("admin", "superadmin", "hr", "manager"), assetController.deleteAsset);

// Asset history by ID
router.get("/:id/history", authorizeRoles("admin", "hr", "superadmin", "hod", "manager"), assetController.getAssetHistory);

// Assignment Operations
router.post("/:id/assign", authorizeRoles("admin", "hr", "superadmin", "manager"), assetController.assignAsset);
router.post("/:id/return", authorizeRoles("admin", "hr", "superadmin", "manager"), assetController.returnAsset);
router.post("/:id/mark-lost", authorizeRoles("admin", "hr", "superadmin", "manager"), assetController.markAsLost);
router.post("/:id/send-to-repair", authorizeRoles("admin", "hr", "superadmin", "manager"), assetController.sendToRepair);

export default router;
