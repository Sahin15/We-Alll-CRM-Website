import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import {
  createBill,
  getAllBills,
  getBillById,
  updateBill,
  deleteBill,
  sendBillToClient,
  markBillAsPaid,
  getClientBills,
  getBillPDF,
  getOverdueBills,
  applyDiscount,
} from "../controllers/billController.js";

const router = express.Router();

// Write operations: admin/superadmin/accounts only
router.post(
  "/",
  protect,
  authorizeRoles("admin", "superadmin", "accounts"),
  createBill
);
router.put(
  "/:id",
  protect,
  authorizeRoles("admin", "superadmin", "accounts"),
  updateBill
);
router.delete(
  "/:id",
  protect,
  authorizeRoles("admin", "superadmin", "accounts"),
  deleteBill
);
router.post(
  "/:id/send",
  protect,
  authorizeRoles("admin", "superadmin", "accounts"),
  sendBillToClient
);
router.put(
  "/:id/mark-paid",
  protect,
  authorizeRoles("admin", "superadmin", "accounts"),
  markBillAsPaid
);
router.put(
  "/:id/discount",
  protect,
  authorizeRoles("admin", "superadmin", "accounts"),
  applyDiscount
);

// Read operations
router.get(
  "/",
  protect,
  authorizeRoles("admin", "superadmin", "accounts"),
  getAllBills
);
router.get(
  "/overdue",
  protect,
  authorizeRoles("admin", "superadmin", "accounts"),
  getOverdueBills
);
router.get(
  "/client/:clientId",
  protect,
  authorizeRoles("admin", "superadmin", "accounts", "client"),
  getClientBills
);
router.get(
  "/:id",
  protect,
  authorizeRoles("admin", "superadmin", "accounts", "client"),
  getBillById
);
router.get(
  "/:id/pdf",
  protect,
  authorizeRoles("admin", "superadmin", "accounts", "client"),
  getBillPDF
);

export default router;
