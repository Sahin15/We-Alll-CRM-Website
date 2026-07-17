import {
  dualRunPayroll,
  processEmployeePayroll,
} from "../services/payroll/payrollEngine.js";
import SalaryStructure from "../models/salaryStructureModel.js";

/**
 * Dual-run a single employee for a month (loads structure + leave impact).
 */
export const dualRunEmployee = async (req, res) => {
  try {
    const employeeId = req.body.employeeId || req.params.employeeId;
    const month = Number(req.body.month);
    const year = Number(req.body.year);

    if (!employeeId || !month || !year) {
      return res.status(400).json({
        success: false,
        message: "employeeId, month, and year are required",
      });
    }

    const result = await processEmployeePayroll({
      employeeId,
      month,
      year,
      overrides: {
        bonus: req.body.bonus,
        overtime: req.body.overtime,
        arrears: req.body.arrears,
        reimbursements: req.body.reimbursements,
        incentives: req.body.incentives,
        advances: req.body.advances,
        loans: req.body.loans,
      },
    });

    return res.status(200).json({
      success: true,
      message: result.dual.diff.withinTolerance
        ? "V1 and V2 totals match within tolerance"
        : "V1 and V2 totals differ — review before enabling PAYROLL_V2_ENGINE",
      data: result,
    });
  } catch (error) {
    console.error("Error in dualRunEmployee:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error running payroll dual-run",
    });
  }
};

/**
 * Dual-run from an in-memory structure payload (no leave DB) — useful for fixtures.
 */
export const dualRunStructurePreview = async (req, res) => {
  try {
    const { structure, overrides = {} } = req.body;
    if (!structure || structure.basicSalary == null) {
      return res.status(400).json({
        success: false,
        message: "structure with basicSalary is required",
      });
    }

    const dual = dualRunPayroll(structure, overrides);
    return res.status(200).json({
      success: true,
      data: dual,
    });
  } catch (error) {
    console.error("Error in dualRunStructurePreview:", error);
    return res.status(500).json({
      success: false,
      message: "Server error previewing dual-run",
    });
  }
};

/**
 * Dual-run all employees that have an active salary structure for a month.
 */
export const dualRunMonth = async (req, res) => {
  try {
    const month = Number(req.body.month);
    const year = Number(req.body.year);
    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: "month and year are required",
      });
    }

    const structures = await SalaryStructure.find({ status: "active" })
      .select("employee")
      .lean();

    const employeeIds = [
      ...new Set(structures.map((s) => String(s.employee))),
    ];

    const results = [];
    let matched = 0;
    let mismatched = 0;
    let failed = 0;

    for (const employeeId of employeeIds) {
      try {
        const result = await processEmployeePayroll({
          employeeId,
          month,
          year,
        });
        if (result.dual.diff.withinTolerance) matched += 1;
        else mismatched += 1;
        results.push({
          employeeId,
          withinTolerance: result.dual.diff.withinTolerance,
          netDiff: result.dual.diff.netSalary,
          v1Net: result.dual.v1.totals.netSalary,
          v2Net: result.dual.v2.totals.netSalary,
        });
      } catch (err) {
        failed += 1;
        results.push({
          employeeId,
          error: err.message,
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: `Dual-run complete: ${matched} match, ${mismatched} differ, ${failed} failed`,
      data: {
        summary: {
          total: employeeIds.length,
          matched,
          mismatched,
          failed,
        },
        results,
      },
    });
  } catch (error) {
    console.error("Error in dualRunMonth:", error);
    return res.status(500).json({
      success: false,
      message: "Server error running month dual-run",
    });
  }
};
