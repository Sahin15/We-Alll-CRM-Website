import { describe, it, expect, afterEach } from "@jest/globals";
import {
  buildV1Result,
  buildV2Result,
  dualRunPayroll,
  selectPersistableTotals,
} from "../src/services/payroll/payrollEngine.js";
import { isPayrollV2EngineEnabled } from "../src/services/payroll/payrollEngineConfig.js";

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

describe("payrollEngine", () => {
  const originalFlag = process.env.PAYROLL_V2_ENGINE;

  afterEach(() => {
    if (originalFlag === undefined) {
      delete process.env.PAYROLL_V2_ENGINE;
    } else {
      process.env.PAYROLL_V2_ENGINE = originalFlag;
    }
  });

  it("builds V1 totals matching structure + LOP + extras", () => {
    const result = buildV1Result(sampleStructure, {
      bonus: 1000,
      lossOfPay: 2000,
      advances: 500,
    });
    expect(result.totals.grossSalary).toBe(40000 + 16000 + 5000 + 2000 + 1250 + 500 + 1000);
    expect(result.totals.totalDeductions).toBe(4800 + 200 + 1000 + 0 + 2000 + 500);
    expect(result.totals.netSalary).toBe(
      result.totals.grossSalary - result.totals.totalDeductions
    );
  });

  it("V2 component mapping dual-runs within tolerance of V1", () => {
    const dual = dualRunPayroll(sampleStructure, {
      bonus: 1000,
      overtime: 0,
      lossOfPay: 2000,
      advances: 500,
      loans: 0,
    });
    expect(dual.diff.withinTolerance).toBe(true);
    expect(dual.diff.abs.netSalary).toBeLessThanOrEqual(1);
    expect(dual.v2.earningsLines.some((l) => l.code === "BASIC")).toBe(true);
    expect(dual.v2.deductionLines.some((l) => l.code === "LOP")).toBe(true);
  });

  it("V2 can evaluate a formula component when provided", () => {
    const components = [
      {
        code: "BASIC",
        name: "Basic",
        type: "earning",
        taxable: true,
        statutory: false,
        calcMethod: "fixed",
        v1Field: "basicSalary",
        isActive: true,
      },
      {
        code: "HRA_CALC",
        name: "HRA Formula",
        type: "earning",
        taxable: true,
        statutory: false,
        calcMethod: "formula",
        defaultFormula: "percent(BASIC, 40)",
        isActive: true,
      },
    ];
    const v2 = buildV2Result(
      { basicSalary: 10000, hra: 0, specialAllowance: 0, transportAllowance: 0, medicalAllowance: 0, providentFund: 0, professionalTax: 0, tds: 0, esi: 0 },
      {},
      components
    );
    expect(v2.earningsLines.find((l) => l.code === "HRA_CALC").amount).toBe(4000);
    expect(v2.totals.grossSalary).toBe(14000);
  });

  it("feature flag defaults to false and selects V1 for persist", () => {
    delete process.env.PAYROLL_V2_ENGINE;
    expect(isPayrollV2EngineEnabled()).toBe(false);
    const dual = dualRunPayroll(sampleStructure, { lossOfPay: 0 });
    const selected = selectPersistableTotals(dual);
    expect(selected.source).toBe("v1");
  });

  it("selects V2 totals when PAYROLL_V2_ENGINE=true", () => {
    process.env.PAYROLL_V2_ENGINE = "true";
    expect(isPayrollV2EngineEnabled()).toBe(true);
    const dual = dualRunPayroll(sampleStructure, { lossOfPay: 0 });
    const selected = selectPersistableTotals(dual);
    expect(selected.source).toBe("v2");
  });
});
