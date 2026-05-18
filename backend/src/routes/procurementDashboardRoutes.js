import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';
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
const adminRoles = ['admin', 'superadmin', 'accounts', 'hr', 'hod', 'manager'];

router.get('/dashboard/summary', protect, authorizeRoles(...adminRoles), getSummary);
router.get('/dashboard/budget-utilisation', protect, authorizeRoles(...adminRoles), getBudgetUtilisation);
router.get('/reports/spend-by-vendor', protect, authorizeRoles(...adminRoles), spendByVendor);
router.get('/reports/spend-by-department', protect, authorizeRoles(...adminRoles), spendByDepartment);
router.get('/reports/spend-by-category', protect, authorizeRoles(...adminRoles), spendByCategory);
router.get('/reports/monthly-trend', protect, authorizeRoles(...adminRoles), monthlyTrend);
router.get('/reports/pr-status-summary', protect, authorizeRoles(...adminRoles), prStatusSummary);
router.get('/reports/top-vendors', protect, authorizeRoles(...adminRoles), topVendors);
router.get('/reports/export', protect, authorizeRoles(...adminRoles), exportCSV);

export default router;
