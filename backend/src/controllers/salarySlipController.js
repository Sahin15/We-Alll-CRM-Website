import SalarySlip from "../models/salarySlipModel.js";
import SalaryStructure from "../models/salaryStructureModel.js";
import User from "../models/userModel.js";
import Department from "../models/departmentModel.js";
import LeaveRequest from "../models/leaveRequestModel.js";
import WorkingDaysCalculator from "../services/workingDaysCalculator.js";
import LeaveImpactCalculator from "../services/leaveImpactCalculator.js";
import notificationService from "../services/notificationService.js";
import { calculateProRataSalarySlip } from "../utils/proRataSalaryCalculator.js";
import { dualRunPayroll } from "../services/payroll/payrollEngine.js";
import { resolveAttendanceMoneyDeductions } from "../services/payroll/payrollCorrectnessHelpers.js";
import {
  assertPeriodAllows,
  sendPeriodGateError,
} from "../services/payroll/payrollPeriodGates.js";
import path from "path";
import fs from "fs";

// Helper function to get month name
const getMonthName = (month) => {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  return months[month - 1];
};

/**
 * Check if there's a mid-month salary change and calculate pro-rata if needed
 * @param {string} employeeId - Employee ID
 * @param {number} month - Month (1-12)
 * @param {number} year - Year
 * @param {Object} currentStructure - Current active salary structure
 * @returns {Object} Pro-rata calculation data or empty object if no pro-rata needed
 */
const checkAndCalculateProRata = async (employeeId, month, year, currentStructure) => {
  try {
    // Get all salary structures for this employee, sorted by effective date
    const allStructures = await SalaryStructure.find({ employee: employeeId })
      .sort({ effectiveFrom: -1 });

    if (allStructures.length < 2) {
      // No previous structure, no pro-rata needed
      return {
        isProRata: false,
        earnings: {},
        deductions: {}
      };
    }

    // Get the previous structure (before current one)
    const previousStructure = allStructures[1];

    // Check if the current structure became effective in this month
    const effectiveDate = new Date(currentStructure.effectiveFrom);
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);

    // If effective date is not in this month, no pro-rata needed
    if (effectiveDate < monthStart || effectiveDate > monthEnd) {
      return {
        isProRata: false,
        earnings: {},
        deductions: {}
      };
    }

    // If effective date is the first day of month, no pro-rata needed
    if (effectiveDate.getDate() === 1) {
      return {
        isProRata: false,
        earnings: {},
        deductions: {}
      };
    }

    // Calculate pro-rata salary
    const proRataCalculation = calculateProRataSalarySlip({
      oldStructure: previousStructure,
      newStructure: currentStructure,
      effectiveDate: effectiveDate,
      monthDate: monthStart
    });

    // Extract pro-rata earnings and deductions
    const proRataEarnings = {};
    const proRataDeductions = {};

    // Map earnings
    Object.keys(proRataCalculation.earnings).forEach(key => {
      proRataEarnings[key] = proRataCalculation.earnings[key].proRata;
    });

    // Map deductions
    Object.keys(proRataCalculation.deductions).forEach(key => {
      proRataDeductions[key] = proRataCalculation.deductions[key].proRata;
    });

    return {
      isProRata: true,
      effectiveDate: effectiveDate,
      daysWorkedOld: proRataCalculation.daysWorkedOld,
      daysWorkedNew: proRataCalculation.daysWorkedNew,
      totalDaysInMonth: proRataCalculation.totalDaysInMonth,
      oldStructureId: previousStructure._id,
      earnings: proRataEarnings,
      deductions: proRataDeductions,
      breakdown: proRataCalculation
    };
  } catch (error) {
    console.error('Error calculating pro-rata salary:', error);
    // Return empty pro-rata data on error
    return {
      isProRata: false,
      earnings: {},
      deductions: {}
    };
  }
};

// Helper function to calculate working days and attendance using enhanced calculator
const calculateAttendance = async (employeeId, month, year) => {
  try {
    // Initialize calculators
    const workingDaysCalc = new WorkingDaysCalculator();
    const leaveImpactCalc = new LeaveImpactCalculator();

    // Get employee for department info
    const employee = await User.findById(employeeId).populate("department");
    const departmentId = employee?.department?._id || null;

    // Calculate working days using enhanced calculator
    const workingDaysResult = await workingDaysCalc.getWorkingDays(month, year, departmentId);

    // Get salary structure for leave impact calculation
    const salaryStructure = await SalaryStructure.getActiveStructure(employeeId);
    if (!salaryStructure) {
      throw new Error("No active salary structure found for employee");
    }

    // Calculate leave impact
    const leaveImpactResult = await leaveImpactCalc.calculateLeaveDeduction(
      employeeId, 
      month, 
      year, 
      salaryStructure
    );

    // Use effectiveWorkingDays (days up to today/month-end) as the base for attendance display.
    // This prevents future unworked days from being counted as absent when generating mid-month.
    const effectiveWorkingDays = leaveImpactResult.effectiveWorkingDays ?? workingDaysResult.workingDays;

    // Calculate actual days worked (out of effective working days, minus unpaid absences)
    const daysWorked = effectiveWorkingDays - leaveImpactResult.unpaidLeaves;

    return {
      // Enhanced working days calculation
      workingDaysCalculation: {
        method: "dynamic",
        totalCalendarDays: workingDaysResult.totalDays,
        weekends: workingDaysResult.weekends,
        holidays: workingDaysResult.holidays,
        actualWorkingDays: workingDaysResult.workingDays,
        effectiveWorkingDays,
        isPartialMonth: leaveImpactResult.isPartialMonth || false,
        holidayDates: workingDaysResult.holidayDates || []
      },
      
      // Leave impact details
      leaveImpactDetails: {
        perDaySalary: leaveImpactResult.perDaySalary,
        leaveBreakdown: leaveImpactResult.leaveBreakdown,
        totalLeaveDeduction: leaveImpactResult.deductionAmount
      },
      
      // Legacy fields for backward compatibility
      totalWorkingDays: effectiveWorkingDays,  // Only count days up to effectiveEnd
      daysWorked: Math.max(0, daysWorked),
      daysAbsent: leaveImpactResult.unpaidLeaves,
      paidLeaves: leaveImpactResult.paidLeaves,
      unpaidLeaves: leaveImpactResult.unpaidLeaves,
      
      // Additional calculated values
      lossOfPayAmount: leaveImpactResult.deductionAmount
    };
  } catch (error) {
    
    
    // Fallback to legacy calculation
    
    return await calculateAttendanceLegacy(employeeId, month, year);
  }
};

// Legacy attendance calculation as fallback
const calculateAttendanceLegacy = async (employeeId, month, year) => {
  // Get attendance records for the month
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  
  // Default working days (legacy)
  const totalWorkingDays = 26;
  
  // Get leave records for the month
  const leaves = await LeaveRequest.find({
    employee: employeeId,
    status: "approved",
    $or: [
      {
        startDate: { $gte: startDate, $lte: endDate }
      },
      {
        endDate: { $gte: startDate, $lte: endDate }
      },
      {
        startDate: { $lte: startDate },
        endDate: { $gte: endDate }
      }
    ]
  });
  
  let paidLeaves = 0;
  let unpaidLeaves = 0;
  
  leaves.forEach(leave => {
    if (leave.leaveType === "unpaid") {
      unpaidLeaves += leave.numberOfDays;
    } else if (leave.leaveType !== "work_from_home") {
      // Count paid leaves (excluding WFH which doesn't affect salary)
      paidLeaves += leave.numberOfDays;
    }
  });
  
  const daysWorked = totalWorkingDays - unpaidLeaves;
  const daysAbsent = unpaidLeaves;
  
  return {
    // Legacy format
    totalWorkingDays,
    daysWorked,
    daysAbsent,
    paidLeaves,
    unpaidLeaves,
    lossOfPayAmount: 0, // Will be calculated later
    
    // Enhanced fields with default values
    workingDaysCalculation: {
      method: "fixed",
      totalCalendarDays: new Date(year, month, 0).getDate(),
      weekends: 4,
      holidays: 0,
      actualWorkingDays: totalWorkingDays,
      holidayDates: []
    },
    
    leaveImpactDetails: {
      perDaySalary: 0, // Will be calculated later
      leaveBreakdown: [],
      totalLeaveDeduction: 0
    }
  };
};

// Generate salary slip for an employee
export const generateSalarySlip = async (req, res) => {
  try {
    const {
      employeeId,
      month,
      year,
      bonus = 0,
      overtime = 0,
      arrears = 0,
      reimbursements = 0,
      incentives = 0,
      advances = 0,
      loans = 0,
      paymentDate,
      notes
    } = req.body;

    // Validate inputs
    if (!employeeId || !month || !year) {
      return res.status(400).json({
        message: "Employee ID, month, and year are required"
      });
    }

    if (month < 1 || month > 12) {
      return res.status(400).json({ message: "Invalid month" });
    }

    await assertPeriodAllows("generate", year, month);

    // Check if slip already exists
    const existingSlip = await SalarySlip.findOne({
      employee: employeeId,
      month,
      year
    });

    if (existingSlip) {
      return res.status(400).json({
        message: "Salary slip already exists for this month"
      });
    }

    // Get active salary structure
    const salaryStructure = await SalaryStructure.getActiveStructure(employeeId);
    if (!salaryStructure) {
      return res.status(404).json({
        message: "No active salary structure found for this employee"
      });
    }

    // Check for mid-month salary changes (pro-rata calculation)
    const proRataData = await checkAndCalculateProRata(employeeId, month, year, salaryStructure);

    // Calculate attendance using enhanced calculator
    const attendance = await calculateAttendance(employeeId, month, year);

    // Calculate Loss of Pay using enhanced calculation
    const lossOfPay = attendance.lossOfPayAmount || attendance.leaveImpactDetails.totalLeaveDeduction;

    // Prepare earnings (use pro-rata values if applicable)
    const earnings = {
      basicSalary: proRataData.earnings.basicSalary || salaryStructure.basicSalary,
      hra: proRataData.earnings.hra || salaryStructure.hra,
      specialAllowance: proRataData.earnings.specialAllowance || salaryStructure.specialAllowance,
      transportAllowance: proRataData.earnings.transportAllowance || salaryStructure.transportAllowance,
      medicalAllowance: proRataData.earnings.medicalAllowance || salaryStructure.medicalAllowance,
      otherAllowances: salaryStructure.otherAllowances || [],
      bonus: bonus || 0,
      overtime: overtime || 0,
      arrears: arrears || 0,
      reimbursements: reimbursements || 0,
      incentives: incentives || 0
    };

    // Prepare deductions (use pro-rata values if applicable)
    // R1: single attendance money path — LeaveImpactCalculator already prices unpaid
    // leave + absences into lossOfPay. Do NOT add unpaidLeaveDeduction (legacy double count).
    const attendanceMoney = resolveAttendanceMoneyDeductions(lossOfPay);
    const deductions = {
      providentFund: proRataData.deductions.providentFund || salaryStructure.providentFund,
      professionalTax: proRataData.deductions.professionalTax || salaryStructure.professionalTax,
      tds: proRataData.deductions.tds || salaryStructure.tds,
      esi: proRataData.deductions.esi || salaryStructure.esi,
      lossOfPay: attendanceMoney.lossOfPay,
      unpaidLeaveDeduction: attendanceMoney.unpaidLeaveDeduction,
      advances: advances || 0,
      loans: loans || 0,
      otherDeductions: salaryStructure.otherDeductions || []
    };

    // Milestone 4: dual-run V1 vs V2 engine (log only — slip still persists V1 amounts)
    try {
      const dual = dualRunPayroll(salaryStructure, {
        bonus,
        overtime,
        arrears,
        reimbursements,
        incentives,
        advances,
        loans,
        lossOfPay: attendanceMoney.lossOfPay,
        lopDays: attendance.unpaidLeaves,
      });
      if (!dual.diff.withinTolerance) {
        console.warn(
          `[payroll-dual-run] mismatch employee=${employeeId} ${month}/${year} netDiff=${dual.diff.netSalary}`,
          dual.diff
        );
      } else {
        console.info(
          `[payroll-dual-run] match employee=${employeeId} ${month}/${year} net=${dual.v1.totals.netSalary}`
        );
      }
    } catch (dualRunError) {
      console.error("[payroll-dual-run] failed:", dualRunError.message);
    }

    // Calculate YTD
    const ytd = await SalarySlip.calculateYTD(employeeId, year, month - 1);

    // Create salary slip with enhanced fields
    const salarySlip = await SalarySlip.create({
      employee: employeeId,
      salaryStructure: salaryStructure._id,
      month,
      year,
      payPeriod: `${getMonthName(month)} ${year}`,
      paymentDate: paymentDate || new Date(year, month, 1),
      
      // Legacy fields for backward compatibility
      totalWorkingDays: attendance.totalWorkingDays,
      daysWorked: attendance.daysWorked,
      daysAbsent: attendance.daysAbsent,
      paidLeaves: attendance.paidLeaves,
      unpaidLeaves: attendance.unpaidLeaves,
      
      // Enhanced fields
      workingDaysCalculation: attendance.workingDaysCalculation,
      leaveImpactDetails: attendance.leaveImpactDetails,
      
      // Pro-rata information
      isProRata: proRataData.isProRata,
      proRataDetails: proRataData.isProRata ? {
        effectiveDate: proRataData.effectiveDate,
        daysWorkedOld: proRataData.daysWorkedOld,
        daysWorkedNew: proRataData.daysWorkedNew,
        totalDaysInMonth: proRataData.totalDaysInMonth,
        oldSalaryStructure: proRataData.oldStructureId,
        breakdown: proRataData.breakdown
      } : null,
      
      earnings,
      deductions,
      ytd,
      status: "generated",
      approvedBy: req.user.id,
      approvedAt: new Date(),
      notes
    });

    await salarySlip.populate("employee", "name email employeeId designation department");
    await salarySlip.populate("salaryStructure");

    // Send notification to employee (never block generate)
    try {
      await notificationService.sendSalarySlipNotification(
        employeeId,
        month,
        year,
        { slipId: salarySlip._id?.toString?.() || salarySlip._id, senderId: req.user?.id }
      );
    } catch (notificationError) {
      console.error("[salarySlip] sendSalarySlipNotification failed (non-blocking)", {
        employeeId,
        month,
        year,
        error: notificationError?.message || notificationError,
      });
    }

    res.status(201).json({
      message: "Salary slip generated successfully",
      salarySlip,
      proRataApplied: proRataData.isProRata
    });
  } catch (error) {
    if (sendPeriodGateError(res, error)) return;
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};

// Bulk generate salary slips for all employees
export const bulkGenerateSalarySlips = async (req, res) => {
  try {
    const { month, year, paymentDate } = req.body;

    if (!month || !year) {
      return res.status(400).json({
        message: "Month and year are required"
      });
    }

    await assertPeriodAllows("generate", year, month);

    // Get all active employees
    const employees = await User.find({ 
      status: "active",
      role: { $in: ["employee", "hod", "hr", "accounts"] }
    });

    const results = {
      success: [],
      failed: [],
      skipped: []
    };

    for (const employee of employees) {
      try {
        // Check if slip already exists
        const existingSlip = await SalarySlip.findOne({
          employee: employee._id,
          month,
          year
        });

        if (existingSlip) {
          results.skipped.push({
            employeeId: employee.employeeId,
            name: employee.name,
            reason: "Slip already exists"
          });
          continue;
        }

        // Get active salary structure
        const salaryStructure = await SalaryStructure.getActiveStructure(employee._id);
        if (!salaryStructure) {
          results.failed.push({
            employeeId: employee.employeeId,
            name: employee.name,
            reason: "No active salary structure"
          });
          continue;
        }

        // Calculate attendance using enhanced calculator
        const attendance = await calculateAttendance(employee._id, month, year);

        // R1: single LOP path (LeaveImpact only)
        const lossOfPay = attendance.lossOfPayAmount || attendance.leaveImpactDetails.totalLeaveDeduction;
        const attendanceMoney = resolveAttendanceMoneyDeductions(lossOfPay);

        // Prepare earnings and deductions
        const earnings = {
          basicSalary: salaryStructure.basicSalary,
          hra: salaryStructure.hra,
          specialAllowance: salaryStructure.specialAllowance,
          transportAllowance: salaryStructure.transportAllowance,
          medicalAllowance: salaryStructure.medicalAllowance,
          otherAllowances: salaryStructure.otherAllowances || [],
          bonus: 0,
          overtime: 0,
          arrears: 0,
          reimbursements: 0,
          incentives: 0
        };

        const deductions = {
          providentFund: salaryStructure.providentFund,
          professionalTax: salaryStructure.professionalTax,
          tds: salaryStructure.tds,
          esi: salaryStructure.esi,
          lossOfPay: attendanceMoney.lossOfPay,
          unpaidLeaveDeduction: attendanceMoney.unpaidLeaveDeduction,
          advances: 0,
          loans: 0,
          otherDeductions: salaryStructure.otherDeductions || []
        };

        // Calculate YTD
        const ytd = await SalarySlip.calculateYTD(employee._id, year, month - 1);

        // Create salary slip with enhanced fields
        const salarySlip = await SalarySlip.create({
          employee: employee._id,
          salaryStructure: salaryStructure._id,
          month,
          year,
          payPeriod: `${getMonthName(month)} ${year}`,
          paymentDate: paymentDate || new Date(year, month, 1),
          
          // Legacy fields
          totalWorkingDays: attendance.totalWorkingDays,
          daysWorked: attendance.daysWorked,
          daysAbsent: attendance.daysAbsent,
          paidLeaves: attendance.paidLeaves,
          unpaidLeaves: attendance.unpaidLeaves,
          
          // Enhanced fields
          workingDaysCalculation: attendance.workingDaysCalculation,
          leaveImpactDetails: attendance.leaveImpactDetails,
          
          earnings,
          deductions,
          ytd,
          status: "generated",
          approvedBy: req.user.id,
          approvedAt: new Date()
        });

        results.success.push({
          employeeId: employee.employeeId,
          name: employee.name,
          slipId: salarySlip._id
        });

        try {
          await notificationService.sendSalarySlipNotification(
            employee._id,
            month,
            year,
            {
              slipId: salarySlip._id?.toString?.() || salarySlip._id,
              senderId: req.user?.id,
            }
          );
        } catch (notificationError) {
          console.error("[salarySlip] bulk sendSalarySlipNotification failed (non-blocking)", {
            employeeId: employee._id,
            month,
            year,
            error: notificationError?.message || notificationError,
          });
        }
      } catch (error) {
        results.failed.push({
          employeeId: employee.employeeId,
          name: employee.name,
          reason: error.message
        });
      }
    }

    res.status(200).json({
      message: "Bulk generation completed",
      summary: {
        total: employees.length,
        success: results.success.length,
        failed: results.failed.length,
        skipped: results.skipped.length
      },
      results
    });
  } catch (error) {
    if (sendPeriodGateError(res, error)) return;
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};

// Get all salary slips (HR/Admin)
export const getAllSalarySlips = async (req, res) => {
  try {
    const { month, year, status, employee, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (month) filter.month = parseInt(month);
    if (year) filter.year = parseInt(year);
    if (status) filter.status = status;
    if (employee) filter.employee = employee;

    const skip = (page - 1) * limit;

    const slips = await SalarySlip.find(filter)
      .populate("employee", "name email employeeId designation department")
      .populate("approvedBy", "name email")
      .sort({ year: -1, month: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await SalarySlip.countDocuments(filter);

    res.status(200).json({
      slips,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};

// Get salary slips for a specific employee (HR/Admin)
export const getEmployeeSalarySlips = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { year, limit = 10, page = 1 } = req.query;

    // Validate employee exists
    const employee = await User.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const filter = { employee: employeeId };
    if (year) filter.year = parseInt(year);

    const skip = (page - 1) * limit;

    const slips = await SalarySlip.find(filter)
      .populate("employee", "name email employeeId designation department")
      .populate("approvedBy", "name email")
      .sort({ year: -1, month: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await SalarySlip.countDocuments(filter);

    res.status(200).json({
      slips,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};

// Get employee's own salary slips
export const getMySalarySlips = async (req, res) => {
  try {
    const employeeId = req.user.id;
    const { year } = req.query;

    const slips = await SalarySlip.getEmployeeSlips(employeeId, year ? parseInt(year) : null);

    res.status(200).json(slips);
  } catch (error) {
    
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};

// Get salary slip by ID
export const getSalarySlipById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const slip = await SalarySlip.findById(id)
      .populate("employee", "name email employeeId designation department")
      .populate("salaryStructure")
      .populate("approvedBy", "name email");

    if (!slip) {
      return res.status(404).json({ message: "Salary slip not found" });
    }

    // Check permissions - employee can only view their own slips
    const isOwner = slip.employee._id.toString() === userId;
    const isAdmin = ["admin", "superadmin", "hr", "accounts"].includes(userRole);

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Update viewed status if employee is viewing
    if (isOwner && !slip.viewedAt) {
      slip.viewedAt = new Date();
      if (slip.status === "sent") {
        slip.status = "viewed";
      }
      await slip.save();
    }

    res.status(200).json(slip);
  } catch (error) {
    
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};

// Update salary slip
export const updateSalarySlip = async (req, res) => {
  try {
    const { id } = req.params;

    const slip = await SalarySlip.findById(id);
    if (!slip) {
      return res.status(404).json({ message: "Salary slip not found" });
    }

    // Only allow updating draft or generated slips
    if (!["draft", "generated"].includes(slip.status)) {
      return res.status(400).json({
        message: "Cannot update slips that have been sent or paid"
      });
    }

    // Update allowed fields
    const allowedUpdates = [
      "bonus", "overtime", "arrears", "reimbursements", "incentives",
      "advances", "loans", "paymentDate", "notes"
    ];

    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        if (["bonus", "overtime", "arrears", "reimbursements", "incentives"].includes(key)) {
          slip.earnings[key] = req.body[key];
        } else if (["advances", "loans"].includes(key)) {
          slip.deductions[key] = req.body[key];
        } else {
          slip[key] = req.body[key];
        }
      }
    });

    await slip.save();
    await slip.populate("employee", "name email employeeId designation department");

    res.status(200).json({
      message: "Salary slip updated successfully",
      salarySlip: slip
    });
  } catch (error) {
    
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};

// Delete salary slip
export const deleteSalarySlip = async (req, res) => {
  try {
    const { id } = req.params;

    const slip = await SalarySlip.findById(id);
    if (!slip) {
      return res.status(404).json({ message: "Salary slip not found" });
    }

    // Only allow deleting draft slips
    if (slip.status !== "draft") {
      return res.status(400).json({
        message: "Cannot delete generated or paid salary slips"
      });
    }

    await SalarySlip.findByIdAndDelete(id);

    res.status(200).json({
      message: "Salary slip deleted successfully"
    });
  } catch (error) {
    
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};

// Mark slip as paid
export const markAsPaid = async (req, res) => {
  try {
    const { id } = req.params;

    const slip = await SalarySlip.findById(id);
    if (!slip) {
      return res.status(404).json({ message: "Salary slip not found" });
    }

    await assertPeriodAllows("markPaid", slip.year, slip.month);

    slip.status = "paid";
    await slip.save();

    res.status(200).json({
      message: "Salary slip marked as paid",
      salarySlip: slip
    });
  } catch (error) {
    if (sendPeriodGateError(res, error)) return;
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};

// Track download
export const trackDownload = async (req, res) => {
  try {
    const { id } = req.params;

    const slip = await SalarySlip.findById(id);
    if (!slip) {
      return res.status(404).json({ message: "Salary slip not found" });
    }

    slip.downloadedAt = new Date();
    slip.downloadCount = (slip.downloadCount || 0) + 1;
    if (slip.status === "viewed" || slip.status === "sent") {
      slip.status = "downloaded";
    }
    await slip.save();

    res.status(200).json({
      message: "Download tracked successfully"
    });
  } catch (error) {
    
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};

// Get payroll summary for a month
export const getPayrollSummary = async (req, res) => {
  try {
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({
        message: "Month and year are required"
      });
    }

    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);

    // Seed all departments (same source as organization Department list).
    // Do not require status:"active" only — match getDepartments() behavior.
    const allDepartments = await Department.find()
      .select("name status")
      .sort({ name: 1 })
      .lean();

    const byDepartment = {};
    for (const dept of allDepartments) {
      if (!dept?.name) continue;
      // Prefer active; still include inactive so payroll history rows are visible
      byDepartment[dept.name] = { count: 0, totalNetSalary: 0 };
    }

    // Aggregate slips; keep slips even if employee/department lookup is missing
    const slipsWithDepartments = await SalarySlip.aggregate([
      {
        $match: {
          month: monthNum,
          year: yearNum,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "employee",
          foreignField: "_id",
          as: "employeeData",
        },
      },
      {
        $unwind: {
          path: "$employeeData",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "departments",
          localField: "employeeData.department",
          foreignField: "_id",
          as: "departmentData",
        },
      },
      {
        $addFields: {
          departmentName: {
            $cond: {
              if: { $gt: [{ $size: "$departmentData" }, 0] },
              then: { $arrayElemAt: ["$departmentData.name", 0] },
              else: "Unassigned",
            },
          },
        },
      },
      {
        $project: {
          totalEarnings: 1,
          totalDeductions: 1,
          netSalary: 1,
          status: 1,
          departmentName: 1,
        },
      },
    ]);

    const summary = {
      totalEmployees: slipsWithDepartments.length,
      totalGrossSalary: 0,
      totalDeductions: 0,
      totalNetSalary: 0,
      byDepartment,
      byStatus: {
        draft: 0,
        generated: 0,
        sent: 0,
        viewed: 0,
        downloaded: 0,
        paid: 0,
        approved: 0,
      },
    };

    slipsWithDepartments.forEach((slip) => {
      const earnings = slip.totalEarnings || 0;
      const deductions = slip.totalDeductions || 0;
      const netSalary = slip.netSalary || 0;

      summary.totalGrossSalary += earnings;
      summary.totalDeductions += deductions;
      summary.totalNetSalary += netSalary;

      const status = slip.status || "draft";
      if (Object.prototype.hasOwnProperty.call(summary.byStatus, status)) {
        summary.byStatus[status]++;
      } else {
        summary.byStatus[status] = 1;
      }

      const deptName = slip.departmentName || "Unassigned";
      if (!summary.byDepartment[deptName]) {
        summary.byDepartment[deptName] = {
          count: 0,
          totalNetSalary: 0,
        };
      }
      summary.byDepartment[deptName].count++;
      summary.byDepartment[deptName].totalNetSalary += netSalary;
    });

    res.status(200).json(summary);
  } catch (error) {
    console.error("getPayrollSummary error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Generate and download PDF
export const downloadSalarySlipPDF = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const slip = await SalarySlip.findById(id)
      .populate({
        path: "employee",
        select: "name email employeeId designation department bankDetails",
        populate: {
          path: "department",
          select: "name"
        }
      })
      .populate("salaryStructure");

    // Manually populate the accountNumber field since it has select: false
    if (slip && slip.employee) {
      const employeeWithBank = await User.findById(slip.employee._id).select("+bankDetails.accountNumber");
      if (employeeWithBank && employeeWithBank.bankDetails) {
        slip.employee.bankDetails = employeeWithBank.bankDetails;
      }
    }

    if (!slip) {
      return res.status(404).json({ message: "Salary slip not found" });
    }

    // Check permissions
    const isOwner = slip.employee._id.toString() === userId;
    const isAdmin = ["admin", "superadmin", "hr", "accounts"].includes(userRole);

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Import PDF + storage helpers
    const { generateAndStorePayslipPdf } = await import(
      "../services/payroll/payslipStorage.js"
    );

    const { localPath } = await generateAndStorePayslipPdf(slip, {
      generatedBy: userId,
      version: (slip.pdfStorage?.version || 0) + 1,
    });

    // Update slip with PDF URL, storage metadata, and download tracking
    slip.downloadedAt = new Date();
    slip.downloadCount = (slip.downloadCount || 0) + 1;
    
    if (slip.status === "generated" || slip.status === "sent" || slip.status === "viewed") {
      slip.status = "downloaded";
    }
    
    await slip.save();

    // Check if file exists
    if (!fs.existsSync(localPath)) {
      return res.status(500).json({ message: "PDF generation failed" });
    }

    const filename = path.basename(localPath);

    // Set proper headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    // Send the file
    const fileStream = fs.createReadStream(localPath);
    fileStream.pipe(res);
    
    fileStream.on('error', (error) => {
      
      if (!res.headersSent) {
        res.status(500).json({ message: "Error reading PDF file" });
      }
    });

  } catch (error) {
    
    if (!res.headersSent) {
      res.status(500).json({
        message: "Server error",
        error: error.message
      });
    }
  }
};

// Send salary slip email
export const sendSalarySlipEmail = async (req, res) => {
  try {
    const { id } = req.params;

    const slip = await SalarySlip.findById(id)
      .populate({
        path: "employee",
        select: "name email employeeId designation department bankDetails",
        populate: {
          path: "department",
          select: "name"
        }
      })
      .populate("salaryStructure");

    // Manually populate the accountNumber field since it has select: false
    if (slip && slip.employee) {
      const employeeWithBank = await User.findById(slip.employee._id).select("+bankDetails.accountNumber");
      if (employeeWithBank && employeeWithBank.bankDetails) {
        slip.employee.bankDetails = employeeWithBank.bankDetails;
      }
    }

    if (!slip) {
      return res.status(404).json({ message: "Salary slip not found" });
    }

    // Ensure a local PDF exists for email attachment (S3 preferred for pdfUrl)
    const { ensurePayslipLocalPdf } = await import(
      "../services/payroll/payslipStorage.js"
    );
    const pdfPath = await ensurePayslipLocalPdf(slip, {
      generatedBy: req.user?.id || null,
      version: (slip.pdfStorage?.version || 0) + 1,
    });
    await slip.save();

    // Send email
    const { sendSalarySlipEmail: sendEmail } = await import("../services/salarySlipEmailService.js");
    await sendEmail(slip, pdfPath);

    // Update slip status
    slip.emailSent = true;
    slip.emailSentAt = new Date();
    if (slip.status === "generated") {
      slip.status = "sent";
    }
    await slip.save();

    res.status(200).json({
      message: "Salary slip email sent successfully",
      salarySlip: slip
    });
  } catch (error) {
    
    res.status(500).json({
      message: "Failed to send email",
      error: error.message
    });
  }
};

// Send bulk emails
export const sendBulkSalarySlipEmails = async (req, res) => {
  try {
    const { month, year } = req.body;

    if (!month || !year) {
      return res.status(400).json({
        message: "Month and year are required"
      });
    }

    const slips = await SalarySlip.find({
      month: parseInt(month),
      year: parseInt(year),
      status: { $in: ["generated", "sent", "viewed", "downloaded"] }
    })
      .populate({
        path: "employee",
        select: "name email employeeId designation department bankDetails",
        populate: {
          path: "department",
          select: "name"
        }
      })
      .populate("salaryStructure");

    // Manually populate the accountNumber field for each slip
    for (const slip of slips) {
      if (slip.employee) {
        const employeeWithBank = await User.findById(slip.employee._id).select("+bankDetails.accountNumber");
        if (employeeWithBank && employeeWithBank.bankDetails) {
          slip.employee.bankDetails = employeeWithBank.bankDetails;
        }
      }
    }

    if (slips.length === 0) {
      return res.status(404).json({
        message: "No salary slips found for the specified month"
      });
    }

    // Generate / store PDFs for slips that don't have them
    const { generateAndStorePayslipPdf, ensurePayslipLocalPdf } = await import(
      "../services/payroll/payslipStorage.js"
    );

    for (const slip of slips) {
      if (!slip.pdfUrl) {
        await generateAndStorePayslipPdf(slip, {
          generatedBy: req.user?.id || null,
          version: 1,
        });
        await slip.save();
      } else {
        // Ensure local file for email attachment even when pdfUrl is S3
        await ensurePayslipLocalPdf(slip, {
          generatedBy: req.user?.id || null,
        });
        if (slip.isModified?.()) {
          await slip.save();
        }
      }
    }

    // Send bulk emails
    const { sendBulkSalarySlipEmails: sendBulkEmails } = await import("../services/salarySlipEmailService.js");
    const results = await sendBulkEmails(slips);

    // Update status for successfully sent emails
    for (const success of results.success) {
      const slip = slips.find(s => s.employee.employeeId === success.employeeId);
      if (slip) {
        slip.emailSent = true;
        slip.emailSentAt = new Date();
        if (slip.status === "generated") {
          slip.status = "sent";
        }
        await slip.save();
      }
    }

    res.status(200).json({
      message: "Bulk email sending completed",
      summary: {
        total: slips.length,
        success: results.success.length,
        failed: results.failed.length
      },
      results
    });
  } catch (error) {
    
    res.status(500).json({
      message: "Failed to send bulk emails",
      error: error.message
    });
  }
};

// GET /salary-slips/stats/overview — total counts for dashboard
export const getOverallStats = async (req, res) => {
  try {
    const SalaryStructure = (await import("../models/salaryStructureModel.js")).default;
    const SalaryStructureTemplate = (await import("../models/salaryStructureTemplateModel.js")).default;

    const [totalSlips, totalStructures, totalTemplates] = await Promise.all([
      SalarySlip.countDocuments(),
      SalaryStructure.countDocuments(),
      SalaryStructureTemplate.countDocuments(),
    ]);

    res.json({ totalSlips, totalStructures, totalTemplates });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * Recalculate an existing salary slip's attendance/leave data.
 * Useful for fixing slips that were generated mid-month (before the month ended)
 * and now show inflated unpaid leave counts.
 * PUT /salary-slips/:id/recalculate
 */
export const recalculateSalarySlip = async (req, res) => {
  try {
    const { id } = req.params;

    const slip = await SalarySlip.findById(id).populate("salaryStructure");
    if (!slip) {
      return res.status(404).json({ message: "Salary slip not found" });
    }

    if (!["draft", "generated"].includes(slip.status)) {
      return res.status(400).json({
        message: "Cannot recalculate slips that have been sent or paid"
      });
    }

    await assertPeriodAllows("generate", slip.year, slip.month);

    const salaryStructure = slip.salaryStructure;
    if (!salaryStructure) {
      return res.status(404).json({ message: "Salary structure not found for this slip" });
    }

    // Recalculate attendance using the fixed logic
    const attendance = await calculateAttendance(slip.employee, slip.month, slip.year);
    const lossOfPay = attendance.lossOfPayAmount || attendance.leaveImpactDetails.totalLeaveDeduction;
    const attendanceMoney = resolveAttendanceMoneyDeductions(lossOfPay);

    // Update attendance fields
    slip.totalWorkingDays = attendance.totalWorkingDays;
    slip.daysWorked = attendance.daysWorked;
    slip.daysAbsent = attendance.daysAbsent;
    slip.paidLeaves = attendance.paidLeaves;
    slip.unpaidLeaves = attendance.unpaidLeaves;
    slip.workingDaysCalculation = attendance.workingDaysCalculation;
    slip.leaveImpactDetails = attendance.leaveImpactDetails;

    // R1: single LOP path; clear legacy double-count field
    slip.deductions.lossOfPay = attendanceMoney.lossOfPay;
    slip.deductions.unpaidLeaveDeduction = attendanceMoney.unpaidLeaveDeduction;

    await slip.save();
    await slip.populate("employee", "name email employeeId designation department");

    res.status(200).json({
      message: "Salary slip recalculated successfully",
      salarySlip: slip,
      changes: {
        totalWorkingDays: slip.totalWorkingDays,
        daysWorked: slip.daysWorked,
        unpaidLeaves: slip.unpaidLeaves,
        lossOfPay: slip.deductions.lossOfPay,
        netSalary: slip.netSalary
      }
    });
  } catch (error) {
    if (sendPeriodGateError(res, error)) return;
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};

/**
 * Bulk recalculate salary slips for a given month/year.
 * Fixes all slips that were generated mid-month.
 * POST /salary-slips/bulk-recalculate
 */
export const bulkRecalculateSalarySlips = async (req, res) => {
  try {
    const { month, year } = req.body;

    if (!month || !year) {
      return res.status(400).json({ message: "Month and year are required" });
    }

    await assertPeriodAllows("generate", year, month);

    const slips = await SalarySlip.find({
      month,
      year,
      status: { $in: ["draft", "generated"] }
    }).populate("salaryStructure");

    const results = { success: [], failed: [], skipped: [] };

    for (const slip of slips) {
      try {
        if (!slip.salaryStructure) {
          results.skipped.push({ slipId: slip._id, reason: "No salary structure" });
          continue;
        }

        const attendance = await calculateAttendance(slip.employee, slip.month, slip.year);
        const lossOfPay = attendance.lossOfPayAmount || attendance.leaveImpactDetails.totalLeaveDeduction;
        const attendanceMoney = resolveAttendanceMoneyDeductions(lossOfPay);

        const oldUnpaid = slip.unpaidLeaves;
        const oldNet = slip.netSalary;

        slip.totalWorkingDays = attendance.totalWorkingDays;
        slip.daysWorked = attendance.daysWorked;
        slip.daysAbsent = attendance.daysAbsent;
        slip.paidLeaves = attendance.paidLeaves;
        slip.unpaidLeaves = attendance.unpaidLeaves;
        slip.workingDaysCalculation = attendance.workingDaysCalculation;
        slip.leaveImpactDetails = attendance.leaveImpactDetails;
        slip.deductions.lossOfPay = attendanceMoney.lossOfPay;
        slip.deductions.unpaidLeaveDeduction = attendanceMoney.unpaidLeaveDeduction;

        await slip.save();

        results.success.push({
          slipId: slip._id,
          employee: slip.employee,
          unpaidLeavesBefore: oldUnpaid,
          unpaidLeavesAfter: slip.unpaidLeaves,
          netSalaryBefore: oldNet,
          netSalaryAfter: slip.netSalary
        });
      } catch (err) {
        results.failed.push({ slipId: slip._id, error: err.message });
      }
    }

    res.status(200).json({
      message: `Recalculated ${results.success.length} salary slips`,
      summary: {
        total: slips.length,
        success: results.success.length,
        failed: results.failed.length,
        skipped: results.skipped.length
      },
      results
    });
  } catch (error) {
    if (sendPeriodGateError(res, error)) return;
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};
