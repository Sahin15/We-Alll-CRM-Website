import { useCallback, useEffect, useMemo, useState } from "react";
import { salaryPreviewApi, salarySlipApi } from "../api/salaryApi";
import {
  payrollCompensationApi,
  payrollSimplePreviewApi,
} from "../api/payrollSimpleApi";

/**
 * Dashboard stats for Payroll Hub hero + KPI strip (compensation + period payout).
 *
 * @param {number} month
 * @param {number} year
 */
export function usePayrollHubStats(month, year) {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    configured: 0,
    needSetup: 0,
    estimatedGross: 0,
    paidNet: 0,
    previewCount: 0,
    creditedSlips: 0,
    periodRosterCount: 0,
  });
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!month || !year) return;
    setLoading(true);
    try {
      const [compRes, summaryRes, dashRes, rosterRes] = await Promise.all([
        payrollCompensationApi.getRoster(),
        salarySlipApi.getPayrollSummary({ month, year }),
        salaryPreviewApi.getHrDashboard(month, year, { params: { reconcile: 0 } }),
        payrollSimplePreviewApi.getRoster({ month, year }),
      ]);

      const rows = compRes.data?.data?.rows || [];
      const configuredRows = rows.filter((r) => r.hasStructure);
      const estimatedGross = configuredRows.reduce(
        (sum, r) => sum + (Number(r.monthlySalary) || 0),
        0
      );

      const summary = summaryRes.data || {};
      const paidNet = Number(summary.totalNetSalary) || 0;
      const dash = dashRes.data?.data || {};
      const previewCount =
        dash.statistics?.totalPreviews ?? (dash.previews || []).length;
      const periodRows = rosterRes.data?.data?.rows || rosterRes.data?.rows || [];

      setStats({
        totalEmployees: rows.length,
        configured: configuredRows.length,
        needSetup: rows.length - configuredRows.length,
        estimatedGross,
        paidNet,
        previewCount,
        creditedSlips: Number(summary.slipsCredited) || 0,
        periodRosterCount: periodRows.length,
      });
    } catch {
      setStats({
        totalEmployees: 0,
        configured: 0,
        needSetup: 0,
        estimatedGross: 0,
        paidNet: 0,
        previewCount: 0,
        creditedSlips: 0,
        periodRosterCount: 0,
      });
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const processingLabel = useMemo(() => {
    if (stats.creditedSlips > 0 || stats.paidNet > 0) return "Processed";
    if (stats.previewCount > 0) return "In review";
    return "Not processed";
  }, [stats.creditedSlips, stats.paidNet, stats.previewCount]);

  const processingVariant = useMemo(() => {
    if (stats.creditedSlips > 0 || stats.paidNet > 0) return "credited";
    if (stats.previewCount > 0) return "preview";
    return "warning";
  }, [stats.creditedSlips, stats.paidNet, stats.previewCount]);

  const pendingNet = Math.max(0, stats.estimatedGross - stats.paidNet);

  return {
    ...stats,
    pendingNet,
    processingLabel,
    processingVariant,
    loading,
    refresh,
  };
}

export default usePayrollHubStats;
