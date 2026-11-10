/**
 * Payroll Hub V2 — unified HR / finance / employee UX.
 * Off only when VITE_PAYROLL_HUB_V2=false (legacy Salary Management layout).
 */
export const isPayrollHubV2 = () =>
  import.meta.env.VITE_PAYROLL_HUB_V2 !== "false";
