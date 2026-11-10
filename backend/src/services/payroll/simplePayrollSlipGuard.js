import SalaryStructure from "../../models/salaryStructureModel.js";
import { isSimplePayrollStructure } from "./simpleSlipPersist.js";

/**
 * When true, simple-mode employees must use Credit salary (not Generate Slips).
 * @returns {boolean}
 */
export function isSimplePayrollCreditOnlyEnforced() {
  return process.env.SIMPLE_PAYROLL_CREDIT_ONLY === "true";
}

/**
 * @param {string} employeeId
 * @throws {Error} code SIMPLE_PAYROLL_CREDIT_ONLY
 */
export async function assertSimpleSlipGenerateAllowed(employeeId) {
  if (!isSimplePayrollCreditOnlyEnforced()) {
    return;
  }
  const structure = await SalaryStructure.getActiveStructure(employeeId);
  if (!structure || !isSimplePayrollStructure(structure)) {
    return;
  }
  const err = new Error(
    "Simple payroll employees must be paid via Credit salary on the Payroll tab."
  );
  err.code = "SIMPLE_PAYROLL_CREDIT_ONLY";
  err.httpStatus = 409;
  throw err;
}
