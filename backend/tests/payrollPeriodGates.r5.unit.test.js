import { describe, it, expect, afterEach } from "@jest/globals";
import {
  PERIOD_GATE_OPS,
  isPayrollPeriodGatesEnabled,
  evaluatePeriodGate,
} from "../src/services/payroll/payrollPeriodGates.js";

describe("payrollPeriodGates (R5)", () => {
  const original = process.env.PAYROLL_PERIOD_GATES;

  afterEach(() => {
    if (original === undefined) delete process.env.PAYROLL_PERIOD_GATES;
    else process.env.PAYROLL_PERIOD_GATES = original;
  });

  it("defines generate/export/mutate for open|frozen and markPaid for locked", () => {
    expect(PERIOD_GATE_OPS.generate).toEqual(["open", "frozen"]);
    expect(PERIOD_GATE_OPS.export).toEqual(["open", "frozen"]);
    expect(PERIOD_GATE_OPS.mutate).toEqual(["open", "frozen"]);
    expect(PERIOD_GATE_OPS.markPaid).toEqual(["locked"]);
  });

  it("is disabled by default outside production; ON by default in production (PH-06)", () => {
    const originalNodeEnv = process.env.NODE_ENV;
    delete process.env.PAYROLL_PERIOD_GATES;
    process.env.NODE_ENV = "development";
    expect(isPayrollPeriodGatesEnabled()).toBe(false);
    process.env.NODE_ENV = "production";
    expect(isPayrollPeriodGatesEnabled()).toBe(true);
    process.env.PAYROLL_PERIOD_GATES = "false";
    expect(isPayrollPeriodGatesEnabled()).toBe(false);
    process.env.PAYROLL_PERIOD_GATES = "true";
    expect(isPayrollPeriodGatesEnabled()).toBe(true);
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
  });

  it("fails closed when period is missing", () => {
    const missing = evaluatePeriodGate("generate", null);
    expect(missing.allowed).toBe(false);
    expect(missing.reason).toBe("missing");
  });

  it("allows generate/export/mutate only for open and frozen", () => {
    expect(evaluatePeriodGate("generate", "open").allowed).toBe(true);
    expect(evaluatePeriodGate("generate", "frozen").allowed).toBe(true);
    expect(evaluatePeriodGate("generate", "locked").allowed).toBe(false);
    expect(evaluatePeriodGate("generate", "paid").allowed).toBe(false);
    expect(evaluatePeriodGate("export", "frozen").allowed).toBe(true);
    expect(evaluatePeriodGate("export", "locked").allowed).toBe(false);
    expect(evaluatePeriodGate("mutate", "open").allowed).toBe(true);
    expect(evaluatePeriodGate("mutate", "frozen").allowed).toBe(true);
    expect(evaluatePeriodGate("mutate", "locked").allowed).toBe(false);
    expect(evaluatePeriodGate("mutate", "paid").allowed).toBe(false);
  });

  it("allows markPaid only when locked", () => {
    expect(evaluatePeriodGate("markPaid", "locked").allowed).toBe(true);
    expect(evaluatePeriodGate("markPaid", "open").allowed).toBe(false);
    expect(evaluatePeriodGate("markPaid", "frozen").allowed).toBe(false);
    expect(evaluatePeriodGate("markPaid", "paid").allowed).toBe(false);
  });
});
