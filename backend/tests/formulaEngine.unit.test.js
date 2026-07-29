import { describe, it, expect } from "@jest/globals";
import {
  ALLOWED_FUNCTIONS,
  compileFormula,
  evaluateFormula,
  validateFormula,
} from "../src/services/payroll/formula/formulaEngine.js";

describe("formulaEngine", () => {
  it("exposes allowlisted functions", () => {
    expect(ALLOWED_FUNCTIONS).toEqual(
      expect.arrayContaining(["min", "max", "round", "if", "percent"])
    );
  });

  it("evaluates arithmetic with variables", () => {
    expect(
      evaluateFormula("BASIC + HRA", { BASIC: 40000, HRA: 16000 })
    ).toBe(56000);
    expect(evaluateFormula("(BASIC + HRA) * 0.5", { BASIC: 100, HRA: 50 })).toBe(
      75
    );
  });

  it("evaluates percent, min, max, round, if", () => {
    expect(evaluateFormula("percent(BASIC, 40)", { BASIC: 10000 })).toBe(4000);
    expect(evaluateFormula("min(BASIC, 15000)", { BASIC: 20000 })).toBe(15000);
    expect(evaluateFormula("max(BASIC, 15000)", { BASIC: 10000 })).toBe(15000);
    expect(evaluateFormula("round(BASIC / 3)", { BASIC: 100 })).toBe(33);
    expect(
      evaluateFormula("if(BASIC > 15000, percent(BASIC, 12), 0)", {
        BASIC: 20000,
      })
    ).toBe(2400);
    expect(
      evaluateFormula("if(BASIC > 15000, percent(BASIC, 12), 0)", {
        BASIC: 10000,
      })
    ).toBe(0);
  });

  it("supports LOP style formula from plan examples", () => {
    expect(
      evaluateFormula("round(GROSS / 30 * LOP_DAYS)", {
        GROSS: 30000,
        LOP_DAYS: 2,
      })
    ).toBe(2000);
  });

  it("compileFormula returns an AST without evaluating", () => {
    const ast = compileFormula("BASIC + 1");
    expect(ast).toMatchObject({
      type: "BinaryExpression",
      operator: "+",
    });
  });

  it("validateFormula returns ok for valid expressions", () => {
    const result = validateFormula("percent(BASIC, 12)");
    expect(result.valid).toBe(true);
    expect(result.error).toBeNull();
  });

  it("rejects empty / oversized formulas", () => {
    expect(() => evaluateFormula("")).toThrow(/empty/i);
    expect(() => evaluateFormula("a".repeat(501))).toThrow(/too long/i);
  });

  it("rejects unknown functions and disallows eval-style patterns", () => {
    expect(() => evaluateFormula("eval(BASIC)", { BASIC: 1 })).toThrow(
      /Unknown function|not allowed/i
    );
    expect(() => evaluateFormula("Function(BASIC)", { BASIC: 1 })).toThrow();
    expect(() =>
      evaluateFormula("constructor", { constructor: 1 })
    ).toThrow(/reserved|not allowed|Unknown/i);
  });

  it("rejects unknown variables at evaluation time", () => {
    expect(() => evaluateFormula("BONUS + 1", { BASIC: 1 })).toThrow(
      /Unknown variable|BONUS/
    );
  });

  it("rejects unbalanced parentheses and invalid tokens", () => {
    expect(() => compileFormula("(BASIC + 1")).toThrow(/parenthes|Unexpected/i);
    expect(() => compileFormula("BASIC $ 1")).toThrow(/Unexpected|Invalid/i);
  });

  it("never uses JavaScript eval (sanity via safe result types)", () => {
    const value = evaluateFormula("min(10, max(2, 3)) + percent(100, 10)", {});
    expect(typeof value).toBe("number");
    expect(Number.isFinite(value)).toBe(true);
  });
});
