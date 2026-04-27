import express from "express";
import {
  createExpense,
  getMyExpenses,
  getAllExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
  getExpenseStats,
  approveExpense,
  rejectExpense,
  markAsReimbursed,
  getReimbursementTracking,
  searchExpenses,
  exportExpenses,
  bulkApproveExpenses,
  bulkRejectExpenses,
  getExpenseAnalytics,
  getMonthlyTrends,
  getBudgetTracking,
  getCategoryStats,
  getAllBudgets,
  getBudgetByCategory,
  setBudget,
  setBulkBudgets,
  getBudgetTrackingWithLimits,
  getFinancialYears,
  getExpensePurposes,
  getExpenseTypes,
  getPurposeTypeMatrix,
} from "../controllers/expenseController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

// All routes are protected (require authentication)
router.use(protect);

// Specific routes (must come before parameterized routes)
router.get("/my-expenses", getMyExpenses);
router.get("/stats", getExpenseStats);
router.get("/category/stats", getCategoryStats);
router.get("/purposes", getExpensePurposes);
router.get("/types", getExpenseTypes);
router.get("/tracking/reimbursement", authorizeRoles("admin", "hr", "superadmin", "manager"), getReimbursementTracking);
router.get("/analytics/overview", authorizeRoles("admin", "hr", "superadmin", "manager"), getExpenseAnalytics);
router.get("/analytics/trends", authorizeRoles("admin", "hr", "superadmin", "manager"), getMonthlyTrends);
router.get("/analytics/budget", authorizeRoles("admin", "hr", "superadmin", "manager"), getBudgetTracking);
router.get("/analytics/budget-with-limits", authorizeRoles("admin", "hr", "superadmin", "manager"), getBudgetTrackingWithLimits);
router.get("/analytics/purpose-type-matrix", authorizeRoles("admin", "hr", "superadmin", "manager"), getPurposeTypeMatrix);
router.get("/budget/all", authorizeRoles("admin", "superadmin"), getAllBudgets);
router.get("/budget/:category", authorizeRoles("admin", "hr", "superadmin", "manager"), getBudgetByCategory);
router.get("/financial-years", authorizeRoles("admin", "hr", "superadmin", "manager"), getFinancialYears);

// General routes
router.post("/", createExpense);
router.get("/", authorizeRoles("admin", "hr", "superadmin", "manager"), getAllExpenses);

// POST routes
router.post("/search/advanced", searchExpenses);
router.post("/export/data", authorizeRoles("admin", "hr", "superadmin", "manager"), exportExpenses);
router.post("/bulk/approve", authorizeRoles("admin", "hr", "superadmin"), bulkApproveExpenses);
router.post("/bulk/reject", authorizeRoles("admin", "hr", "superadmin"), bulkRejectExpenses);
router.post("/budget/set", authorizeRoles("admin", "superadmin"), setBudget);
router.post("/budget/bulk-set", authorizeRoles("admin", "superadmin"), setBulkBudgets);

// Parameterized routes (must come last)
router.get("/:id", getExpenseById);
router.put("/:id", updateExpense);
router.delete("/:id", deleteExpense);
router.patch("/:id/approve", authorizeRoles("admin", "hr", "superadmin"), approveExpense);
router.patch("/:id/reject", authorizeRoles("admin", "hr", "superadmin"), rejectExpense);
router.patch("/:id/reimburse", authorizeRoles("admin", "hr", "superadmin"), markAsReimbursed);

export default router;
