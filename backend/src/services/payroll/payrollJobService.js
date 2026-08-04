/**
 * In-process payroll job queue (R9 foundation + PH-09 reclaim).
 * No Redis/Bull — one runner at a time; sync bulk endpoints remain available.
 *
 * Multi-instance limit: reclaim uses Mongo heartbeats, but only one process
 * should own the runner in production until Redis/Bull (R9b) lands.
 */

import PayrollJob, {
  PAYROLL_JOB_TYPES,
  PAYROLL_JOB_STATUSES,
} from "../../models/payrollJobModel.js";
import { assertPeriodAllows } from "./payrollPeriodGates.js";

/** @type {boolean} */
let runnerActive = false;

/** Default stale threshold for orphaned `running` jobs (ms). */
export const DEFAULT_PAYROLL_JOB_STALE_MS = 15 * 60 * 1000;

/**
 * @returns {number}
 */
export function getPayrollJobStaleMs() {
  const raw = Number(process.env.PAYROLL_JOB_STALE_MS);
  if (Number.isFinite(raw) && raw >= 60_000) return raw;
  return DEFAULT_PAYROLL_JOB_STALE_MS;
}

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
 * Effective activity timestamp for stale detection (PH-09).
 * @param {{ heartbeatAt?: Date|null, startedAt?: Date|null, updatedAt?: Date|null }} job
 * @returns {Date|null}
 */
export function resolvePayrollJobActivityAt(job) {
  return job?.heartbeatAt || job?.startedAt || job?.updatedAt || null;
}

/**
 * @param {{ heartbeatAt?: Date|null, startedAt?: Date|null, updatedAt?: Date|null, status?: string }} job
 * @param {Date} now
 * @param {number} staleMs
 * @returns {boolean}
 */
export function isStaleRunningPayrollJob(job, now, staleMs) {
  if (!job || job.status !== "running") return false;
  const activityAt = resolvePayrollJobActivityAt(job);
  if (!activityAt) return true;
  return now.getTime() - new Date(activityAt).getTime() >= staleMs;
}

/**
 * PH-09: Requeue `running` jobs whose heartbeat (or startedAt) is older than TTL.
 *
 * @param {{ now?: Date, staleMs?: number }} [opts]
 * @returns {Promise<{ reclaimed: number }>}
 */
export async function reclaimStalePayrollJobs(opts = {}) {
  const now = opts.now || new Date();
  const staleMs = opts.staleMs ?? getPayrollJobStaleMs();
  const cutoff = new Date(now.getTime() - staleMs);

  const result = await PayrollJob.updateMany(
    {
      status: "running",
      $expr: {
        $lte: [
          {
            $ifNull: [
              "$heartbeatAt",
              { $ifNull: ["$startedAt", "$updatedAt"] },
            ],
          },
          cutoff,
        ],
      },
    },
    {
      $set: {
        status: "queued",
        progress: 0,
        error: "Reclaimed after stale running heartbeat (PH-09)",
        finishedAt: null,
      },
      $inc: { reclaimCount: 1 },
      $unset: { heartbeatAt: "" },
    }
  );

  const reclaimed = result.modifiedCount || result.nModified || 0;
  if (reclaimed > 0) {
    console.warn("[payrollJob] reclaimed stale running jobs", {
      reclaimed,
      staleMs,
      cutoff: cutoff.toISOString(),
    });
  }
  return { reclaimed };
}

/**
 * Enqueue a payroll job and kick the runner.
 * PH-09: rejects duplicate active (queued|running) job for same type+month+year.
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

  const duplicate = await PayrollJob.findOne({
    type,
    month: m,
    year: y,
    status: { $in: ["queued", "running"] },
  })
    .select("_id status")
    .lean();
  if (duplicate) {
    const err = new Error(
      `An active ${type} job already exists for ${m}/${y} (${duplicate.status})`
    );
    err.code = "PAYROLL_JOB_DUPLICATE";
    err.httpStatus = 409;
    err.details = { existingJobId: duplicate._id, status: duplicate.status };
    throw err;
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
    await reclaimStalePayrollJobs();
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const now = new Date();
      const job = await PayrollJob.findOneAndUpdate(
        { status: "queued" },
        {
          $set: {
            status: "running",
            startedAt: now,
            heartbeatAt: now,
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
  let heartbeatTimer = null;
  try {
    job.progress = 10;
    job.heartbeatAt = new Date();
    await job.save();

    heartbeatTimer = setInterval(() => {
      PayrollJob.updateOne(
        { _id: job._id, status: "running" },
        { $set: { heartbeatAt: new Date() } }
      ).catch((err) => {
        console.error("[payrollJob] heartbeat failed", {
          jobId: job._id?.toString?.(),
          error: err?.message || err,
        });
      });
    }, 30_000);
    if (typeof heartbeatTimer.unref === "function") {
      heartbeatTimer.unref();
    }

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
    job.heartbeatAt = new Date();
    job.error = "";
    await job.save();
  } catch (error) {
    job.status = "failed";
    job.progress = 100;
    job.error = error.message || String(error);
    job.finishedAt = new Date();
    job.heartbeatAt = new Date();
    if (error.details?.summary) {
      job.summary = summarizePayrollJobResult(error.details);
    }
    await job.save();
    console.error("[payrollJob] execute failed", {
      jobId: job._id?.toString?.(),
      type: job.type,
      error: job.error,
    });
  } finally {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
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
