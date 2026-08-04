import { describe, it, expect, afterEach } from "@jest/globals";
import {
  mapV2DetailToSlipFields,
  resolveSlipFieldsFromEngine,
} from "../src/services/payroll/persistableSlipMapper.js";
import { dualRunPayroll, selectPersistableTotals } from "../src/services/payroll/payrollEngine.js";

const sampleStructure = {
  basicSalary: 40000,
  hra: 16000,
  specialAllowance: 5000,
  transportAllowance: 2000,
  medicalAllowance: 1250,
  providentFund: 4800,
  professionalTax: 200,
  tds: 1000,
  esi: 0,
  otherAllowances: [{ name: "Internet", amount: 500 }],
  otherDeductions: [],
};

describe("PH-01 persistableSlipMapper", () => {
  const originalFlag = process.env.PAYROLL_V2_ENGINE;

  afterEach(() => {
    if (originalFlag === undefined) {
      delete process.env.PAYROLL_V2_ENGINE;
    } else {
      process.env.PAYROLL_V2_ENGINE = originalFlag;
    }
  });

  it("maps V2 lines into flat slip fields", () => {
    const dual = dualRunPayroll(sampleStructure, {
      bonus: 1000,
      lossOfPay: 2000,
      advances: 500,
    });
    const mapped = mapV2DetailToSlipFields(dual.v2);
    expect(mapped.earnings.basicSalary).toBe(40000);
    expect(mapped.earnings.bonus).toBe(1000);
    expect(mapped.deductions.lossOfPay).toBe(2000);
    expect(mapped.deductions.advances).toBe(500);
    expect(mapped.deductions.unpaidLeaveDeduction).toBe(0);
  });

  it("flag off keeps fallback V1 maps (pro-rata path unchanged)", () => {
    delete process.env.PAYROLL_V2_ENGINE;
    const fallbackEarnings = {
      basicSalary: 30000,
      hra: 10000,
      specialAllowance: 0,
      transportAllowance: 0,
      medicalAllowance: 0,
      otherAllowances: [],
      bonus: 0,
      overtime: 0,
      arrears: 0,
      reimbursements: 0,
      incentives: 0,
    };
    const fallbackDeductions = {
      providentFund: 1000,
      professionalTax: 200,
      tds: 0,
      esi: 0,
      lossOfPay: 1500,
      unpaidLeaveDeduction: 0,
      advances: 0,
      loans: 0,
      otherDeductions: [],
    };
    const resolved = resolveSlipFieldsFromEngine({
      structure: sampleStructure,
      overrides: { lossOfPay: 1500 },
      fallbackEarnings,
      fallbackDeductions,
    });
    expect(resolved.persistable.source).toBe("v1");
    expect(resolved.earnings.basicSalary).toBe(30000);
    expect(resolved.deductions.lossOfPay).toBe(1500);
  });

  it("flag on persists V2 fields matching selectPersistableTotals net within ₹1", () => {
    process.env.PAYROLL_V2_ENGINE = "true";
    const fallbackEarnings = {
      basicSalary: sampleStructure.basicSalary,
      hra: sampleStructure.hra,
      specialAllowance: sampleStructure.specialAllowance,
      transportAllowance: sampleStructure.transportAllowance,
      medicalAllowance: sampleStructure.medicalAllowance,
      otherAllowances: sampleStructure.otherAllowances,
      bonus: 0,
      overtime: 0,
      arrears: 0,
      reimbursements: 0,
      incentives: 0,
    };
    const fallbackDeductions = {
      providentFund: sampleStructure.providentFund,
      professionalTax: sampleStructure.professionalTax,
      tds: sampleStructure.tds,
      esi: sampleStructure.esi,
      lossOfPay: 2000,
      unpaidLeaveDeduction: 0,
      advances: 0,
      loans: 0,
      otherDeductions: [],
    };
    const resolved = resolveSlipFieldsFromEngine({
      structure: sampleStructure,
      overrides: { lossOfPay: 2000 },
      fallbackEarnings,
      fallbackDeductions,
    });
    expect(resolved.persistable.source).toBe("v2");
    const dual = dualRunPayroll(sampleStructure, { lossOfPay: 2000 });
    const selected = selectPersistableTotals(dual);
    const slipGross =
      resolved.earnings.basicSalary +
      resolved.earnings.hra +
      resolved.earnings.specialAllowance +
      resolved.earnings.transportAllowance +
      resolved.earnings.medicalAllowance +
      resolved.earnings.otherAllowances.reduce((s, a) => s + (a.amount || 0), 0);
    const slipDed =
      resolved.deductions.providentFund +
      resolved.deductions.professionalTax +
      resolved.deductions.tds +
      resolved.deductions.esi +
      resolved.deductions.lossOfPay +
      resolved.deductions.advances +
      resolved.deductions.loans;
    expect(Math.abs(slipGross - slipDed - selected.totals.netSalary)).toBeLessThanOrEqual(1);
  });
});
