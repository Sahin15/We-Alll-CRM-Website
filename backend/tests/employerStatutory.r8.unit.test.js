import { describe, it, expect, afterEach } from "@jest/globals";
import {
  isEmployerStatutoryEnabled,
  calculateEmployerContributions,
  buildEmployerContributionLines,
  computeCtcWithEmployer,
  DEFAULT_EMPLOYER_STATUTORY_RATES,
} from "../src/services/payroll/employerStatutory.js";
import { dualRunPayroll, buildV2Result } from "../src/services/payroll/payrollEngine.js";
import { getDefaultSalaryComponents } from "../src/services/payroll/salaryComponentCatalog.js";

const sample = {
  basicSalary: 40000,
  hra: 16000,
  specialAllowance: 5000,
  transportAllowance: 2000,
  medicalAllowance: 1250,
  providentFund: 4800,
  professionalTax: 200,
  tds: 1000,
  esi: 0,
};

describe("employerStatutory (R8)", () => {
  const originalEr = process.env.PAYROLL_EMPLOYER_STATUTORY;

  afterEach(() => {
    if (originalEr === undefined) delete process.env.PAYROLL_EMPLOYER_STATUTORY;
    else process.env.PAYROLL_EMPLOYER_STATUTORY = originalEr;
  });

  it("is disabled by default", () => {
    delete process.env.PAYROLL_EMPLOYER_STATUTORY;
    expect(isEmployerStatutoryEnabled()).toBe(false);
  });

  it("calculates PF_ER at 12% of BASIC and skips ESI_ER when EE ESI is 0", () => {
    const { pfEr, esiEr } = calculateEmployerContributions(sample);
    expect(pfEr).toBe(Math.round(40000 * DEFAULT_EMPLOYER_STATUTORY_RATES.pfErRate));
    expect(esiEr).toBe(0);
  });

  it("calculates ESI_ER when employee ESI > 0", () => {
    const { esiEr, wageBase } = calculateEmployerContributions({
      ...sample,
      esi: 100,
    });
    expect(wageBase).toBe(40000 + 16000 + 5000 + 2000 + 1250);
    expect(esiEr).toBe(
      Math.round(wageBase * DEFAULT_EMPLOYER_STATUTORY_RATES.esiErRate)
    );
  });

  it("CTC = gross + employer total", () => {
    const lines = buildEmployerContributionLines({ ...sample, esi: 50 });
    const ctc = computeCtcWithEmployer(64400, lines);
    expect(ctc.employerTotal).toBeGreaterThan(0);
    expect(ctc.monthlyCtc).toBe(64400 + ctc.employerTotal);
    expect(ctc.annualCtc).toBe(ctc.monthlyCtc * 12);
  });

  it("catalog seeds include PF_ER and ESI_ER employer components", () => {
    const codes = getDefaultSalaryComponents().map((c) => c.code);
    expect(codes).toContain("PF_ER");
    expect(codes).toContain("ESI_ER");
    expect(
      getDefaultSalaryComponents().find((c) => c.code === "PF_ER").type
    ).toBe("employer");
  });

  it("V2 with flag off does not add employer lines; dual-run net matches", () => {
    delete process.env.PAYROLL_EMPLOYER_STATUTORY;
    const v2 = buildV2Result(sample, { lossOfPay: 100 });
    expect(v2.employerLines).toEqual([]);
    const dual = dualRunPayroll(sample, { lossOfPay: 100 });
    expect(dual.diff.withinTolerance).toBe(true);
  });

  it("V2 with flag on adds employer lines without changing employee net vs flag off", () => {
    delete process.env.PAYROLL_EMPLOYER_STATUTORY;
    const without = buildV2Result({ ...sample, esi: 75 }, {});
    process.env.PAYROLL_EMPLOYER_STATUTORY = "true";
    const withEr = buildV2Result({ ...sample, esi: 75 }, {});
    expect(withEr.employerLines.some((l) => l.code === "PF_ER")).toBe(true);
    expect(withEr.employerLines.some((l) => l.code === "ESI_ER")).toBe(true);
    expect(withEr.totals.netSalary).toBe(without.totals.netSalary);
    expect(withEr.totals.monthlyCtc).toBe(
      withEr.totals.grossSalary + withEr.totals.employerContributions
    );
    const dual = dualRunPayroll({ ...sample, esi: 75 }, {});
    expect(dual.diff.withinTolerance).toBe(true);
  });
});
