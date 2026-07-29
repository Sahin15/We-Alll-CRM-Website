import { buildSimplePreviewDto } from "../src/services/payroll/simplePayrollPreviewService.js";

describe("buildSimplePreviewDto (SP-03)", () => {
  it("returns not applicable for legacy structures", () => {
    const dto = buildSimplePreviewDto({
      structure: { payrollMode: "legacy", basicSalary: 30000 },
      adjustments: [],
    });
    expect(dto.applicable).toBe(false);
  });

  it("builds expandable sections for simple mode", () => {
    const dto = buildSimplePreviewDto({
      structure: {
        payrollMode: "simple",
        monthlySalary: 30000,
        tdsEnabled: true,
        tds: 1500,
        effectiveFrom: "2026-01-01",
      },
      adjustments: [
        {
          _id: "a1",
          type: "bonus",
          amount: 2000,
          status: "approved",
          reason: "Festive",
        },
        {
          _id: "a2",
          type: "penalty",
          amount: 500,
          status: "draft",
          reason: "Pending",
        },
      ],
      automaticDeductions: 1000,
      automaticLines: [
        { label: "Loss of pay", amount: 1000, detail: "1 day" },
      ],
    });

    expect(dto.applicable).toBe(true);
    expect(dto.sections.monthlySalary.amount).toBe(30000);
    expect(dto.sections.automaticDeductions.amount).toBe(1000);
    expect(dto.sections.manualAdjustments.pendingCount).toBe(1);
    // Net uses approved only: 30000 - 1000 + 2000 - 1500 = 29500
    expect(dto.sections.netSalary.amount).toBe(29500);
    expect(dto.sections.netSalary.rejected).toBe(false);
    expect(dto.sections.tds.amount).toBe(1500);
  });

  it("flags rejected negative net", () => {
    const dto = buildSimplePreviewDto({
      structure: {
        payrollMode: "simple",
        monthlySalary: 1000,
        tdsEnabled: false,
      },
      adjustments: [],
      automaticDeductions: 5000,
    });
    expect(dto.sections.netSalary.rejected).toBe(true);
    expect(dto.sections.netSalary.amount).toBeNull();
  });
});
