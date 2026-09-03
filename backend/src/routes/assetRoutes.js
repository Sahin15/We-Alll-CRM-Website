import express from "express";
import assetController from "../controllers/assetController.js";
import { protect } from '../middleware/authMiddleware.js';

import { requireModulePermission } from "../authz/authzMiddleware.js";

const router = express.Router();

const ASSET_VIEW_ROLES = ["admin", "hr", "superadmin", "hod", "manager"];
const ASSET_MANAGE_ROLES = ["admin", "superadmin", "hr", "manager"];
const ASSET_SELF_ROLES = ["employee", "admin", "superadmin", "hr", "hod", "manager", "accounts"];

router.use(protect);

router.get(
  "/dashboard",
  requireModulePermission("resources", "assets.asset.view", { legacyRoles: ASSET_VIEW_ROLES }),
  assetController.getDashboard
);

router.get(
  "/my-assets",
  requireModulePermission("resources", "assets.asset.view", { legacyRoles: ASSET_SELF_ROLES }),
  assetController.getMyAssets
);

router.get(
  "/warranty",
  requireModulePermission("resources", "assets.asset.view", { legacyRoles: ASSET_VIEW_ROLES }),
  assetController.getWarrantyAssets
);

router.get(
  "/history",
  requireModulePermission("resources", "assets.asset.view", { legacyRoles: ASSET_VIEW_ROLES }),
  assetController.getAssignmentHistory
);

router.get(
  "/repairs",
  requireModulePermission("resources", "assets.asset.view", { legacyRoles: ASSET_VIEW_ROLES }),
  assetController.getAllRepairs
);
router.post(
  "/repairs",
  requireModulePermission("resources", "assets.asset.manage", { legacyRoles: ASSET_MANAGE_ROLES }),
  assetController.createRepair
);
router.put(
  "/repairs/:repairId",
  requireModulePermission("resources", "assets.asset.manage", { legacyRoles: ASSET_MANAGE_ROLES }),
  assetController.updateRepair
);
router.post(
  "/repairs/:repairId/complete",
  requireModulePermission("resources", "assets.asset.manage", { legacyRoles: ASSET_MANAGE_ROLES }),
  assetController.completeRepair
);

router.get(
  "/",
  requireModulePermission("resources", "assets.asset.view", { legacyRoles: ASSET_VIEW_ROLES }),
  assetController.getAllAssets
);
router.post(
  "/",
  requireModulePermission("resources", "assets.asset.manage", { legacyRoles: ASSET_MANAGE_ROLES }),
  assetController.createAsset
);

router.get(
  "/:id",
  requireModulePermission("resources", "assets.asset.view", { legacyRoles: ASSET_VIEW_ROLES }),
  assetController.getAssetById
);

router.put(
  "/:id",
  requireModulePermission("resources", "assets.asset.manage", { legacyRoles: ASSET_MANAGE_ROLES }),
  assetController.updateAsset
);
router.delete(
  "/:id",
  requireModulePermission("resources", "assets.asset.manage", { legacyRoles: ASSET_MANAGE_ROLES }),
  assetController.deleteAsset
);

router.get(
  "/:id/history",
  requireModulePermission("resources", "assets.asset.view", { legacyRoles: ASSET_VIEW_ROLES }),
  assetController.getAssetHistory
);

router.post(
  "/:id/assign",
  requireModulePermission("resources", "assets.asset.manage", { legacyRoles: ASSET_MANAGE_ROLES }),
  assetController.assignAsset
);
router.post(
  "/:id/return",
  requireModulePermission("resources", "assets.asset.manage", { legacyRoles: ASSET_MANAGE_ROLES }),
  assetController.returnAsset
);
router.post(
  "/:id/mark-lost",
  requireModulePermission("resources", "assets.asset.manage", { legacyRoles: ASSET_MANAGE_ROLES }),
  assetController.markAsLost
);
router.post(
  "/:id/send-to-repair",
  requireModulePermission("resources", "assets.asset.manage", { legacyRoles: ASSET_MANAGE_ROLES }),
  assetController.sendToRepair
);

export default router;
