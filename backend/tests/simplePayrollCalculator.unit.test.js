import {
  perDaySalary,
  amountForDays,
  sumAdjustments,
  computeSimpleNet,
  lateDeductionFromChoice,
  DEFAULT_DAY_DIVISOR,
} from "../src/services/payroll/simplePayrollCalculator.js";

describe("simplePayrollCalculator", () => {
  it("uses Monthly Salary / 30 for per-day by default", () => {
    expect(DEFAULT_DAY_DIVISOR).toBe(30);
    expect(perDaySalary(30000)).toBe(1000);
    expect(amountForDays(30000, 1)).toBe(1000);
    expect(amountForDays(30000, 2)).toBe(2000);
  });

  it("sums approved adjustments with correct signs", () => {
    const total = sumAdjustments([
      { type: "bonus", amount: 5000, status: "approved" },
      { type: "penalty", amount: 1000, status: "approved" },
      { type: "bonus", amount: 999, status: "draft" },
    ]);
    expect(total).toBe(4000);
  });

  it("computes net = monthly − auto + adjustments − TDS", () => {
    const result = computeSimpleNet({
      monthlySalary: 30000,
      automaticDeductions: 1000,
      adjustments: [
        { type: "incentive", amount: 2000, status: "approved" },
        { type: "advance_recovery", amount: 500, status: "approved" },
      ],
      tdsAmount: 1500,
    });
    expect(result.rejected).toBe(false);
    expect(result.netSalary).toBe(29000);
  });

  it("rejects negative net by default", () => {
    const result = computeSimpleNet({
      monthlySalary: 1000,
      automaticDeductions: 2000,
    });
    expect(result.rejected).toBe(true);
    expect(result.rejectReason).toMatch(/negative/i);
  });

  it("builds late deduction from HR choice", () => {
    expect(lateDeductionFromChoice("none", 30000)).toEqual({
      amount: 0,
      applied: false,
    });
    expect(lateDeductionFromChoice("one_day", 30000).amount).toBe(1000);
    expect(lateDeductionFromChoice("two_days", 30000).amount).toBe(2000);
    expect(lateDeductionFromChoice("custom", 30000, 750).amount).toBe(750);
  });
});
