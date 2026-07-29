/**
 * In-process payroll job queue (R9 foundation).
 * No Redis/Bull — one runner at a time; sync bulk endpoints remain available.
 */

import PayrollJob, {
  PAYROLL_JOB_TYPES,
  PAYROLL_JOB_STATUSES,
} from "../../models/payrollJobModel.js";
import { assertPeriodAllows } from "./payrollPeriodGates.js";

/** @type {boolean} */
let runnerActive = false;

/**
 * @param {unknown} type
 * @returns {boolean}
 */
export function isValidPayrollJobType(type) {
  return PAYROLL_JOB_TYPES.includes(type);
}

/**
 * Normalize controller JSON into a job summary.
 * @param {object} body
 * @returns {{ total: number, success: number, failed: number, skipped: number }}
 */
export function summarizePayrollJobResult(body = {}) {
  const summary = body.summary || {};
  return {
    total: Number(summary.total) || 0,
    success: Number(summary.success) || 0,
    failed: Number(summary.failed) || 0,
    skipped: Number(summary.skipped) || 0,
  };
}

/**
 * Minimal Express-like response capture for reusing slip controllers.
 */
export function createCaptureResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    setHeader() {
      return this;
    },
    send(payload) {
      this.body = payload;
      return this;
    },
  };
}

/**
 * Enqueue a payroll job and kick the runner.
 *
 * @param {{ type: string, month: number, year: number, paymentDate?: Date|string|null, createdBy: string }} input
 */
export async function enqueuePayrollJob(input) {
  const { type, month, year, paymentDate, createdBy } = input;
  if (!isValidPayrollJobType(type)) {
    throw new Error(`Invalid payroll job type: ${type}`);
  }
  const m = Number(month);
  const y = Number(year);
  if (!m || !y || m < 1 || m > 12) {
    throw new Error("Valid month (1-12) and year are required");
  }
  if (!createdBy) {
    throw new Error("createdBy is required");
  }

  if (type === "bulk_generate") {
    await assertPeriodAllows("generate", y, m);
  }

  const job = await PayrollJob.create({
    type,
    status: "queued",
    month: m,
    year: y,
    paymentDate: paymentDate || null,
    progress: 0,
    createdBy,
  });

  schedulePayrollJobRunner();
  return job;
}

/**
 * Kick the in-process runner (non-blocking).
 */
export function schedulePayrollJobRunner() {
  if (runnerActive) return;
  setImmediate(() => {
    processPayrollJobQueue().catch((err) => {
      console.error("[payrollJob] queue runner failed", err);
      runnerActive = false;
    });
  });
}

/**
 * Process queued jobs sequentially.
 */
export async function processPayrollJobQueue() {
  if (runnerActive) return;
  runnerActive = true;
  try {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const job = await PayrollJob.findOneAndUpdate(
        { status: "queued" },
        {
          $set: {
            status: "running",
            startedAt: new Date(),
            progress: 5,
            error: "",
          },
        },
        { sort: { createdAt: 1 }, new: true }
      );
      if (!job) break;
      await executePayrollJob(job);
    }
  } finally {
    runnerActive = false;
  }
}

/**
 * @param {import("mongoose").Document} job
 */
export async function executePayrollJob(job) {
  try {
    job.progress = 10;
    await job.save();

    const userId = job.createdBy;
    const mockReq = {
      body: {
        month: job.month,
        year: job.year,
        paymentDate: job.paymentDate || undefined,
      },
      user: { id: userId, _id: userId },
    };
    const mockRes = createCaptureResponse();

    if (job.type === "bulk_generate") {
      const { bulkGenerateSalarySlips } = await import(
        "../../controllers/salarySlipController.js"
      );
      await bulkGenerateSalarySlips(mockReq, mockRes);
    } else if (job.type === "bulk_email") {
      const { sendBulkSalarySlipEmails } = await import(
        "../../controllers/salarySlipController.js"
      );
      await sendBulkSalarySlipEmails(mockReq, mockRes);
    } else {
      throw new Error(`Unsupported job type: ${job.type}`);
    }

    if (mockRes.statusCode >= 400) {
      const message =
        mockRes.body?.message ||
        mockRes.body?.error ||
        `Job failed with status ${mockRes.statusCode}`;
      throw Object.assign(new Error(message), {
        details: mockRes.body,
        httpStatus: mockRes.statusCode,
      });
    }

    const summary = summarizePayrollJobResult(mockRes.body || {});
    job.status = "completed";
    job.progress = 100;
    job.summary = summary;
    job.results = mockRes.body?.results || null;
    job.finishedAt = new Date();
    job.error = "";
    await job.save();
  } catch (error) {
    job.status = "failed";
    job.progress = 100;
    job.error = error.message || String(error);
    job.finishedAt = new Date();
    if (error.details?.summary) {
      job.summary = summarizePayrollJobResult(error.details);
    }
    await job.save();
    console.error("[payrollJob] execute failed", {
      jobId: job._id?.toString?.(),
      type: job.type,
      error: job.error,
    });
  }
}

/**
 * @param {string} id
 */
export async function getPayrollJobById(id) {
  return PayrollJob.findById(id)
    .populate("createdBy", "name email")
    .lean();
}

/**
 * @param {{ limit?: number, status?: string, type?: string }} [filters]
 */
export async function listPayrollJobs(filters = {}) {
  const query = {};
  if (filters.status && PAYROLL_JOB_STATUSES.includes(filters.status)) {
    query.status = filters.status;
  }
  if (filters.type && PAYROLL_JOB_TYPES.includes(filters.type)) {
    query.type = filters.type;
  }
  const limit = Math.min(Number(filters.limit) || 50, 200);
  return PayrollJob.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("createdBy", "name email")
    .lean();
}

export { PAYROLL_JOB_TYPES, PAYROLL_JOB_STATUSES };
