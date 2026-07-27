import {
  enqueuePayrollJob,
  getPayrollJobById,
  listPayrollJobs,
} from "../services/payroll/payrollJobService.js";
import { sendPeriodGateError } from "../services/payroll/payrollPeriodGates.js";

/**
 * POST /api/payroll/jobs/bulk-generate
 */
export const enqueueBulkGenerateJob = async (req, res) => {
  try {
    const job = await enqueuePayrollJob({
      type: "bulk_generate",
      month: req.body.month,
      year: req.body.year,
      paymentDate: req.body.paymentDate,
      createdBy: req.user._id || req.user.id,
    });

    return res.status(202).json({
      success: true,
      message: "Bulk generate job queued",
      data: {
        jobId: job._id,
        status: job.status,
        type: job.type,
        month: job.month,
        year: job.year,
      },
    });
  } catch (error) {
    if (sendPeriodGateError(res, error)) return;
    const status = /required|Invalid|month/i.test(error.message) ? 400 : 500;
    return res.status(status).json({
      success: false,
      message: error.message || "Failed to enqueue bulk generate job",
    });
  }
};

/**
 * POST /api/payroll/jobs/bulk-email
 */
export const enqueueBulkEmailJob = async (req, res) => {
  try {
    const job = await enqueuePayrollJob({
      type: "bulk_email",
      month: req.body.month,
      year: req.body.year,
      createdBy: req.user._id || req.user.id,
    });

    return res.status(202).json({
      success: true,
      message: "Bulk email job queued",
      data: {
        jobId: job._id,
        status: job.status,
        type: job.type,
        month: job.month,
        year: job.year,
      },
    });
  } catch (error) {
    const status = /required|Invalid|month/i.test(error.message) ? 400 : 500;
    return res.status(status).json({
      success: false,
      message: error.message || "Failed to enqueue bulk email job",
    });
  }
};

/**
 * GET /api/payroll/jobs
 */
export const listJobs = async (req, res) => {
  try {
    const jobs = await listPayrollJobs({
      limit: req.query.limit,
      status: req.query.status,
      type: req.query.type,
    });
    return res.status(200).json({ success: true, data: jobs });
  } catch (error) {
    console.error("Error in listJobs:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to list payroll jobs",
    });
  }
};

/**
 * GET /api/payroll/jobs/:id
 */
export const getJobById = async (req, res) => {
  try {
    const job = await getPayrollJobById(req.params.id);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Payroll job not found",
      });
    }
    return res.status(200).json({ success: true, data: job });
  } catch (error) {
    console.error("Error in getJobById:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch payroll job",
    });
  }
};
