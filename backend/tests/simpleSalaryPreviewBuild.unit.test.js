import {
  finalizePreviewBreakdown,
  sumMoneyBag,
} from "../src/services/payroll/simpleSalaryPreviewBuild.js";
import { mapSimpleStructureToSlipFields } from "../src/services/payroll/simpleSlipPersist.js";

describe("simpleSalaryPreviewBuild", () => {
  it("sums money bags including allowance arrays", () => {
    expect(
      sumMoneyBag({
        basicSalary: 30000,
        bonus: 2000,
        otherAllowances: [{ name: "x", amount: 500 }],
      })
    ).toBe(32500);
  });

  it("builds simple preview breakdown with no auto LOP and approved adjustment", () => {
    const mapped = mapSimpleStructureToSlipFields({
      structure: {
        payrollMode: "simple",
        monthlySalary: 30000,
        tdsEnabled: true,
        tds: 1500,
        providentFund: 0,
        professionalTax: 0,
        esi: 0,
      },
      adjustments: [
        {
          type: "bonus",
          amount: 2000,
          status: "approved",
          reason: "Festive",
        },
      ],
      lossOfPay: 0,
      extras: {},
    });

    const finalized = finalizePreviewBreakdown(mapped);
    expect(finalized.deductions.lossOfPay).toBe(0);
    expect(finalized.earnings.basicSalary).toBe(30000);
    expect(finalized.earnings.bonus).toBe(2000);
    expect(finalized.deductions.tds).toBe(1500);
    // 30000 + 2000 - 1500 = 30500
    expect(finalized.netSalary).toBe(30500);
  });

  it("finalized preview net matches simpleMeta when structure still has legacy PF/PT/ESI", () => {
    const mapped = mapSimpleStructureToSlipFields({
      structure: {
        payrollMode: "simple",
        monthlySalary: 40000,
        tdsEnabled: false,
        providentFund: 2400,
        professionalTax: 200,
        esi: 0,
      },
      adjustments: [],
      lossOfPay: 0,
    });
    const finalized = finalizePreviewBreakdown(mapped);
    expect(finalized.netSalary).toBe(mapped.simpleMeta.netSalary);
    expect(finalized.netSalary).toBe(40000);
    expect(finalized.totalDeductions).toBe(0);
  });
});
