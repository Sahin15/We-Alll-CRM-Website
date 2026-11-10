/**
 * Human-readable labels and values for payroll adjustment lines (incl. earned leave).
 */

export function formatAdjustmentTypeLabel(type) {
  if (type === "leave_balance_deduction") return "Earned leave deduction";
  if (type === "absent_deduction") return "Salary deduction (absence)";
  if (!type) return "Adjustment";
  return String(type).replace(/_/g, " ");
}

/**
 * @param {{ type?: string, leaveDays?: number|null, payrollMeta?: { daysDeducted?: number } }} line
 * @returns {number|null}
 */
export function resolveLeaveDays(line) {
  if (!line || line.type !== "leave_balance_deduction") return null;
  const fromField = line.leaveDays;
  if (fromField != null && Number(fromField) > 0) return Number(fromField);
  const fromMeta = line.payrollMeta?.daysDeducted;
  if (fromMeta != null && Number(fromMeta) > 0) return Number(fromMeta);
  return null;
}

/**
 * @param {object} line - preview adjustment line
 * @param {(n: number) => string} formatInr
 */
export function formatAdjustmentLineValue(line, formatInr) {
  if (line?.type === "leave_balance_deduction") {
    const days = resolveLeaveDays(line);
    if (days != null) {
      return `${days} day(s) from balance — no change to net pay`;
    }
    return "Earned leave (days not recorded)";
  }
  const signed = Number(line?.signedAmount) || 0;
  return `${signed >= 0 ? "+" : ""}${formatInr(signed)}`;
}
