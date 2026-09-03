import { describe, it, expect } from "@jest/globals";
import {
  toProRataComponentMaps,
  resolveAttendanceMoneyDeductions,
} from "../src/services/payroll/payrollCorrectnessHelpers.js";
import {
  calculateProRataSalarySlip,
  calculateProRataTotals,
} from "../src/utils/proRataSalaryCalculator.js";

describe("payrollCorrectnessHelpers (R1)", () => {
  it("maps flat SalaryStructure fields into earnings/deductions", () => {
    const maps = toProRataComponentMaps({
      basicSalary: 30000,
      hra: 12000,
      specialAllowance: 8000,
      transportAllowance: 1600,
      medicalAllowance: 1250,
      providentFund: 3600,
      professionalTax: 200,
      tds: 1000,
      esi: 0,
    });

    expect(maps.earnings.basicSalary).toBe(30000);
    expect(maps.earnings.hra).toBe(12000);
    expect(maps.deductions.providentFund).toBe(3600);
    expect(maps.deductions.tds).toBe(1000);
  });

  it("preserves already-nested numeric component maps", () => {
    const maps = toProRataComponentMaps({
      earnings: { basicSalary: 10, otherAllowances: [{ amount: 1 }] },
      deductions: { providentFund: 2 },
    });
    expect(maps.earnings.basicSalary).toBe(10);
    expect(maps.earnings.otherAllowances).toBeUndefined();
    expect(maps.deductions.providentFund).toBe(2);
  });

  it("puts all attendance money on lossOfPay and zeros unpaidLeaveDeduction", () => {
    expect(resolveAttendanceMoneyDeductions(3333.7)).toEqual({
      lossOfPay: 3334,
      unpaidLeaveDeduction: 0,
    });
    expect(resolveAttendanceMoneyDeductions(null)).toEqual({
      lossOfPay: 0,
      unpaidLeaveDeduction: 0,
    });
  });
});

describe("pro-rata flat structure adapter (R1)", () => {
  it("pro-rates flat old/new structures mid-month (golden)", () => {
    // July 2026 has 31 days; effective 16th → 15 old + 16 new
    const oldStructure = {
      basicSalary: 30000,
      hra: 10000,
      specialAllowance: 0,
      transportAllowance: 0,
      medicalAllowance: 0,
      providentFund: 3600,
      professionalTax: 200,
      tds: 0,
      esi: 0,
    };
    const newStructure = {
      basicSalary: 40000,
      hra: 12000,
      specialAllowance: 0,
      transportAllowance: 0,
      medicalAllowance: 0,
      providentFund: 4800,
      professionalTax: 200,
      tds: 0,
      esi: 0,
    };

    const result = calculateProRataSalarySlip({
      oldStructure,
      newStructure,
      effectiveDate: new Date(2026, 6, 16),
      monthDate: new Date(2026, 6, 1),
    });

    expect(result.isProRata).toBe(true);
    expect(result.daysWorkedOld).toBe(15);
    expect(result.daysWorkedNew).toBe(16);
    expect(result.totalDaysInMonth).toBe(31);

    // basic: 30000/31*15 + 40000/31*16
    const expectedBasic =
      Math.round(((30000 / 31) * 15 + (40000 / 31) * 16) * 100) / 100;
    expect(result.earnings.basicSalary.proRata).toBe(expectedBasic);
    expect(result.earnings.basicSalary.proRata).toBeGreaterThan(30000);
    expect(result.earnings.basicSalary.proRata).toBeLessThan(40000);

    const totals = calculateProRataTotals(result.earnings, result.deductions);
    expect(totals.netSalary).toBe(
      Math.round((totals.totalEarnings - totals.totalDeductions) * 100) / 100
    );
  });

  it("does not treat empty nested earnings as pro-rata zero when flat fields exist", () => {
    // Regression: previous code read structure.earnings || {} and ignored flat basicSalary
    const brokenNestedRead = calculateProRataSalarySlip({
      oldStructure: { basicSalary: 30000, hra: 0, providentFund: 0 },
      newStructure: { basicSalary: 30000, hra: 0, providentFund: 0 },
      effectiveDate: new Date(2026, 6, 16),
      monthDate: new Date(2026, 6, 1),
    });
    expect(brokenNestedRead.earnings.basicSalary.proRata).toBe(30000);
  });
});
