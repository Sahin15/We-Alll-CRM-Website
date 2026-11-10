import { createContext, useContext, useMemo, useState } from "react";

const PayrollPeriodContext = createContext(null);

const defaultPeriod = () => {
  const now = new Date();
  const m = now.getMonth();
  return {
    month: m === 0 ? 12 : m,
    year: m === 0 ? now.getFullYear() - 1 : now.getFullYear(),
  };
};

/**
 * Shared pay period (month/year) for Salary Management tabs.
 */
export function PayrollPeriodProvider({ children }) {
  const init = useMemo(() => defaultPeriod(), []);
  const [month, setMonth] = useState(init.month);
  const [year, setYear] = useState(init.year);
  const [paymentDateLabel, setPaymentDateLabel] = useState(null);

  const value = useMemo(
    () => ({
      month,
      year,
      setMonth,
      setYear,
      setPeriod: (m, y) => {
        setMonth(m);
        setYear(y);
      },
      paymentDateLabel,
      setPaymentDateLabel,
    }),
    [month, year, paymentDateLabel]
  );

  return (
    <PayrollPeriodContext.Provider value={value}>
      {children}
    </PayrollPeriodContext.Provider>
  );
}

/**
 * @returns {ReturnType<typeof PayrollPeriodProvider> extends React.Provider<infer V> ? NonNullable<V> : never}
 */
export function usePayrollPeriod() {
  return useContext(PayrollPeriodContext);
}

/**
 * Use shared period from Salary Management when present; else local defaults.
 * @param {{ month: number, year: number }} fallback
 */
export function usePayrollPeriodWithFallback(fallback) {
  const ctx = useContext(PayrollPeriodContext);
  const [localMonth, setLocalMonth] = useState(fallback.month);
  const [localYear, setLocalYear] = useState(fallback.year);

  if (ctx) {
    return {
      month: ctx.month,
      year: ctx.year,
      setMonth: ctx.setMonth,
      setYear: ctx.setYear,
      setPeriod: ctx.setPeriod,
      paymentDateLabel: ctx.paymentDateLabel,
      setPaymentDateLabel: ctx.setPaymentDateLabel,
      fromContext: true,
    };
  }

  return {
    month: localMonth,
    year: localYear,
    setMonth: setLocalMonth,
    setYear: setLocalYear,
    setPeriod: (m, y) => {
      setLocalMonth(m);
      setLocalYear(y);
    },
    paymentDateLabel: null,
    setPaymentDateLabel: () => {},
    fromContext: false,
  };
}

export default PayrollPeriodContext;
