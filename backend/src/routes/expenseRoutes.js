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
import { protect } from '../middleware/authMiddleware.js';


import { requireModulePermission } from "../authz/authzMiddleware.js";

const router = express.Router();

const EXPENSE_APPROVE_ROLES = ["admin", "hr", "superadmin", "manager"];
const EXPENSE_BUDGET_ADMIN_ROLES = ["admin", "superadmin"];
const EXPENSE_SELF_ROLES = [
  "employee",
  "hod",
  "sales",
  "manager",
  "hr",
  "admin",
  "superadmin",
];

router.use(protect);

router.get(
  "/my-expenses",
  requireModulePermission("finance", "expense.claim.create", { legacyRoles: EXPENSE_SELF_ROLES }),
  getMyExpenses
);
router.get(
  "/stats",
  requireModulePermission("finance", "expense.claim.create", { legacyRoles: EXPENSE_SELF_ROLES }),
  getExpenseStats
);
router.get(
  "/category/stats",
  requireModulePermission("finance", "expense.claim.create", { legacyRoles: EXPENSE_SELF_ROLES }),
  getCategoryStats
);
router.get(
  "/purposes",
  requireModulePermission("finance", "expense.claim.create", { legacyRoles: EXPENSE_SELF_ROLES }),
  getExpensePurposes
);
router.get(
  "/types",
  requireModulePermission("finance", "expense.claim.create", { legacyRoles: EXPENSE_SELF_ROLES }),
  getExpenseTypes
);
router.get(
  "/tracking/reimbursement",
  requireModulePermission("finance", "expense.claim.approve", { legacyRoles: EXPENSE_APPROVE_ROLES }),
  getReimbursementTracking
);
router.get(
  "/analytics/overview",
  requireModulePermission("finance", "expense.claim.approve", { legacyRoles: EXPENSE_APPROVE_ROLES }),
  getExpenseAnalytics
);
router.get(
  "/analytics/trends",
  requireModulePermission("finance", "expense.claim.approve", { legacyRoles: EXPENSE_APPROVE_ROLES }),
  getMonthlyTrends
);
router.get(
  "/analytics/budget",
  requireModulePermission("finance", "expense.claim.approve", { legacyRoles: EXPENSE_APPROVE_ROLES }),
  getBudgetTracking
);
router.get(
  "/analytics/budget-with-limits",
  requireModulePermission("finance", "expense.claim.approve", { legacyRoles: EXPENSE_APPROVE_ROLES }),
  getBudgetTrackingWithLimits
);
router.get(
  "/analytics/purpose-type-matrix",
  requireModulePermission("finance", "expense.claim.approve", { legacyRoles: EXPENSE_APPROVE_ROLES }),
  getPurposeTypeMatrix
);
router.get(
  "/budget/all",
  requireModulePermission("finance", "expense.claim.approve", { legacyRoles: EXPENSE_BUDGET_ADMIN_ROLES }),
  getAllBudgets
);
router.get(
  "/budget/:category",
  requireModulePermission("finance", "expense.claim.approve", { legacyRoles: EXPENSE_APPROVE_ROLES }),
  getBudgetByCategory
);
router.get(
  "/financial-years",
  requireModulePermission("finance", "expense.claim.approve", { legacyRoles: EXPENSE_APPROVE_ROLES }),
  getFinancialYears
);

router.post(
  "/",
  requireModulePermission("finance", "expense.claim.create", { legacyRoles: EXPENSE_SELF_ROLES }),
  createExpense
);
router.get(
  "/",
  requireModulePermission("finance", "expense.claim.approve", { legacyRoles: EXPENSE_APPROVE_ROLES }),
  getAllExpenses
);

router.post(
  "/search/advanced",
  requireModulePermission("finance", "expense.claim.create", { legacyRoles: EXPENSE_SELF_ROLES }),
  searchExpenses
);
router.post(
  "/export/data",
  requireModulePermission("finance", "expense.claim.approve", { legacyRoles: EXPENSE_APPROVE_ROLES }),
  exportExpenses
);
router.post(
  "/bulk/approve",
  requireModulePermission("finance", "expense.claim.approve", { legacyRoles: ["admin", "hr", "superadmin"] }),
  bulkApproveExpenses
);
router.post(
  "/bulk/reject",
  requireModulePermission("finance", "expense.claim.approve", { legacyRoles: ["admin", "hr", "superadmin"] }),
  bulkRejectExpenses
);
router.post(
  "/budget/set",
  requireModulePermission("finance", "expense.claim.approve", { legacyRoles: EXPENSE_BUDGET_ADMIN_ROLES }),
  setBudget
);
router.post(
  "/budget/bulk-set",
  requireModulePermission("finance", "expense.claim.approve", { legacyRoles: EXPENSE_BUDGET_ADMIN_ROLES }),
  setBulkBudgets
);

router.get(
  "/:id",
  requireModulePermission("finance", "expense.claim.create", { legacyRoles: EXPENSE_SELF_ROLES }),
  getExpenseById
);
router.put(
  "/:id",
  requireModulePermission("finance", "expense.claim.create", { legacyRoles: EXPENSE_SELF_ROLES }),
  updateExpense
);
router.delete(
  "/:id",
  requireModulePermission("finance", "expense.claim.create", { legacyRoles: EXPENSE_SELF_ROLES }),
  deleteExpense
);
router.patch(
  "/:id/approve",
  requireModulePermission("finance", "expense.claim.approve", { legacyRoles: ["admin", "hr", "superadmin"] }),
  approveExpense
);
router.patch(
  "/:id/reject",
  requireModulePermission("finance", "expense.claim.approve", { legacyRoles: ["admin", "hr", "superadmin"] }),
  rejectExpense
);
router.patch(
  "/:id/reimburse",
  requireModulePermission("finance", "expense.claim.approve", { legacyRoles: ["admin", "hr", "superadmin"] }),
  markAsReimbursed
);

export default router;
