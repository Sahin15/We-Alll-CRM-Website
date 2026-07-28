import {
  isSimplePayrollStructure,
  mapSimpleStructureToSlipFields,
} from "../src/services/payroll/simpleSlipPersist.js";

describe("simpleSlipPersist (SP-04)", () => {
  it("detects simple payroll mode", () => {
    expect(isSimplePayrollStructure({ payrollMode: "simple" })).toBe(true);
    expect(isSimplePayrollStructure({ payrollMode: "legacy" })).toBe(false);
  });

  it("maps monthly salary, LOP, bonus adjustment, and TDS into slip fields", () => {
    const { earnings, deductions, simpleMeta } = mapSimpleStructureToSlipFields({
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
        { type: "bonus", amount: 2000, status: "approved" },
        { type: "late_deduction", amount: 1000, status: "approved", reason: "3 lates" },
      ],
      lossOfPay: 1000,
      extras: {},
    });

    expect(earnings.basicSalary).toBe(30000);
    expect(earnings.hra).toBe(0);
    expect(earnings.bonus).toBe(2000);
    expect(deductions.lossOfPay).toBe(1000);
    expect(deductions.tds).toBe(1500);
    expect(deductions.unpaidLeaveDeduction).toBe(0);
    expect(deductions.otherDeductions).toEqual([
      { name: "late_deduction", amount: 1000, reason: "3 lates" },
    ]);
    // 30000 - 1000 + 2000 - 1000 - 1500 = 28500
    expect(simpleMeta.netSalary).toBe(28500);
  });

  it("throws when net would be negative", () => {
    expect(() =>
      mapSimpleStructureToSlipFields({
        structure: {
          payrollMode: "simple",
          monthlySalary: 1000,
          tdsEnabled: false,
        },
        adjustments: [],
        lossOfPay: 5000,
      })
    ).toThrow(/negative/i);
  });

  it("ignores leftover PF/PT/ESI so slip net matches Simple Payroll computeSimpleNet", () => {
    const { deductions, simpleMeta } = mapSimpleStructureToSlipFields({
      structure: {
        payrollMode: "simple",
        monthlySalary: 50000,
        tdsEnabled: true,
        tds: 2000,
        // Leftover from a former legacy structure — must not affect simple net
        providentFund: 1800,
        professionalTax: 200,
        esi: 375,
      },
      adjustments: [{ type: "bonus", amount: 1000, status: "approved" }],
      lossOfPay: 0,
    });

    expect(deductions.providentFund).toBe(0);
    expect(deductions.professionalTax).toBe(0);
    expect(deductions.esi).toBe(0);
    expect(deductions.tds).toBe(2000);
    // 50000 + 1000 - 2000 = 49000 (PF/PT/ESI excluded)
    expect(simpleMeta.netSalary).toBe(49000);
  });
});
