import {
  creditSalaryForEmployees,
} from "../services/payroll/creditSalaryService.js";
import {
  sendPeriodGateError,
} from "../services/payroll/payrollPeriodGates.js";
import { parseSalaryPaymentDate } from "../services/payroll/payrollPeriodPaymentDate.js";

/**
 * POST /api/payroll/credit-salary
 * Body: { month, year, employeeIds[], paymentDate, regenerate? }
 */
export const creditSalary = async (req, res) => {
  try {
    const { month, year, employeeIds, paymentDate, regenerate } = req.body;

    const m = Number(month);
    const y = Number(year);

    if (!m || !y || m < 1 || m > 12) {
      return res.status(400).json({
        success: false,
        error: "Valid month (1-12) and year are required",
      });
    }

    if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: "employeeIds must be a non-empty array",
      });
    }

    try {
      parseSalaryPaymentDate(paymentDate);
    } catch {
      return res.status(400).json({
        success: false,
        error: "Valid paymentDate is required",
      });
    }

    const result = await creditSalaryForEmployees({
      month: m,
      year: y,
      employeeIds,
      paymentDate,
      creditedBy: req.user._id || req.user.id,
      regenerate: Boolean(regenerate),
    });

    return res.status(200).json({
      success: true,
      message: "Salary credit completed",
      data: {
        summary: {
          total: employeeIds.length,
          success: result.success.length,
          failed: result.failed.length,
          skipped: result.skipped.length,
        },
        success: result.success,
        failed: result.failed,
        skipped: result.skipped,
        paymentDate: result.paymentDate,
        period: result.period,
      },
    });
  } catch (error) {
    if (sendPeriodGateError(res, error)) {
      return;
    }
    console.error("Error in creditSalary:", error);
    if (error.code === "INVALID_PAYMENT_DATE" || error.code === "EMPLOYEES_REQUIRED") {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }
    return res.status(500).json({
      success: false,
      error: "Server error crediting salary",
    });
  }
};
