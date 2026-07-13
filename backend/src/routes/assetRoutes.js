import express from "express";
import assetController from "../controllers/assetController.js";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";
import { requireModulePermission } from "../authz/authzMiddleware.js";

const router = express.Router();

const ASSET_VIEW_ROLES = ["admin", "hr", "superadmin", "hod", "manager"];
const ASSET_MANAGE_ROLES = ["admin", "superadmin", "hr", "manager"];

router.use(protect);

router.get(
  "/dashboard",
  authorizeRoles(...ASSET_VIEW_ROLES),
  requireModulePermission("resources", "assets.asset.view", { legacyRoles: ASSET_VIEW_ROLES }),
  assetController.getDashboard
);

router.get(
  "/my-assets",
  requireModulePermission("resources", "assets.asset.view", { legacyAllowed: true }),
  assetController.getMyAssets
);

router.get(
  "/warranty",
  authorizeRoles(...ASSET_VIEW_ROLES),
  requireModulePermission("resources", "assets.asset.view", { legacyRoles: ASSET_VIEW_ROLES }),
  assetController.getWarrantyAssets
);

router.get(
  "/history",
  authorizeRoles(...ASSET_VIEW_ROLES),
  requireModulePermission("resources", "assets.asset.view", { legacyRoles: ASSET_VIEW_ROLES }),
  assetController.getAssignmentHistory
);

router.get(
  "/repairs",
  authorizeRoles(...ASSET_VIEW_ROLES),
  requireModulePermission("resources", "assets.asset.view", { legacyRoles: ASSET_VIEW_ROLES }),
  assetController.getAllRepairs
);
router.post(
  "/repairs",
  authorizeRoles(...ASSET_MANAGE_ROLES),
  requireModulePermission("resources", "assets.asset.manage", { legacyRoles: ASSET_MANAGE_ROLES }),
  assetController.createRepair
);
router.put(
  "/repairs/:repairId",
  authorizeRoles(...ASSET_MANAGE_ROLES),
  requireModulePermission("resources", "assets.asset.manage", { legacyRoles: ASSET_MANAGE_ROLES }),
  assetController.updateRepair
);
router.post(
  "/repairs/:repairId/complete",
  authorizeRoles(...ASSET_MANAGE_ROLES),
  requireModulePermission("resources", "assets.asset.manage", { legacyRoles: ASSET_MANAGE_ROLES }),
  assetController.completeRepair
);

router.get(
  "/",
  authorizeRoles(...ASSET_VIEW_ROLES),
  requireModulePermission("resources", "assets.asset.view", { legacyRoles: ASSET_VIEW_ROLES }),
  assetController.getAllAssets
);
router.post(
  "/",
  authorizeRoles(...ASSET_MANAGE_ROLES),
  requireModulePermission("resources", "assets.asset.manage", { legacyRoles: ASSET_MANAGE_ROLES }),
  assetController.createAsset
);

router.get(
  "/:id",
  authorizeRoles(...ASSET_VIEW_ROLES),
  requireModulePermission("resources", "assets.asset.view", { legacyRoles: ASSET_VIEW_ROLES }),
  assetController.getAssetById
);

router.put(
  "/:id",
  authorizeRoles(...ASSET_MANAGE_ROLES),
  requireModulePermission("resources", "assets.asset.manage", { legacyRoles: ASSET_MANAGE_ROLES }),
  assetController.updateAsset
);
router.delete(
  "/:id",
  authorizeRoles(...ASSET_MANAGE_ROLES),
  requireModulePermission("resources", "assets.asset.manage", { legacyRoles: ASSET_MANAGE_ROLES }),
  assetController.deleteAsset
);

router.get(
  "/:id/history",
  authorizeRoles(...ASSET_VIEW_ROLES),
  requireModulePermission("resources", "assets.asset.view", { legacyRoles: ASSET_VIEW_ROLES }),
  assetController.getAssetHistory
);

router.post(
  "/:id/assign",
  authorizeRoles(...ASSET_MANAGE_ROLES),
  requireModulePermission("resources", "assets.asset.manage", { legacyRoles: ASSET_MANAGE_ROLES }),
  assetController.assignAsset
);
router.post(
  "/:id/return",
  authorizeRoles(...ASSET_MANAGE_ROLES),
  requireModulePermission("resources", "assets.asset.manage", { legacyRoles: ASSET_MANAGE_ROLES }),
  assetController.returnAsset
);
router.post(
  "/:id/mark-lost",
  authorizeRoles(...ASSET_MANAGE_ROLES),
  requireModulePermission("resources", "assets.asset.manage", { legacyRoles: ASSET_MANAGE_ROLES }),
  assetController.markAsLost
);
router.post(
  "/:id/send-to-repair",
  authorizeRoles(...ASSET_MANAGE_ROLES),
  requireModulePermission("resources", "assets.asset.manage", { legacyRoles: ASSET_MANAGE_ROLES }),
  assetController.sendToRepair
);

export default router;
