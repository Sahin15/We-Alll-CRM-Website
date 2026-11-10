import { useCallback, useEffect, useState } from "react";
import { salarySlipApi } from "../api/salaryApi";
import { salaryPreviewApi } from "../api/salaryApi";
import { payrollSimplePreviewApi } from "../api/payrollSimpleApi";

/**
 * Period-level KPIs for Payroll Hub strip.
 *
 * @param {number} month
 * @param {number} year
 */
export function usePayrollPeriodHealth(month, year) {
  const [health, setHealth] = useState({
    previewCount: 0,
    creditedCount: 0,
    openQueries: 0,
    missingSlipCount: 0,
    totalNet: 0,
  });
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!month || !year) return;
    setLoading(true);
    try {
      const [dashRes, summaryRes, rosterRes] = await Promise.all([
        salaryPreviewApi.getHrDashboard(month, year, { params: { reconcile: 0 } }),
        salarySlipApi.getPayrollSummary({ month, year }),
        payrollSimplePreviewApi.getRoster({ month, year }),
      ]);
      const previews = dashRes.data?.data?.previews || [];
      const stats = dashRes.data?.data?.statistics || {};
      const summary = summaryRes.data || {};
      const rows = rosterRes.data?.data?.rows || rosterRes.data?.rows || [];
      const missingSlip = rows.filter((r) => r.hasStructure && !r.hasSlip).length;
      const openQueries = previews.reduce(
        (acc, p) =>
          acc +
          (p.employeeQueries || []).filter((q) => q.status === "pending").length,
        0
      );

      setHealth({
        previewCount: stats.totalPreviews ?? previews.length,
        creditedCount: summary.slipsCredited ?? summary.totalEmployees ?? 0,
        openQueries,
        missingSlipCount: missingSlip,
        totalNet: summary.totalNetSalary || 0,
      });
    } catch {
      setHealth({
        previewCount: 0,
        creditedCount: 0,
        openQueries: 0,
        missingSlipCount: 0,
        totalNet: 0,
      });
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { health, loading, refresh };
}

export default usePayrollPeriodHealth;
