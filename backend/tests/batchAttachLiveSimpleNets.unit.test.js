import { describe, it, expect } from "@jest/globals";
import { buildSimplePreviewDto } from "../src/services/payroll/simplePayrollPreviewService.js";

describe("batchAttachLiveSimpleNets (pure net path)", () => {
  it("buildSimplePreviewDto matches expected net for simple structure + bonus", () => {
    const structure = {
      payrollMode: "simple",
      employee: "emp1",
      monthlySalary: 30000,
      tdsEnabled: true,
      tds: 1500,
    };
    const adjustments = [
      { type: "bonus", amount: 2000, status: "approved" },
    ];
    const dto = buildSimplePreviewDto({
      structure,
      adjustments,
      automaticDeductions: 0,
    });
    expect(dto.applicable).toBe(true);
    expect(dto.totals.netSalary).toBe(30500);
  });
});
