/**
 * Payroll period operation gates (R5).
 * When PAYROLL_PERIOD_GATES=true, generate/export/mark-paid respect period status.
 * Default (unset/false): no-op — existing behavior unchanged.
 */

import PayrollPeriod from "../../models/payrollPeriodModel.js";

/** @typedef {"generate"|"export"|"markPaid"} PeriodGateOperation */

/** Allowed period statuses per gated operation */
export const PERIOD_GATE_OPS = Object.freeze({
  generate: Object.freeze(["open", "frozen"]),
  export: Object.freeze(["open", "frozen"]),
  markPaid: Object.freeze(["locked"]),
});

/**
 * @returns {boolean}
 */
export function isPayrollPeriodGatesEnabled() {
  return String(process.env.PAYROLL_PERIOD_GATES || "").toLowerCase() === "true";
}

export class PeriodGateError extends Error {
  /**
   * @param {string} message
   * @param {Record<string, unknown>} [details]
   */
  constructor(message, details = {}) {
    super(message);
    this.name = "PeriodGateError";
    this.code = "PERIOD_GATE";
    this.httpStatus = 409;
    this.details = details;
  }
}

/**
 * Pure gate evaluation (no DB). Missing status (null/undefined) = fail closed.
 *
 * @param {PeriodGateOperation} operation
 * @param {string|null|undefined} periodStatus
 * @returns {{ allowed: boolean, reason?: string, status?: string|null, allowedStatuses: string[] }}
 */
export function evaluatePeriodGate(operation, periodStatus) {
  const allowedStatuses = PERIOD_GATE_OPS[operation];
  if (!allowedStatuses) {
    throw new Error(`Unknown period gate operation: ${operation}`);
  }

  if (periodStatus == null || periodStatus === "") {
    return {
      allowed: false,
      reason: "missing",
      status: null,
      allowedStatuses: [...allowedStatuses],
    };
  }

  if (!allowedStatuses.includes(periodStatus)) {
    return {
      allowed: false,
      reason: "status",
      status: periodStatus,
      allowedStatuses: [...allowedStatuses],
    };
  }

  return {
    allowed: true,
    status: periodStatus,
    allowedStatuses: [...allowedStatuses],
  };
}

/**
 * @param {PeriodGateOperation} operation
 * @param {ReturnType<typeof evaluatePeriodGate>} evaluation
 * @param {{ year: number, month: number, periodId?: unknown }} ctx
 * @returns {PeriodGateError}
 */
function buildGateError(operation, evaluation, ctx) {
  if (evaluation.reason === "missing") {
    return new PeriodGateError(
      `Payroll period ${ctx.year}-${String(ctx.month).padStart(2, "0")} is not opened. Open it under Pay Periods before this action.`,
      {
        ...ctx,
        status: null,
        operation,
        allowedStatuses: evaluation.allowedStatuses,
      }
    );
  }

  return new PeriodGateError(
    `Payroll period is "${evaluation.status}"; ${operation} requires: ${evaluation.allowedStatuses.join(" or ")}. Unlock or change period status under Pay Periods if this is a controlled correction.`,
    {
      ...ctx,
      status: evaluation.status,
      operation,
      allowedStatuses: evaluation.allowedStatuses,
    }
  );
}

/**
 * Assert the payroll period allows an operation. No-op when gates are disabled.
 *
 * @param {PeriodGateOperation} operation
 * @param {number|string} year
 * @param {number|string} month
 * @returns {Promise<{ skipped?: boolean, period?: object, status?: string }>}
 */
export async function assertPeriodAllows(operation, year, month) {
  if (!isPayrollPeriodGatesEnabled()) {
    return { skipped: true };
  }

  const y = Number(year);
  const m = Number(month);
  if (!y || !m || m < 1 || m > 12) {
    throw new PeriodGateError("Valid year and month are required for period gates", {
      year,
      month,
      operation,
    });
  }

  const period = await PayrollPeriod.findByYearMonth(y, m);
  const evaluation = evaluatePeriodGate(operation, period?.status);
  if (!evaluation.allowed) {
    throw buildGateError(operation, evaluation, {
      year: y,
      month: m,
      periodId: period?._id,
    });
  }

  return { period, status: period.status };
}

/**
 * Snapshot for UI (enabled flag + allowed ops for a month).
 *
 * @param {number|string} year
 * @param {number|string} month
 */
export async function getPeriodGateSnapshot(year, month) {
  const enabled = isPayrollPeriodGatesEnabled();
  const y = Number(year);
  const m = Number(month);
  const period = await PayrollPeriod.findByYearMonth(y, m).lean();
  const status = period?.status ?? null;

  const allows = (/** @type {PeriodGateOperation} */ op) => {
    if (!enabled) return true;
    return evaluatePeriodGate(op, status).allowed;
  };

  return {
    enabled,
    year: y,
    month: m,
    status,
    period: period || null,
    allowed: {
      generate: allows("generate"),
      export: allows("export"),
      markPaid: allows("markPaid"),
    },
  };
}

/**
 * Express helper — send PeriodGateError as JSON, or return false.
 * @param {import("express").Response} res
 * @param {unknown} error
 * @returns {boolean}
 */
export function sendPeriodGateError(res, error) {
  if (error instanceof PeriodGateError || error?.code === "PERIOD_GATE") {
    res.status(error.httpStatus || 409).json({
      success: false,
      message: error.message,
      code: "PERIOD_GATE",
      details: error.details || {},
    });
    return true;
  }
  return false;
}
