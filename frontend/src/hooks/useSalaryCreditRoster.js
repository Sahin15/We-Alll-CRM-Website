import { useCallback, useEffect, useState } from "react";
import { payrollPeriodApi } from "../api/payrollPeriodApi";
import { payrollSimplePreviewApi } from "../api/payrollSimpleApi";

/**
 * Payment date + roster rows for credit-salary modals.
 *
 * @param {number} month
 * @param {number} year
 */
export function useSalaryCreditRoster(month, year) {
  const [paymentDate, setPaymentDate] = useState(null);
  const [rosterRows, setRosterRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!month || !year) return;
    setLoading(true);
    try {
      const [dateRes, rosterRes] = await Promise.all([
        payrollPeriodApi.getPaymentDate(year, month),
        payrollSimplePreviewApi.getRoster({ month, year }),
      ]);
      const iso = dateRes.data?.data?.salaryPaymentDate || null;
      setPaymentDate(iso);
      const body = rosterRes.data?.data ?? rosterRes.data;
      setRosterRows(body?.rows || []);
    } catch {
      setPaymentDate(null);
      setRosterRows([]);
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { paymentDate, rosterRows, loading, refresh };
}

export default useSalaryCreditRoster;
