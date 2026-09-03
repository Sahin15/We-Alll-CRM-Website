/**
 * PH-12: Kill-switch rehearsal (env toggle only — no DB writes).
 * Usage: node scripts/rehearse-payroll-kill-switch.js
 */
import { isPayrollV2EngineEnabled } from "../src/services/payroll/payrollEngineConfig.js";

const original = process.env.PAYROLL_V2_ENGINE;

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

process.env.PAYROLL_V2_ENGINE = "true";
assert(isPayrollV2EngineEnabled() === true, "expected enabled when true");
console.log("OK: PAYROLL_V2_ENGINE=true → enabled");

process.env.PAYROLL_V2_ENGINE = "false";
assert(isPayrollV2EngineEnabled() === false, "expected disabled when false");
console.log("OK: PAYROLL_V2_ENGINE=false → disabled (kill-switch)");

delete process.env.PAYROLL_V2_ENGINE;
assert(isPayrollV2EngineEnabled() === false, "expected disabled when unset");
console.log("OK: unset → disabled");

if (original === undefined) delete process.env.PAYROLL_V2_ENGINE;
else process.env.PAYROLL_V2_ENGINE = original;

console.log("Kill-switch rehearsal passed. No Mongo writes.");
