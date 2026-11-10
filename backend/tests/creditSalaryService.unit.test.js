import { describe, it, expect } from "@jest/globals";
import {
  slipPayloadFromPreview,
  getMonthName,
} from "../src/services/payroll/creditSalaryService.js";

describe("creditSalaryService helpers", () => {
  it("maps month numbers to names", () => {
    expect(getMonthName(10)).toBe("October");
  });

  it("builds slip payload from preview salaryBreakdown", () => {
    const payload = slipPayloadFromPreview({
      _id: "preview1",
      payrollMode: "simple",
      workingDaysBreakdown: { workingDays: 22 },
      leaveImpact: { unpaidLeaves: 1, paidLeaves: 0 },
      salaryBreakdown: {
        earnings: { basicSalary: 30000, bonus: 0 },
        deductions: { professionalTax: 1500, lossOfPay: 0 },
      },
    });

    expect(payload).not.toBeNull();
    expect(payload.earnings.basicSalary).toBe(30000);
    expect(payload.previewId).toBe("preview1");
    expect(payload.attendance.totalWorkingDays).toBe(22);
    expect(payload.attendance.daysWorked).toBe(21);
  });

  it("returns null when preview breakdown missing", () => {
    expect(slipPayloadFromPreview({ _id: "x" })).toBeNull();
  });
});
