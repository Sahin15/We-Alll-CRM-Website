import PayrollPeriod from "../models/payrollPeriodModel.js";
import { getAllowedTransitions } from "../services/payroll/payrollPeriodTransitions.js";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * @param {number} month
 * @param {number} year
 * @returns {string}
 */
const formatLabel = (month, year) => `${MONTH_NAMES[month - 1]} ${year}`;

/**
 * Open (create) a payroll period for a calendar month.
 */
export const openPayrollPeriod = async (req, res) => {
  try {
    const month = Number(req.body.month);
    const year = Number(req.body.year);
    const { cutoffDate, notes } = req.body;

    if (!month || !year || month < 1 || month > 12) {
      return res.status(400).json({
        success: false,
        message: "Valid month (1-12) and year are required",
      });
    }

    const existing = await PayrollPeriod.findByYearMonth(year, month);
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Payroll period for ${formatLabel(month, year)} already exists`,
        data: existing,
      });
    }

    const period = await PayrollPeriod.create({
      month,
      year,
      cutoffDate: cutoffDate ? new Date(cutoffDate) : null,
      notes: notes || "",
      status: "open",
      openedBy: req.user._id,
    });

    return res.status(201).json({
      success: true,
      message: `Opened payroll period ${formatLabel(month, year)}`,
      data: period,
    });
  } catch (error) {
    console.error("Error in openPayrollPeriod:", error);
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Payroll period already exists for this month/year",
      });
    }
    return res.status(500).json({
      success: false,
      message: "Server error opening payroll period",
    });
  }
};

/**
 * List payroll periods (optional year filter).
 */
export const listPayrollPeriods = async (req, res) => {
  try {
    const filter = {};
    if (req.query.year) {
      filter.year = Number(req.query.year);
    }
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const periods = await PayrollPeriod.find(filter)
      .sort({ year: -1, month: -1 })
      .populate("openedBy", "name email")
      .populate("frozenBy", "name email")
      .populate("lockedBy", "name email")
      .populate("unlockedBy", "name email")
      .populate("paidBy", "name email")
      .lean();

    const data = periods.map((p) => ({
      ...p,
      label: formatLabel(p.month, p.year),
      allowedTransitions: getAllowedTransitions(p.status),
    }));

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error in listPayrollPeriods:", error);
    return res.status(500).json({
      success: false,
      message: "Server error listing payroll periods",
    });
  }
};

/**
 * Get one period by id.
 */
export const getPayrollPeriodById = async (req, res) => {
  try {
    const period = await PayrollPeriod.findById(req.params.id)
      .populate("openedBy", "name email")
      .populate("frozenBy", "name email")
      .populate("lockedBy", "name email")
      .populate("unlockedBy", "name email")
      .populate("paidBy", "name email");

    if (!period) {
      return res.status(404).json({
        success: false,
        message: "Payroll period not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        ...period.toObject(),
        label: formatLabel(period.month, period.year),
        allowedTransitions: getAllowedTransitions(period.status),
      },
    });
  } catch (error) {
    console.error("Error in getPayrollPeriodById:", error);
    return res.status(500).json({
      success: false,
      message: "Server error fetching payroll period",
    });
  }
};

/**
 * Get period by year and month.
 */
export const getPayrollPeriodByYearMonth = async (req, res) => {
  try {
    const year = Number(req.params.year);
    const month = Number(req.params.month);

    if (!year || !month || month < 1 || month > 12) {
      return res.status(400).json({
        success: false,
        message: "Valid year and month (1-12) are required",
      });
    }

    const period = await PayrollPeriod.findByYearMonth(year, month)
      .populate("openedBy", "name email")
      .populate("frozenBy", "name email")
      .populate("lockedBy", "name email")
      .populate("unlockedBy", "name email")
      .populate("paidBy", "name email");

    if (!period) {
      return res.status(404).json({
        success: false,
        message: `No payroll period for ${formatLabel(month, year)}`,
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        ...period.toObject(),
        label: formatLabel(period.month, period.year),
        allowedTransitions: getAllowedTransitions(period.status),
      },
    });
  } catch (error) {
    console.error("Error in getPayrollPeriodByYearMonth:", error);
    return res.status(500).json({
      success: false,
      message: "Server error fetching payroll period",
    });
  }
};

/**
 * Shared named-action handler.
 * @param {"freeze"|"unfreeze"|"lock"|"unlock"|"markPaid"} action
 */
const actionHandler = (action) => async (req, res) => {
  try {
    const period = await PayrollPeriod.findById(req.params.id);
    if (!period) {
      return res.status(404).json({
        success: false,
        message: "Payroll period not found",
      });
    }

    const unlockReason = req.body?.unlockReason || req.body?.reason || "";

    try {
      period.applyAction(action, req.user._id, { unlockReason });
    } catch (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError.message,
      });
    }

    if (req.body?.notes !== undefined) {
      period.notes = req.body.notes;
    }

    await period.save();

    return res.status(200).json({
      success: true,
      message: `Payroll period is now ${period.status}`,
      data: {
        ...period.toObject(),
        label: formatLabel(period.month, period.year),
        allowedTransitions: getAllowedTransitions(period.status),
      },
    });
  } catch (error) {
    console.error(`Error applying payroll period action ${action}:`, error);
    return res.status(500).json({
      success: false,
      message: "Server error updating payroll period",
    });
  }
};

export const freezePayrollPeriod = actionHandler("freeze");
export const unfreezePayrollPeriod = actionHandler("unfreeze");
export const lockPayrollPeriod = actionHandler("lock");
export const unlockPayrollPeriod = actionHandler("unlock");
export const markPayrollPeriodPaid = actionHandler("markPaid");