import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { requireModulePermission } from '../authz/authzMiddleware.js';
import {
  getSummary,
  getBudgetUtilisation,
  spendByVendor,
  spendByDepartment,
  spendByCategory,
  monthlyTrend,
  prStatusSummary,
  topVendors,
  exportCSV,
} from '../controllers/procurementDashboardController.js';

const router = express.Router();
const dashboardRoles = ['admin', 'superadmin', 'accounts', 'hr', 'hod', 'manager'];

const procurementDashboardView = requireModulePermission('procurement', 'procurement.pr.view', {
  legacyRoles: dashboardRoles,
});

router.get('/dashboard/summary', protect, procurementDashboardView, getSummary);
router.get('/dashboard/budget-utilisation', protect, procurementDashboardView, getBudgetUtilisation);
router.get('/reports/spend-by-vendor', protect, procurementDashboardView, spendByVendor);
router.get('/reports/spend-by-department', protect, procurementDashboardView, spendByDepartment);
router.get('/reports/spend-by-category', protect, procurementDashboardView, spendByCategory);
router.get('/reports/monthly-trend', protect, procurementDashboardView, monthlyTrend);
router.get('/reports/pr-status-summary', protect, procurementDashboardView, prStatusSummary);
router.get('/reports/top-vendors', protect, procurementDashboardView, topVendors);
router.get('/reports/export', protect, procurementDashboardView, exportCSV);

export default router;
