/**
 * Detect whether a stored SalaryPreview should use the Simple Payroll UI.
 * Older docs omit payrollMode; mongoose must not force them to "legacy".
 *
 * @param {object|null|undefined} preview
 * @returns {boolean}
 */
export function isSimpleSalaryPreview(preview) {
  if (!preview) return false;
  if (preview.payrollMode === "simple") return true;
  if (preview.payrollMode === "legacy") return false;

  const e = preview.salaryBreakdown?.earnings || {};
  const d = preview.salaryBreakdown?.deductions || {};
  const legacyEarn =
    (Number(e.hra) || 0) +
    (Number(e.specialAllowance) || 0) +
    (Number(e.transportAllowance) || 0) +
    (Number(e.medicalAllowance) || 0);
  const legacyDed =
    (Number(d.providentFund) || 0) +
    (Number(d.professionalTax) || 0) +
    (Number(d.esi) || 0);

  return (
    legacyEarn === 0 &&
    legacyDed === 0 &&
    (Number(e.basicSalary) || 0) > 0
  );
}

/**
 * Map a stored SalaryPreview document into the Simple Payroll preview DTO shape
 * so the same accordion UI can render without a live API call.
 *
 * @param {object} preview
 * @returns {object}
 */
export function mapStoredPreviewToSimpleDto(preview) {
  const e = preview.salaryBreakdown?.earnings || {};
  const d = preview.salaryBreakdown?.deductions || {};
  const monthly = Number(e.basicSalary) || 0;
  const tds = Number(d.tds) || 0;
  const perDay = Number(preview.leaveImpact?.perDaySalary) || Math.round(monthly / 30);

  /** @type {Array<{ type: string, amount: number, signedAmount: number, status: string, reason: string }>} */
  const lines = [];

  if ((e.bonus || 0) > 0) {
    lines.push({
      type: "bonus",
      amount: e.bonus,
      signedAmount: e.bonus,
      status: "approved",
      reason: "",
    });
  }
  if ((e.incentives || 0) > 0) {
    lines.push({
      type: "incentive",
      amount: e.incentives,
      signedAmount: e.incentives,
      status: "approved",
      reason: "",
    });
  }
  (e.otherAllowances || []).forEach((a) => {
    lines.push({
      type: a.name || "addition",
      amount: a.amount,
      signedAmount: Number(a.amount) || 0,
      status: "approved",
      reason: "",
    });
  });
  if ((d.advances || 0) > 0) {
    lines.push({
      type: "advance_recovery",
      amount: d.advances,
      signedAmount: -Math.abs(d.advances),
      status: "approved",
      reason: "",
    });
  }
  if ((d.lossOfPay || 0) > 0) {
    lines.push({
      type: "absent_deduction",
      amount: d.lossOfPay,
      signedAmount: -Math.abs(d.lossOfPay),
      status: "approved",
      reason: "",
    });
  }
  (d.otherDeductions || []).forEach((x) => {
    lines.push({
      type: x.name || "deduction",
      amount: x.amount,
      signedAmount: -Math.abs(Number(x.amount) || 0),
      status: "approved",
      reason: x.reason || "",
    });
  });

  const adjustmentsTotal = lines.reduce((s, l) => s + l.signedAmount, 0);
  const net = Number(preview.salaryBreakdown?.netSalary);
  const unpaid = Number(preview.leaveImpact?.unpaidLeaves) || 0;

  return {
    applicable: true,
    payrollMode: "simple",
    dayDivisor: 30,
    perDaySalary: perDay,
    sections: {
      monthlySalary: {
        label: "Monthly Salary",
        amount: monthly,
        detail: `Per day (÷30): ₹${perDay.toLocaleString("en-IN")}`,
      },
      manualAdjustments: {
        label: "Manual Adjustments",
        amount: adjustmentsTotal,
        lines,
        pendingCount: 0,
        note: null,
      },
      tds: {
        label: "TDS",
        enabled: tds > 0,
        amount: tds,
      },
      netSalary: {
        label: "Final Net Salary",
        amount: Number.isFinite(net) ? net : monthly + adjustmentsTotal - tds,
        rejected: false,
        rejectReason: null,
      },
    },
    totals: {
      monthlySalary: monthly,
      automaticDeductions: 0,
      adjustmentsTotal,
      tdsAmount: tds,
      netSalary: Number.isFinite(net) ? net : monthly + adjustmentsTotal - tds,
      rejected: false,
    },
    attendanceReport: {
      unpaidLeaveDays: unpaid,
      paidLeaveDays: Number(preview.leaveImpact?.paidLeaves) || 0,
      suggestedDeduction: unpaid * perDay,
      perDaySalary: perDay,
      detail:
        unpaid > 0
          ? `${unpaid} unpaid day(s) × ₹${perDay} (suggestion only — not applied)`
          : "No unpaid leave suggested for this period",
      note: "Deductions are manual. Review attendance and add an adjustment if needed.",
    },
  };
}
