import SalaryPreview from "../models/salaryPreviewModel.js";
import SalaryStructure from "../models/salaryStructureModel.js";
import User from "../models/userModel.js";
import WorkingDaysCalculator from "./workingDaysCalculator.js";
import LeaveImpactCalculator from "./leaveImpactCalculator.js";

class SalaryPreviewService {
  constructor() {
    this.workingDaysCalculator = new WorkingDaysCalculator();
    this.leaveImpactCalculator = new LeaveImpactCalculator();
  }

  /**
   * Generate salary preview for an employee
   * @param {string} employeeId - Employee ID
   * @param {number} month - Month (1-12)
   * @param {number} year - Year
   * @param {Object} additionalData - Additional earnings/deductions
   * @returns {Object} Generated salary preview
   */
  async generatePreview(employeeId, month, year, additionalData = {}, workingDaysOverride = null) {
    try {
      const preview = await SalaryPreview.generatePreview(employeeId, month, year, additionalData, workingDaysOverride);
      
      // Populate employee details with department
      await preview.populate({
        path: "employee",
        select: "name email employeeId designation department",
        populate: {
          path: "department",
          select: "name"
        }
      });
      
      return preview;
    } catch (error) {
      
      throw error;
    }
  }

  /**
   * Bulk generate previews for multiple employees
   * @param {Array} employeeIds - Array of employee IDs
   * @param {number} month - Month (1-12)
   * @param {number} year - Year
   * @param {Object} commonAdditionalData - Common additional data for all employees
   * @returns {Object} Bulk generation results
   */
  async bulkGeneratePreviews(employeeIds, month, year, commonAdditionalData = {}, workingDaysOverride = null) {
    try {
      const results = {
        success: [],
        failed: [],
        skipped: []
      };

      for (const employeeId of employeeIds) {
        try {
          const existingPreview = await SalaryPreview.findOne({
            employee: employeeId,
            month,
            year
          });

          if (existingPreview && existingPreview.status === "finalized") {
            results.skipped.push({
              employeeId,
              reason: "Preview already finalized"
            });
            continue;
          }

          const preview = await this.generatePreview(employeeId, month, year, commonAdditionalData, workingDaysOverride);
          
          results.success.push({
            employeeId,
            previewId: preview._id,
            netSalary: preview.salaryBreakdown.netSalary,
            updated: Boolean(existingPreview)
          });
        } catch (error) {
          results.failed.push({
            employeeId,
            error: error.message
          });
        }
      }

      return {
        summary: {
          total: employeeIds.length,
          success: results.success.length,
          failed: results.failed.length,
          skipped: results.skipped.length
        },
        results
      };
    } catch (error) {
      
      throw error;
    }
  }

  /**
   * Get preview for employee
   * @param {string} employeeId - Employee ID
   * @param {number} month - Month (1-12)
   * @param {number} year - Year
   * @returns {Object} Salary preview
   */
  async getPreview(employeeId, month, year) {
    try {
      const preview = await SalaryPreview.findOne({
        employee: employeeId,
        month,
        year
      })
      .populate({
        path: "employee",
        select: "name email employeeId designation department",
        populate: {
          path: "department",
          select: "name"
        }
      })
      .populate("employeeQueries.respondedBy", "name email");

      if (!preview) {
        throw new Error("Salary preview not found");
      }

      try {
        await this.syncSimplePreviewIfNeeded(preview);
      } catch (err) {
        console.warn(
          "[salaryPreview] sync on getPreview failed:",
          err.message
        );
      }

      return preview;
    } catch (error) {
      
      throw error;
    }
  }

  /**
   * Submit employee query on preview
   * @param {string} previewId - Preview ID
   * @param {string} query - Employee query
   * @param {string} employeeId - Employee ID
   * @returns {Object} Updated preview
   */
  async submitEmployeeQuery(previewId, query, employeeId) {
    try {
      const preview = await SalaryPreview.findById(previewId);
      if (!preview) {
        throw new Error("Preview not found");
      }

      const updatedPreview = await preview.submitQuery(query, employeeId);
      
      // Populate for response
      await updatedPreview.populate("employee", "name email employeeId");
      
      return updatedPreview;
    } catch (error) {
      
      throw error;
    }
  }

  /**
   * HR response to employee query
   * @param {string} previewId - Preview ID
   * @param {number} queryIndex - Index of the query to respond to
   * @param {string} response - HR response
   * @param {string} hrUserId - HR user ID
   * @returns {Object} Updated preview
   */
  async respondToQuery(previewId, queryIndex, response, hrUserId) {
    try {
      const preview = await SalaryPreview.findById(previewId);
      if (!preview) {
        throw new Error("Preview not found");
      }

      const updatedPreview = await preview.respondToQuery(queryIndex, response, hrUserId);
      
      // Populate for response
      await updatedPreview.populate("employee", "name email employeeId");
      await updatedPreview.populate("employeeQueries.respondedBy", "name email");
      
      return updatedPreview;
    } catch (error) {
      
      throw error;
    }
  }

  /**
   * Employee acknowledges preview
   * @param {string} previewId - Preview ID
   * @param {string} employeeId - Employee ID
   * @returns {Object} Updated preview
   */
  async acknowledgePreview(previewId, employeeId) {
    try {
      const preview = await SalaryPreview.findById(previewId);
      if (!preview) {
        throw new Error("Preview not found");
      }

      const updatedPreview = await preview.acknowledge(employeeId);
      
      // Populate for response
      await updatedPreview.populate("employee", "name email employeeId");
      
      return updatedPreview;
    } catch (error) {
      
      throw error;
    }
  }

  /**
   * Finalize preview (HR action)
   * @param {string} previewId - Preview ID
   * @param {string} hrUserId - HR user ID
   * @returns {Object} Updated preview
   */
  async finalizePreview(previewId, hrUserId) {
    try {
      const preview = await SalaryPreview.findById(previewId);
      if (!preview) {
        throw new Error("Preview not found");
      }

      const updatedPreview = await preview.finalize(hrUserId);
      
      // Populate for response
      await updatedPreview.populate("employee", "name email employeeId");
      await updatedPreview.populate("finalizedBy", "name email");
      
      return updatedPreview;
    } catch (error) {
      
      throw error;
    }
  }

  /**
   * Rebuild a non-finalized simple-mode preview from structure + approved
   * adjustments so list/detail nets match Simple Payroll.
   * Does not reset review status (unlike full regenerate).
   *
   * @param {import("mongoose").Document} preview
   * @returns {Promise<import("mongoose").Document>}
   */
  async syncSimplePreviewIfNeeded(preview) {
    if (!preview || preview.status === "finalized") return preview;

    const SalaryStructure = (await import("../models/salaryStructureModel.js"))
      .default;
    const employeeId = preview.employee?._id || preview.employee;
    const structure = await SalaryStructure.getActiveStructure(employeeId);
    if (!structure) return preview;

    const e = preview.salaryBreakdown?.earnings || {};
    const d = preview.salaryBreakdown?.deductions || {};
    const looksLikeSimpleBreakdown =
      (Number(e.hra) || 0) === 0 &&
      (Number(e.specialAllowance) || 0) === 0 &&
      (Number(e.transportAllowance) || 0) === 0 &&
      (Number(e.medicalAllowance) || 0) === 0 &&
      (Number(d.providentFund) || 0) === 0 &&
      (Number(d.professionalTax) || 0) === 0 &&
      (Number(d.esi) || 0) === 0;

    const isSimple =
      structure.payrollMode === "simple" ||
      preview.payrollMode === "simple" ||
      (structure.monthlySalary != null && looksLikeSimpleBreakdown);

    if (!isSimple) return preview;

    const { buildSimpleSlipPayload } = await import(
      "./payroll/simpleSlipPersist.js"
    );
    const { finalizePreviewBreakdown } = await import(
      "./payroll/simpleSalaryPreviewBuild.js"
    );

    const structureForBuild = {
      ...(typeof structure.toObject === "function"
        ? structure.toObject()
        : structure),
      payrollMode: "simple",
      monthlySalary:
        structure.monthlySalary != null
          ? Number(structure.monthlySalary)
          : Number(structure.basicSalary) || 0,
      providentFund: 0,
      professionalTax: 0,
      esi: 0,
    };

    const simplePayload = await buildSimpleSlipPayload({
      structure: structureForBuild,
      employeeId,
      month: preview.month,
      year: preview.year,
      lossOfPay: 0,
    });
    const finalized = finalizePreviewBreakdown({
      earnings: simplePayload.earnings,
      deductions: simplePayload.deductions,
    });

    preview.payrollMode = "simple";
    preview.salaryBreakdown = {
      earnings: finalized.earnings,
      deductions: finalized.deductions,
      grossSalary: finalized.grossSalary,
      totalDeductions: finalized.totalDeductions,
      netSalary: finalized.netSalary,
    };
    if (preview.leaveImpact) {
      preview.leaveImpact.deductionAmount = 0;
    }
    preview.markModified("salaryBreakdown");
    preview.markModified("leaveImpact");
    await preview.save();
    return preview;
  }

  /**
   * Get all previews for a month (HR view)
   * @param {number} month - Month (1-12)
   * @param {number} year - Year
   * @param {Object} filters - Additional filters
   * @returns {Array} Array of previews
   */
  async getPreviewsForMonth(month, year, filters = {}) {
    try {
      const query = { month, year, ...filters };
      
      const previews = await SalaryPreview.find(query)
        .populate({
          path: "employee",
          select: "name email employeeId designation department",
          populate: {
            path: "department",
            select: "name"
          }
        })
        .populate("acknowledgedBy", "name email")
        .populate("finalizedBy", "name email")
        .sort({ "employee.name": 1 });

      for (const preview of previews) {
        try {
          await this.syncSimplePreviewIfNeeded(preview);
        } catch (err) {
          console.warn(
            "[salaryPreview] syncSimplePreviewIfNeeded failed:",
            preview._id?.toString?.(),
            err.message
          );
        }
      }

      return previews;
    } catch (error) {
      
      throw error;
    }
  }

  /**
   * Get previews requiring HR attention
   * @param {number} month - Month (1-12)
   * @param {number} year - Year
   * @returns {Array} Array of previews needing attention
   */
  async getPreviewsRequiringAttention(month, year) {
    try {
      const previews = await SalaryPreview.find({
        month,
        year,
        $or: [
          { status: "query_raised" },
          { 
            status: "under_review",
            reviewDeadline: { $lt: new Date() }
          }
        ]
      })
      .populate({
        path: "employee",
        select: "name email employeeId designation department",
        populate: {
          path: "department",
          select: "name"
        }
      })
      .populate("employeeQueries.respondedBy", "name email")
      .sort({ updatedAt: -1 });

      return previews;
    } catch (error) {
      
      throw error;
    }
  }

  /**
   * Get preview statistics for a month
   * @param {number} month - Month (1-12)
   * @param {number} year - Year
   * @returns {Object} Preview statistics
   */
  async getPreviewStatistics(month, year) {
    try {
      const stats = await SalaryPreview.aggregate([
        {
          $match: { month, year }
        },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            totalNetSalary: { $sum: "$salaryBreakdown.netSalary" }
          }
        }
      ]);

      const totalPreviews = await SalaryPreview.countDocuments({ month, year });
      const queriesRaised = await SalaryPreview.countDocuments({
        month,
        year,
        "employeeQueries.0": { $exists: true }
      });

      const pendingQueries = await SalaryPreview.countDocuments({
        month,
        year,
        "employeeQueries": {
          $elemMatch: { status: "pending" }
        }
      });

      const expiredReviews = await SalaryPreview.countDocuments({
        month,
        year,
        status: { $in: ["generated", "under_review"] },
        reviewDeadline: { $lt: new Date() }
      });

      return {
        totalPreviews,
        statusBreakdown: stats,
        queriesRaised,
        pendingQueries,
        expiredReviews,
        generatedAt: new Date()
      };
    } catch (error) {
      
      throw error;
    }
  }

  /**
   * Update preview with corrections
   * @param {string} previewId - Preview ID
   * @param {Object} corrections - Salary corrections
   * @param {string} hrUserId - HR user ID
   * @returns {Object} Updated preview
   */
  async updatePreviewWithCorrections(previewId, corrections, hrUserId) {
    try {
      const preview = await SalaryPreview.findById(previewId);
      if (!preview) {
        throw new Error("Preview not found");
      }

      if (preview.status === "finalized") {
        throw new Error("Cannot correct a finalized salary preview");
      }

      const SalaryStructure = (await import("../models/salaryStructureModel.js"))
        .default;
      const structure = await SalaryStructure.getActiveStructure(preview.employee);
      const isSimple =
        preview.payrollMode === "simple" ||
        structure?.payrollMode === "simple" ||
        corrections?.simple === true;

      if (isSimple && structure) {
        const { buildSimpleSlipPayload } = await import(
          "./payroll/simpleSlipPersist.js"
        );
        const { finalizePreviewBreakdown } = await import(
          "./payroll/simpleSalaryPreviewBuild.js"
        );

        const monthlyOverride =
          corrections.monthlySalary != null
            ? Number(corrections.monthlySalary)
            : null;
        const tdsOverride =
          corrections.tdsAmount != null ? Number(corrections.tdsAmount) : null;

        const structureForBuild = {
          ...(typeof structure.toObject === "function"
            ? structure.toObject()
            : structure),
          payrollMode: "simple",
          monthlySalary:
            monthlyOverride != null && !Number.isNaN(monthlyOverride)
              ? monthlyOverride
              : structure.monthlySalary ?? structure.basicSalary,
          tdsEnabled:
            tdsOverride != null
              ? tdsOverride > 0 || Boolean(structure.tdsEnabled)
              : Boolean(structure.tdsEnabled),
          tds:
            tdsOverride != null && !Number.isNaN(tdsOverride)
              ? Math.max(0, tdsOverride)
              : structure.tds || 0,
          providentFund: 0,
          professionalTax: 0,
          esi: 0,
        };

        const simplePayload = await buildSimpleSlipPayload({
          structure: structureForBuild,
          employeeId: preview.employee,
          month: preview.month,
          year: preview.year,
          lossOfPay: 0,
        });
        const finalized = finalizePreviewBreakdown({
          earnings: simplePayload.earnings,
          deductions: simplePayload.deductions,
        });

        preview.payrollMode = "simple";
        preview.salaryBreakdown.earnings = finalized.earnings;
        preview.salaryBreakdown.deductions = finalized.deductions;
        preview.salaryBreakdown.grossSalary = finalized.grossSalary;
        preview.salaryBreakdown.totalDeductions = finalized.totalDeductions;
        preview.salaryBreakdown.netSalary = finalized.netSalary;
      } else {
        // Legacy path: apply field-level corrections
        if (corrections.earnings) {
          Object.assign(preview.salaryBreakdown.earnings, corrections.earnings);
        }

        if (corrections.deductions) {
          Object.assign(
            preview.salaryBreakdown.deductions,
            corrections.deductions
          );
        }

        const earnings = preview.salaryBreakdown.earnings;
        const deductions = preview.salaryBreakdown.deductions;

        const grossSalary = Object.values(earnings).reduce((sum, val) => {
          if (Array.isArray(val)) {
            return (
              sum + val.reduce((arrSum, item) => arrSum + (item.amount || 0), 0)
            );
          }
          return sum + (val || 0);
        }, 0);

        const totalDeductions = Object.values(deductions).reduce((sum, val) => {
          if (Array.isArray(val)) {
            return (
              sum + val.reduce((arrSum, item) => arrSum + (item.amount || 0), 0)
            );
          }
          return sum + (val || 0);
        }, 0);

        preview.salaryBreakdown.grossSalary = grossSalary;
        preview.salaryBreakdown.totalDeductions = totalDeductions;
        preview.salaryBreakdown.netSalary = grossSalary - totalDeductions;
      }

      // Add correction note
      if (corrections.note) {
        preview.employeeQueries.push({
          query: `HR Correction: ${corrections.note}`,
          submittedAt: new Date(),
          hrResponse: "Correction applied to salary calculation",
          respondedAt: new Date(),
          respondedBy: hrUserId,
          status: "responded"
        });
      }

      await preview.save();
      
      // Populate for response
      await preview.populate("employee", "name email employeeId");
      
      return preview;
    } catch (error) {
      
      throw error;
    }
  }

  /**
   * Convert finalized preview to salary slip
   * @param {string} previewId - Preview ID
   * @param {string} hrUserId - HR user ID
   * @returns {Object} Created salary slip
   */
  async convertPreviewToSalarySlip(previewId, hrUserId) {
    try {
      const preview = await SalaryPreview.findById(previewId)
        .populate({
          path: "employee",
          select: "name email employeeId designation department",
          populate: {
            path: "department",
            select: "name"
          }
        });

      if (!preview) {
        throw new Error("Preview not found");
      }

      if (preview.status !== "finalized") {
        throw new Error("Preview must be finalized before conversion");
      }

      // Import SalarySlip model
      const SalarySlip = (await import("../models/salarySlipModel.js")).default;

      // Create salary slip from preview
      const salarySlip = new SalarySlip({
        employee: preview.employee._id,
        month: preview.month,
        year: preview.year,
        payPeriod: `${new Date(preview.year, preview.month - 1).toLocaleString('default', { month: 'long' })} ${preview.year}`,
        
        // Working days from preview
        workingDaysCalculation: preview.workingDaysBreakdown,
        totalWorkingDays: preview.workingDaysBreakdown.workingDays,
        
        // Leave impact from preview
        leaveImpactDetails: preview.leaveImpact,
        paidLeaves: preview.leaveImpact.paidLeaves,
        unpaidLeaves: preview.leaveImpact.unpaidLeaves,
        daysWorked: preview.workingDaysBreakdown.workingDays - preview.leaveImpact.unpaidLeaves,
        daysAbsent: preview.leaveImpact.unpaidLeaves,
        
        // Salary breakdown from preview
        earnings: preview.salaryBreakdown.earnings,
        deductions: preview.salaryBreakdown.deductions,
        totalEarnings: preview.salaryBreakdown.grossSalary,
        totalDeductions: preview.salaryBreakdown.totalDeductions,
        netSalary: preview.salaryBreakdown.netSalary,
        
        // Link to preview
        previewId: preview._id,
        
        // Employee acknowledgment
        employeeAcknowledged: preview.acknowledgedBy ? true : false,
        acknowledgedAt: preview.acknowledgedAt,
        
        // Status and approval
        status: "generated",
        approvedBy: hrUserId,
        approvedAt: new Date(),
        
        notes: `Generated from salary preview ${preview._id}`
      });

      await salarySlip.save();

      // Update preview with salary slip reference
      preview.finalSalarySlip = salarySlip._id;
      await preview.save();

      return salarySlip;
    } catch (error) {
      
      throw error;
    }
  }

  /**
   * Delete preview (only if not finalized)
   * @param {string} previewId - Preview ID
   * @param {string} userId - User ID performing the action
   * @returns {boolean} Success status
   */
  async deletePreview(previewId, userId) {
    try {
      const preview = await SalaryPreview.findById(previewId);
      if (!preview) {
        throw new Error("Preview not found");
      }

      if (preview.status === "finalized") {
        throw new Error("Cannot delete finalized preview");
      }

      await SalaryPreview.findByIdAndDelete(previewId);
      return true;
    } catch (error) {
      
      throw error;
    }
  }
}

export default SalaryPreviewService;