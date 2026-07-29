/**
 * Normalize a SalaryStructure (flat V1) or nested shape into pro-rata component maps.
 * Live structures store flat fields (basicSalary, hra, …); the calculator historically
 * expected `{ earnings, deductions }` — this adapter bridges both.
 *
 * @param {Object|null|undefined} structure
 * @returns {{ earnings: Record<string, number>, deductions: Record<string, number> }}
 */
export function toProRataComponentMaps(structure) {
  if (!structure || typeof structure !== "object") {
    return { earnings: {}, deductions: {} };
  }

  const hasNestedEarnings =
    structure.earnings &&
    typeof structure.earnings === "object" &&
    !Array.isArray(structure.earnings);
  const hasNestedDeductions =
    structure.deductions &&
    typeof structure.deductions === "object" &&
    !Array.isArray(structure.deductions);

  if (hasNestedEarnings || hasNestedDeductions) {
    const earnings = { ...(structure.earnings || {}) };
    const deductions = { ...(structure.deductions || {}) };
    // Drop non-numeric nested junk (e.g. otherAllowances arrays)
    for (const key of Object.keys(earnings)) {
      if (typeof earnings[key] !== "number") delete earnings[key];
    }
    for (const key of Object.keys(deductions)) {
      if (typeof deductions[key] !== "number") delete deductions[key];
    }
    return { earnings, deductions };
  }

  return {
    earnings: {
      basicSalary: Number(structure.basicSalary) || 0,
      hra: Number(structure.hra) || 0,
      specialAllowance: Number(structure.specialAllowance) || 0,
      transportAllowance: Number(structure.transportAllowance) || 0,
      medicalAllowance: Number(structure.medicalAllowance) || 0,
    },
    deductions: {
      providentFund: Number(structure.providentFund) || 0,
      professionalTax: Number(structure.professionalTax) || 0,
      tds: Number(structure.tds) || 0,
      esi: Number(structure.esi) || 0,
    },
  };
}

/**
 * R1 policy: unpaid time money impact lives only on `lossOfPay`.
 * `unpaidLeaveDeduction` is legacy and must stay 0 so pre-save does not double-count.
 *
 * @param {number} lossOfPayAmount
 * @returns {{ lossOfPay: number, unpaidLeaveDeduction: number }}
 */
export function resolveAttendanceMoneyDeductions(lossOfPayAmount) {
  const lossOfPay = Math.round(Number(lossOfPayAmount) || 0);
  return {
    lossOfPay,
    unpaidLeaveDeduction: 0,
  };
}
