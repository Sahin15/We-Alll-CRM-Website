import express from "express";
import { protect } from '../middleware/authMiddleware.js';


import { requireModulePermission } from "../authz/authzMiddleware.js";
import SalaryPreviewService from "../services/salaryPreviewService.js";

const router = express.Router();
const PAYROLL_MANAGE_ROLES = ["hr", "admin", "superadmin", "manager"];
const PAYROLL_SELF_ROLES = [
  "employee",
  "hod",
  "sales",
  "hr",
  "admin",
  "superadmin",
];
const previewService = new SalaryPreviewService();

// Generate salary preview for employee
router.post("/generate", 
  protect, 
  requireModulePermission("finance", "payroll.slip.manage", { legacyRoles: PAYROLL_MANAGE_ROLES }),
  async (req, res) => {
    try {
      const { employeeId, month, year, additionalData } = req.body;

      if (!employeeId || !month || !year) {
        return res.status(400).json({
          message: "Employee ID, month, and year are required"
        });
      }

      const preview = await previewService.generatePreview(
        employeeId, 
        month, 
        year, 
        additionalData
      );

      res.status(201).json({
        message: "Salary preview generated successfully",
        preview
      });
    } catch (error) {
      
      res.status(500).json({
        message: "Failed to generate salary preview",
        error: error.message
      });
    }
  }
);

// Bulk generate previews
router.post("/bulk-generate",
  protect,
  requireModulePermission("finance", "payroll.slip.manage", { legacyRoles: PAYROLL_MANAGE_ROLES }),
  async (req, res) => {
    try {
      const { employeeIds, month, year, additionalData, workingDaysOverride } = req.body;

      if (!employeeIds || !Array.isArray(employeeIds) || !month || !year) {
        return res.status(400).json({
          message: "Employee IDs array, month, and year are required"
        });
      }

      const results = await previewService.bulkGeneratePreviews(
        employeeIds,
        month,
        year,
        additionalData,
        workingDaysOverride  // pass override to service
      );

      res.status(200).json({
        message: "Bulk preview generation completed",
        ...results
      });
    } catch (error) {
      res.status(500).json({
        message: "Failed to generate previews",
        error: error.message
      });
    }
  }
);

// Get working days info for a month (used for mid-month preview confirmation)
router.get("/working-days-info",
  protect,
  requireModulePermission("finance", "payroll.slip.manage", { legacyRoles: PAYROLL_MANAGE_ROLES }),
  async (req, res) => {
    try {
      const month = parseInt(req.query.month);
      const year = parseInt(req.query.year);

      if (!month || !year) {
        return res.status(400).json({ message: "month and year are required" });
      }

      const WorkingDaysCalculator = (await import("../services/workingDaysCalculator.js")).default;
      const calc = new WorkingDaysCalculator();

      const now = new Date();
      const isCurrentMonth = month === (now.getMonth() + 1) && year === now.getFullYear();

      let result;
      if (isCurrentMonth) {
        // Calculate only up to today
        result = await calc.calculateWorkingDays(month, year);
        // Adjust to count only days up to today
        const todayDay = now.getDate();
        const totalDaysInMonth = new Date(year, month, 0).getDate();

        // Recalculate weekends and holidays up to today
        const weekendInfo = calc.calculateWeekends(month, year, "6-day");
        const weekendsUpToToday = weekendInfo.sundays.filter(d => d.getDate() <= todayDay).length;
        const holidaysUpToToday = (result.holidayDates || []).filter(d => new Date(d).getDate() <= todayDay).length;
        const workingDaysUpToToday = todayDay - weekendsUpToToday - holidaysUpToToday;

        result = {
          ...result,
          totalDays: todayDay,
          weekends: weekendsUpToToday,
          holidays: holidaysUpToToday,
          workingDays: Math.max(0, workingDaysUpToToday),
          totalDaysInMonth,
          isPartialMonth: true
        };
      } else {
        result = await calc.calculateWorkingDays(month, year);
        result.isPartialMonth = false;
      }

      res.status(200).json(result);
    } catch (error) {
      console.error("Error getting working days info:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
);

// Get employee's own salary preview
router.get("/my-preview/:month/:year",
  protect,
  requireModulePermission("finance", "payroll.slip.view_self", { legacyRoles: PAYROLL_SELF_ROLES }),
  async (req, res) => {
    try {
      const { month, year } = req.params;
      const employeeId = req.user.id;

      const preview = await previewService.getPreview(employeeId, parseInt(month), parseInt(year));

      res.status(200).json(preview);
    } catch (error) {
      
      res.status(404).json({
        message: "Salary preview not found",
        error: error.message
      });
    }
  }
);

// Bulk recalculate previews for a month — fixes inflated unpaid leave counts
// caused by previews generated before the month ended.
// MUST be defined before /:previewId routes to avoid Express matching "bulk-recalculate" as a previewId.
router.post("/bulk-recalculate",
  protect,
  requireModulePermission("finance", "payroll.slip.manage", { legacyRoles: PAYROLL_MANAGE_ROLES }),
  async (req, res) => {
    try {
      const { month, year } = req.body;

      if (!month || !year) {
        return res.status(400).json({ message: "Month and year are required" });
      }

      const SalaryPreview = (await import("../models/salaryPreviewModel.js")).default;
      const SalaryStructure = (await import("../models/salaryStructureModel.js")).default;
      const LeaveImpactCalculator = (await import("../services/leaveImpactCalculator.js")).default;
      const WorkingDaysCalculator = (await import("../services/workingDaysCalculator.js")).default;

      const leaveImpactCalc = new LeaveImpactCalculator();
      const workingDaysCalc = new WorkingDaysCalculator();

      const previews = await SalaryPreview.find({
        month: parseInt(month),
        year: parseInt(year),
        status: { $nin: ["finalized"] }
      }).populate({
        path: "employee",
        select: "name email employeeId designation department",
        populate: { path: "department", select: "name" }
      });

      const results = { success: [], failed: [], skipped: [] };

      for (const preview of previews) {
        try {
          const employeeId = preview.employee._id;

          const salaryStructure = await SalaryStructure.getActiveStructure(employeeId);
          if (!salaryStructure) {
            results.skipped.push({
              previewId: preview._id,
              employee: preview.employee.name,
              reason: "No active salary structure"
            });
            continue;
          }

          const workingDaysResult = await workingDaysCalc.calculateWorkingDays(
            parseInt(month), parseInt(year), preview.employee.department?._id
          );
          const leaveImpactResult = await leaveImpactCalc.calculateLeaveDeduction(
            employeeId, parseInt(month), parseInt(year), salaryStructure
          );

          const effectiveWorkingDays = leaveImpactResult.effectiveWorkingDays ?? workingDaysResult.workingDays;

          const oldUnpaid = preview.leaveImpact.unpaidLeaves;
          const oldNet = preview.salaryBreakdown.netSalary;

          preview.workingDaysBreakdown = {
            ...workingDaysResult,
            workingDays: effectiveWorkingDays,
            isPartialMonth: leaveImpactResult.isPartialMonth || false
          };

          preview.leaveImpact = leaveImpactResult;
          preview.salaryBreakdown.deductions.lossOfPay = leaveImpactResult.deductionAmount;

          const earnings = preview.salaryBreakdown.earnings;
          const deductions = preview.salaryBreakdown.deductions;

          const grossSalary = Object.values(earnings).reduce((sum, val) => {
            if (Array.isArray(val)) return sum + val.reduce((s, i) => s + (i.amount || 0), 0);
            return sum + (val || 0);
          }, 0);

          const totalDeductions = Object.values(deductions).reduce((sum, val) => {
            if (Array.isArray(val)) return sum + val.reduce((s, i) => s + (i.amount || 0), 0);
            return sum + (val || 0);
          }, 0);

          preview.salaryBreakdown.grossSalary = grossSalary;
          preview.salaryBreakdown.totalDeductions = totalDeductions;
          preview.salaryBreakdown.netSalary = grossSalary - totalDeductions;

          await preview.save();

          results.success.push({
            previewId: preview._id,
            employee: preview.employee.name,
            employeeId: preview.employee.employeeId,
            unpaidLeavesBefore: oldUnpaid,
            unpaidLeavesAfter: leaveImpactResult.unpaidLeaves,
            netSalaryBefore: oldNet,
            netSalaryAfter: preview.salaryBreakdown.netSalary
          });
        } catch (err) {
          results.failed.push({
            previewId: preview._id,
            employee: preview.employee?.name || "Unknown",
            error: err.message
          });
        }
      }

      res.status(200).json({
        message: `Recalculated ${results.success.length} salary previews`,
        summary: {
          total: previews.length,
          success: results.success.length,
          failed: results.failed.length,
          skipped: results.skipped.length
        },
        results
      });
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
);

// Submit employee query on preview
router.post("/:previewId/query",
  protect,
  requireModulePermission("finance", "payroll.slip.view_self", { legacyRoles: PAYROLL_SELF_ROLES }),
  async (req, res) => {
    try {
      const { previewId } = req.params;
      const { query } = req.body;
      const employeeId = req.user.id;

      if (!query || query.trim().length === 0) {
        return res.status(400).json({
          message: "Query text is required"
        });
      }

      const updatedPreview = await previewService.submitEmployeeQuery(
        previewId,
        query.trim(),
        employeeId
      );

      res.status(200).json({
        message: "Query submitted successfully",
        preview: updatedPreview
      });
    } catch (error) {
      
      res.status(500).json({
        message: "Failed to submit query",
        error: error.message
      });
    }
  }
);

// HR respond to employee query
router.post("/:previewId/query/:queryIndex/respond",
  protect,
  requireModulePermission("finance", "payroll.slip.manage", { legacyRoles: PAYROLL_MANAGE_ROLES }),
  async (req, res) => {
    try {
      const { previewId, queryIndex } = req.params;
      const { response } = req.body;
      const hrUserId = req.user.id;

      if (!response || response.trim().length === 0) {
        return res.status(400).json({
          message: "Response text is required"
        });
      }

      const updatedPreview = await previewService.respondToQuery(
        previewId,
        parseInt(queryIndex),
        response.trim(),
        hrUserId
      );

      res.status(200).json({
        message: "Response submitted successfully",
        preview: updatedPreview
      });
    } catch (error) {
      
      res.status(500).json({
        message: "Failed to respond to query",
        error: error.message
      });
    }
  }
);

// Employee acknowledge preview
router.post("/:previewId/acknowledge",
  protect,
  requireModulePermission("finance", "payroll.slip.view_self", { legacyRoles: PAYROLL_SELF_ROLES }),
  async (req, res) => {
    try {
      const { previewId } = req.params;
      const employeeId = req.user.id;

      const updatedPreview = await previewService.acknowledgePreview(previewId, employeeId);

      res.status(200).json({
        message: "Preview acknowledged successfully",
        preview: updatedPreview
      });
    } catch (error) {
      
      res.status(500).json({
        message: "Failed to acknowledge preview",
        error: error.message
      });
    }
  }
);

// HR finalize preview
router.post("/:previewId/finalize",
  protect,
  requireModulePermission("finance", "payroll.slip.manage", { legacyRoles: PAYROLL_MANAGE_ROLES }),
  async (req, res) => {
    try {
      const { previewId } = req.params;
      const hrUserId = req.user.id;

      const updatedPreview = await previewService.finalizePreview(previewId, hrUserId);

      res.status(200).json({
        message: "Preview finalized successfully",
        preview: updatedPreview
      });
    } catch (error) {
      
      res.status(500).json({
        message: "Failed to finalize preview",
        error: error.message
      });
    }
  }
);

// Get all previews for a month (HR view)
router.get("/month/:month/:year",
  protect,
  requireModulePermission("finance", "payroll.slip.manage", { legacyRoles: PAYROLL_MANAGE_ROLES }),
  async (req, res) => {
    try {
      const { month, year } = req.params;
      const { status, department } = req.query;

      const filters = {};
      if (status) filters.status = status;
      if (department) filters["employee.department"] = department;

      const previews = await previewService.getPreviewsForMonth(
        parseInt(month),
        parseInt(year),
        filters
      );

      res.status(200).json(previews);
    } catch (error) {
      
      res.status(500).json({
        message: "Failed to get previews",
        error: error.message
      });
    }
  }
);

// Get previews requiring HR attention
router.get("/attention/:month/:year",
  protect,
  requireModulePermission("finance", "payroll.slip.manage", { legacyRoles: PAYROLL_MANAGE_ROLES }),
  async (req, res) => {
    try {
      const { month, year } = req.params;

      const previews = await previewService.getPreviewsRequiringAttention(
        parseInt(month),
        parseInt(year)
      );

      res.status(200).json(previews);
    } catch (error) {
      
      res.status(500).json({
        message: "Failed to get previews requiring attention",
        error: error.message
      });
    }
  }
);

// Get preview statistics
router.get("/statistics/:month/:year",
  protect,
  requireModulePermission("finance", "payroll.slip.manage", { legacyRoles: PAYROLL_MANAGE_ROLES }),
  async (req, res) => {
    try {
      const { month, year } = req.params;

      const statistics = await previewService.getPreviewStatistics(
        parseInt(month),
        parseInt(year)
      );

      res.status(200).json(statistics);
    } catch (error) {
      
      res.status(500).json({
        message: "Failed to get statistics",
        error: error.message
      });
    }
  }
);

// Update preview with corrections
router.put("/:previewId/corrections",
  protect,
  requireModulePermission("finance", "payroll.slip.manage", { legacyRoles: PAYROLL_MANAGE_ROLES }),
  async (req, res) => {
    try {
      const { previewId } = req.params;
      const { corrections } = req.body;
      const hrUserId = req.user.id;

      if (!corrections) {
        return res.status(400).json({
          message: "Corrections data is required"
        });
      }

      const updatedPreview = await previewService.updatePreviewWithCorrections(
        previewId,
        corrections,
        hrUserId
      );

      res.status(200).json({
        message: "Preview updated with corrections",
        preview: updatedPreview
      });
    } catch (error) {
      
      res.status(500).json({
        message: "Failed to update preview",
        error: error.message
      });
    }
  }
);

// Convert finalized preview to salary slip
router.post("/:previewId/convert-to-slip",
  protect,
  requireModulePermission("finance", "payroll.slip.manage", { legacyRoles: PAYROLL_MANAGE_ROLES }),
  async (req, res) => {
    try {
      const { previewId } = req.params;
      const hrUserId = req.user.id;

      const salarySlip = await previewService.convertPreviewToSalarySlip(previewId, hrUserId);

      res.status(201).json({
        message: "Preview converted to salary slip successfully",
        salarySlip
      });
    } catch (error) {
      
      res.status(500).json({
        message: "Failed to convert preview",
        error: error.message
      });
    }
  }
);

// Delete preview
router.delete("/:previewId",
  protect,
  requireModulePermission("finance", "payroll.slip.manage", { legacyRoles: PAYROLL_MANAGE_ROLES }),
  async (req, res) => {
    try {
      const { previewId } = req.params;
      const userId = req.user.id;

      await previewService.deletePreview(previewId, userId);

      res.status(200).json({
        message: "Preview deleted successfully"
      });
    } catch (error) {
      
      res.status(500).json({
        message: "Failed to delete preview",
        error: error.message
      });
    }
  }
);

export default router;