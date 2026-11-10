import { describe, it, expect, afterEach } from "@jest/globals";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  isSimplePayrollCreditOnlyEnforced,
} from "../src/services/payroll/simplePayrollSlipGuard.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const controllerPath = path.join(
  __dirname,
  "../src/controllers/salarySlipController.js"
);

describe("simplePayrollSlipGuard", () => {
  const prev = process.env.SIMPLE_PAYROLL_CREDIT_ONLY;

  afterEach(() => {
    if (prev === undefined) {
      delete process.env.SIMPLE_PAYROLL_CREDIT_ONLY;
    } else {
      process.env.SIMPLE_PAYROLL_CREDIT_ONLY = prev;
    }
  });

  it("is off unless SIMPLE_PAYROLL_CREDIT_ONLY=true", () => {
    delete process.env.SIMPLE_PAYROLL_CREDIT_ONLY;
    expect(isSimplePayrollCreditOnlyEnforced()).toBe(false);
    process.env.SIMPLE_PAYROLL_CREDIT_ONLY = "true";
    expect(isSimplePayrollCreditOnlyEnforced()).toBe(true);
  });

  it("wires assertSimpleSlipGenerateAllowed in single and bulk generate", () => {
    const src = fs.readFileSync(controllerPath, "utf8");
    expect(src).toMatch(/assertSimpleSlipGenerateAllowed/);
    const singleIdx = src.indexOf("export const generateSalarySlip");
    const bulkIdx = src.indexOf("bulkGenerate");
    expect(singleIdx).toBeGreaterThan(-1);
    expect(bulkIdx).toBeGreaterThan(-1);
    expect(src.slice(singleIdx, singleIdx + 2500)).toMatch(
      /assertSimpleSlipGenerateAllowed/
    );
    expect(src.slice(bulkIdx, bulkIdx + 8000)).toMatch(
      /assertSimpleSlipGenerateAllowed/
    );
  });
});
