import { describe, it, expect } from "@jest/globals";
import {
  COMPONENT_TYPES,
  CALC_METHODS,
  normalizeComponentCode,
  isValidComponentCode,
  assertComponentPayload,
  getDefaultSalaryComponents,
} from "../src/services/payroll/salaryComponentCatalog.js";

describe("salaryComponentCatalog", () => {
  it("exposes component types and calc methods", () => {
    expect(COMPONENT_TYPES).toEqual(["earning", "deduction", "employer"]);
    expect(CALC_METHODS).toContain("fixed");
    expect(CALC_METHODS).toContain("formula");
    expect(CALC_METHODS).toContain("manual");
  });

  it("normalizes codes to uppercase snake style", () => {
    expect(normalizeComponentCode(" basic ")).toBe("BASIC");
    expect(normalizeComponentCode("pf-ee")).toBe("PF_EE");
    expect(normalizeComponentCode("specialAllowance")).toBe("SPECIAL_ALLOWANCE");
  });

  it("validates component codes", () => {
    expect(isValidComponentCode("BASIC")).toBe(true);
    expect(isValidComponentCode("PF_EE")).toBe(true);
    expect(isValidComponentCode("1BASIC")).toBe(false);
    expect(isValidComponentCode("basic")).toBe(false);
    expect(isValidComponentCode("PF-EE")).toBe(false);
    expect(isValidComponentCode("")).toBe(false);
  });

  it("assertComponentPayload accepts a valid earning", () => {
    const result = assertComponentPayload({
      code: "hra",
      name: "House Rent Allowance",
      type: "earning",
      taxable: true,
      statutory: false,
      calcMethod: "fixed",
    });
    expect(result.code).toBe("HRA");
    expect(result.type).toBe("earning");
    expect(result.isActive).toBe(true);
  });

  it("assertComponentPayload rejects missing name/type/invalid code", () => {
    expect(() =>
      assertComponentPayload({ code: "HRA", type: "earning" })
    ).toThrow(/name is required/);
    expect(() =>
      assertComponentPayload({ code: "HRA", name: "HRA", type: "bonus" })
    ).toThrow(/Invalid component type/);
    expect(() =>
      assertComponentPayload({ code: "1X", name: "Bad", type: "earning" })
    ).toThrow(/Invalid component code/);
  });

  it("provides V1-mapped default components including BASIC and PF_EE", () => {
    const defaults = getDefaultSalaryComponents();
    const codes = defaults.map((d) => d.code);
    expect(codes).toEqual(
      expect.arrayContaining([
        "BASIC",
        "HRA",
        "SPECIAL_ALLOWANCE",
        "TRANSPORT_ALLOWANCE",
        "MEDICAL_ALLOWANCE",
        "PF_EE",
        "PROFESSIONAL_TAX",
        "TDS",
        "ESI_EE",
      ])
    );
    expect(defaults.find((d) => d.code === "BASIC").type).toBe("earning");
    expect(defaults.find((d) => d.code === "PF_EE").type).toBe("deduction");
    expect(defaults.find((d) => d.code === "PF_EE").statutory).toBe(true);
  });
});
