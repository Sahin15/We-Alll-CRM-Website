import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';
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
  legacyAllowed: true,
});

router.get('/dashboard/summary', protect, authorizeRoles(...dashboardRoles), procurementDashboardView, getSummary);
router.get(
  '/dashboard/budget-utilisation',
  protect,
  authorizeRoles(...dashboardRoles),
  procurementDashboardView,
  getBudgetUtilisation
);
router.get('/reports/spend-by-vendor', protect, authorizeRoles(...dashboardRoles), procurementDashboardView, spendByVendor);
router.get(
  '/reports/spend-by-department',
  protect,
  authorizeRoles(...dashboardRoles),
  procurementDashboardView,
  spendByDepartment
);
router.get('/reports/spend-by-category', protect, authorizeRoles(...dashboardRoles), procurementDashboardView, spendByCategory);
router.get('/reports/monthly-trend', protect, authorizeRoles(...dashboardRoles), procurementDashboardView, monthlyTrend);
router.get('/reports/pr-status-summary', protect, authorizeRoles(...dashboardRoles), procurementDashboardView, prStatusSummary);
router.get('/reports/top-vendors', protect, authorizeRoles(...dashboardRoles), procurementDashboardView, topVendors);
router.get('/reports/export', protect, authorizeRoles(...dashboardRoles), procurementDashboardView, exportCSV);

export default router;
