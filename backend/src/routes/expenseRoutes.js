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
import { requireModulePermission } from "../authz/authzMiddleware.js";

const router = express.Router();

const EXPENSE_APPROVE_ROLES = ["admin", "hr", "superadmin", "manager"];
const EXPENSE_BUDGET_ADMIN_ROLES = ["admin", "superadmin"];

router.use(protect);

router.get(
  "/my-expenses",
  requireModulePermission("finance", "expense.claim.create", { legacyAllowed: true }),
  getMyExpenses
);
router.get(
  "/stats",
  requireModulePermission("finance", "expense.claim.create", { legacyAllowed: true }),
  getExpenseStats
);
router.get(
  "/category/stats",
  requireModulePermission("finance", "expense.claim.create", { legacyAllowed: true }),
  getCategoryStats
);
router.get(
  "/purposes",
  requireModulePermission("finance", "expense.claim.create", { legacyAllowed: true }),
  getExpensePurposes
);
router.get(
  "/types",
  requireModulePermission("finance", "expense.claim.create", { legacyAllowed: true }),
  getExpenseTypes
);
router.get(
  "/tracking/reimbursement",
  authorizeRoles(...EXPENSE_APPROVE_ROLES),
  requireModulePermission("finance", "expense.claim.approve", { legacyRoles: EXPENSE_APPROVE_ROLES }),
  getReimbursementTracking
);
router.get(
  "/analytics/overview",
  authorizeRoles(...EXPENSE_APPROVE_ROLES),
  requireModulePermission("finance", "expense.claim.approve", { legacyRoles: EXPENSE_APPROVE_ROLES }),
  getExpenseAnalytics
);
router.get(
  "/analytics/trends",
  authorizeRoles(...EXPENSE_APPROVE_ROLES),
  requireModulePermission("finance", "expense.claim.approve", { legacyRoles: EXPENSE_APPROVE_ROLES }),
  getMonthlyTrends
);
router.get(
  "/analytics/budget",
  authorizeRoles(...EXPENSE_APPROVE_ROLES),
  requireModulePermission("finance", "expense.claim.approve", { legacyRoles: EXPENSE_APPROVE_ROLES }),
  getBudgetTracking
);
router.get(
  "/analytics/budget-with-limits",
  authorizeRoles(...EXPENSE_APPROVE_ROLES),
  requireModulePermission("finance", "expense.claim.approve", { legacyRoles: EXPENSE_APPROVE_ROLES }),
  getBudgetTrackingWithLimits
);
router.get(
  "/analytics/purpose-type-matrix",
  authorizeRoles(...EXPENSE_APPROVE_ROLES),
  requireModulePermission("finance", "expense.claim.approve", { legacyRoles: EXPENSE_APPROVE_ROLES }),
  getPurposeTypeMatrix
);
router.get(
  "/budget/all",
  authorizeRoles(...EXPENSE_BUDGET_ADMIN_ROLES),
  requireModulePermission("finance", "expense.claim.approve", { legacyRoles: EXPENSE_BUDGET_ADMIN_ROLES }),
  getAllBudgets
);
router.get(
  "/budget/:category",
  authorizeRoles(...EXPENSE_APPROVE_ROLES),
  requireModulePermission("finance", "expense.claim.approve", { legacyRoles: EXPENSE_APPROVE_ROLES }),
  getBudgetByCategory
);
router.get(
  "/financial-years",
  authorizeRoles(...EXPENSE_APPROVE_ROLES),
  requireModulePermission("finance", "expense.claim.approve", { legacyRoles: EXPENSE_APPROVE_ROLES }),
  getFinancialYears
);

router.post(
  "/",
  requireModulePermission("finance", "expense.claim.create", { legacyAllowed: true }),
  createExpense
);
router.get(
  "/",
  authorizeRoles(...EXPENSE_APPROVE_ROLES),
  requireModulePermission("finance", "expense.claim.approve", { legacyRoles: EXPENSE_APPROVE_ROLES }),
  getAllExpenses
);

router.post(
  "/search/advanced",
  requireModulePermission("finance", "expense.claim.create", { legacyAllowed: true }),
  searchExpenses
);
router.post(
  "/export/data",
  authorizeRoles(...EXPENSE_APPROVE_ROLES),
  requireModulePermission("finance", "expense.claim.approve", { legacyRoles: EXPENSE_APPROVE_ROLES }),
  exportExpenses
);
router.post(
  "/bulk/approve",
  authorizeRoles("admin", "hr", "superadmin"),
  requireModulePermission("finance", "expense.claim.approve", { legacyRoles: ["admin", "hr", "superadmin"] }),
  bulkApproveExpenses
);
router.post(
  "/bulk/reject",
  authorizeRoles("admin", "hr", "superadmin"),
  requireModulePermission("finance", "expense.claim.approve", { legacyRoles: ["admin", "hr", "superadmin"] }),
  bulkRejectExpenses
);
router.post(
  "/budget/set",
  authorizeRoles(...EXPENSE_BUDGET_ADMIN_ROLES),
  requireModulePermission("finance", "expense.claim.approve", { legacyRoles: EXPENSE_BUDGET_ADMIN_ROLES }),
  setBudget
);
router.post(
  "/budget/bulk-set",
  authorizeRoles(...EXPENSE_BUDGET_ADMIN_ROLES),
  requireModulePermission("finance", "expense.claim.approve", { legacyRoles: EXPENSE_BUDGET_ADMIN_ROLES }),
  setBulkBudgets
);

router.get(
  "/:id",
  requireModulePermission("finance", "expense.claim.create", { legacyAllowed: true }),
  getExpenseById
);
router.put(
  "/:id",
  requireModulePermission("finance", "expense.claim.create", { legacyAllowed: true }),
  updateExpense
);
router.delete(
  "/:id",
  requireModulePermission("finance", "expense.claim.create", { legacyAllowed: true }),
  deleteExpense
);
router.patch(
  "/:id/approve",
  authorizeRoles("admin", "hr", "superadmin"),
  requireModulePermission("finance", "expense.claim.approve", { legacyRoles: ["admin", "hr", "superadmin"] }),
  approveExpense
);
router.patch(
  "/:id/reject",
  authorizeRoles("admin", "hr", "superadmin"),
  requireModulePermission("finance", "expense.claim.approve", { legacyRoles: ["admin", "hr", "superadmin"] }),
  rejectExpense
);
router.patch(
  "/:id/reimburse",
  authorizeRoles("admin", "hr", "superadmin"),
  requireModulePermission("finance", "expense.claim.approve", { legacyRoles: ["admin", "hr", "superadmin"] }),
  markAsReimbursed
);

export default router;
