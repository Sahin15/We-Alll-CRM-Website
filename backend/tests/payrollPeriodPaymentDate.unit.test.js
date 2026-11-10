import { describe, it, expect } from "@jest/globals";
import { parseSalaryPaymentDate } from "../src/services/payroll/payrollPeriodPaymentDate.js";

describe("payrollPeriodPaymentDate", () => {
  it("parses valid ISO payment dates", () => {
    const d = parseSalaryPaymentDate("2026-11-15T00:00:00.000Z");
    expect(d).toBeInstanceOf(Date);
    expect(d.getUTCFullYear()).toBe(2026);
  });

  it("returns null for empty input", () => {
    expect(parseSalaryPaymentDate(null)).toBeNull();
    expect(parseSalaryPaymentDate("")).toBeNull();
  });

  it("throws on invalid dates", () => {
    expect(() => parseSalaryPaymentDate("not-a-date")).toThrow(/Invalid/);
  });
});
