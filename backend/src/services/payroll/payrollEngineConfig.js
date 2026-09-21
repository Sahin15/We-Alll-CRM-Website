/**
 * Payroll V2 engine feature flag (Milestone 4).
 * When false (default), dual-run may still log diffs but persisted slips use V1 amounts.
 */

import { isUat } from "../../config/appEnvironment.js";

/**
 * @returns {boolean}
 */
export function isPayrollV2EngineEnabled() {
  if (isUat()) return false;
  return String(process.env.PAYROLL_V2_ENGINE || "").toLowerCase() === "true";
}

export const PAYROLL_ENGINE_VERSION = "2.0.0-m4";

/** Rupee tolerance for dual-run comparisons */
export const DUAL_RUN_TOLERANCE = 1;
