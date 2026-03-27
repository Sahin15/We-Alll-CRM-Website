import SalarySlip from "../models/salarySlipModel.js";
import SalaryStructure from "../models/salaryStructureModel.js";
import User from "../models/userModel.js";
import LeaveRequest from "../models/leaveRequestModel.js";
import WorkingDaysCalculator from "../services/workingDaysCalculator.js";
import LeaveImpactCalculator from "../services/leaveImpactCalculator.js";
import notificationService from "../services/notificationService.js";
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

    // Calculate actual days worked
    const daysWorked = workingDaysResult.workingDays - leaveImpactResult.unpaidLeaves;

    return {
      // Enhanced working days calculation
      workingDaysCalculation: {
        method: "dynamic",
        totalCalendarDays: workingDaysResult.totalDays,
        weekends: workingDaysResult.weekends,
        holidays: workingDaysResult.holidays,
        actualWorkingDays: workingDaysResult.workingDays,
        holidayDates: workingDaysResult.holidayDates || []
      },
      
      // Leave impact details
      leaveImpactDetails: {
        perDaySalary: leaveImpactResult.perDaySalary,
        leaveBreakdown: leaveImpactResult.leaveBreakdown,
        totalLeaveDeduction: leaveImpactResult.deductionAmount
      },
      
      // Legacy fields for backward compatibility
      totalWorkingDays: workingDaysResult.workingDays,
      daysWorked: Math.max(0, daysWorked),
      daysAbsent: leaveImpactResult.unpaidLeaves,
      paidLeaves: leaveImpactResult.paidLeaves,
      unpaidLeaves: leaveImpactResult.unpaidLeaves,
      
      // Additional calculated values
      lossOfPayAmount: leaveImpactResult.deductionAmount
    };
  } catch (error) {
    console.error("Error in enhanced attendance calculation:", error);
    
    // Fallback to legacy calculation
    console.warn("Falling back to legacy attendance calculation");
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

    // Calculate attendance using enhanced calculator
    const attendance = await calculateAttendance(employeeId, month, year);

    // Calculate Loss of Pay using enhanced calculation
    const lossOfPay = attendance.lossOfPayAmount || attendance.leaveImpactDetails.totalLeaveDeduction;

    // Prepare earnings (copy from salary structure)
    const earnings = {
      basicSalary: salaryStructure.basicSalary,
      hra: salaryStructure.hra,
      specialAllowance: salaryStructure.specialAllowance,
      transportAllowance: salaryStructure.transportAllowance,
      medicalAllowance: salaryStructure.medicalAllowance,
      otherAllowances: salaryStructure.otherAllowances || [],
      bonus: bonus || 0,
      overtime: overtime || 0,
      arrears: arrears || 0,
      reimbursements: reimbursements || 0,
      incentives: incentives || 0
    };

    // Prepare deductions (copy from salary structure + additional)
    const deductions = {
      providentFund: salaryStructure.providentFund,
      professionalTax: salaryStructure.professionalTax,
      tds: salaryStructure.tds,
      esi: salaryStructure.esi,
      lossOfPay: Math.round(lossOfPay),
      advances: advances || 0,
      loans: loans || 0,
      otherDeductions: salaryStructure.otherDeductions || []
    };

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

    // Send notification to employee
    try {
      await notificationService.sendSalarySlipNotification(
        employeeId,
        month,
        year
      );
      console.log("✅ Salary slip notification sent to employee");
    } catch (notificationError) {
      console.error("⚠️ Error sending salary slip notification:", notificationError);
    }

    res.status(201).json({
      message: "Salary slip generated successfully",
      salarySlip
    });
  } catch (error) {
    console.error("Error generating salary slip:", error);
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

        // Calculate LOP using enhanced calculation
        const lossOfPay = attendance.lossOfPayAmount || attendance.leaveImpactDetails.totalLeaveDeduction;

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
          lossOfPay: Math.round(lossOfPay),
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
    console.error("Error in bulk generation:", error);
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
    console.error("Error fetching salary slips:", error);
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
    console.error("Error fetching employee salary slips:", error);
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
    console.error("Error fetching my salary slips:", error);
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
    console.error("Error fetching salary slip:", error);
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
    console.error("Error updating salary slip:", error);
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
    console.error("Error deleting salary slip:", error);
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

    slip.status = "paid";
    await slip.save();

    res.status(200).json({
      message: "Salary slip marked as paid",
      salarySlip: slip
    });
  } catch (error) {
    console.error("Error marking slip as paid:", error);
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
    console.error("Error tracking download:", error);
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

    // Use aggregation to properly join and get department names
    const slipsWithDepartments = await SalarySlip.aggregate([
      {
        $match: {
          month: parseInt(month),
          year: parseInt(year)
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "employee",
          foreignField: "_id",
          as: "employeeData"
        }
      },
      {
        $unwind: "$employeeData"
      },
      {
        $lookup: {
          from: "departments",
          localField: "employeeData.department",
          foreignField: "_id",
          as: "departmentData"
        }
      },
      {
        $addFields: {
          departmentName: {
            $cond: {
              if: { $gt: [{ $size: "$departmentData" }, 0] },
              then: { $arrayElemAt: ["$departmentData.name", 0] },
              else: "Unassigned"
            }
          }
        }
      },
      {
        $project: {
          totalEarnings: 1,
          totalDeductions: 1,
          netSalary: 1,
          status: 1,
          departmentName: 1,
          "employeeData.name": 1
        }
      }
    ]);

    console.log(`Found ${slipsWithDepartments.length} salary slips for ${month}/${year}`);
    console.log("Sample slip:", slipsWithDepartments[0]);

    const summary = {
      totalEmployees: slipsWithDepartments.length,
      totalGrossSalary: 0,
      totalDeductions: 0,
      totalNetSalary: 0,
      byDepartment: {},
      byStatus: {
        draft: 0,
        generated: 0,
        sent: 0,
        viewed: 0,
        downloaded: 0,
        paid: 0
      }
    };

    slipsWithDepartments.forEach(slip => {
      // Make sure we're adding numbers, not undefined values
      const earnings = slip.totalEarnings || 0;
      const deductions = slip.totalDeductions || 0;
      const netSalary = slip.netSalary || 0;
      
      summary.totalGrossSalary += earnings;
      summary.totalDeductions += deductions;
      summary.totalNetSalary += netSalary;
      
      // Handle status counting
      const status = slip.status || 'draft';
      if (summary.byStatus.hasOwnProperty(status)) {
        summary.byStatus[status]++;
      } else {
        summary.byStatus[status] = 1;
      }

      const deptName = slip.departmentName || "Unassigned";
      
      if (!summary.byDepartment[deptName]) {
        summary.byDepartment[deptName] = {
          count: 0,
          totalNetSalary: 0
        };
      }
      summary.byDepartment[deptName].count++;
      summary.byDepartment[deptName].totalNetSalary += netSalary;
    });

    console.log("Final summary:", {
      totalEmployees: summary.totalEmployees,
      totalGrossSalary: summary.totalGrossSalary,
      totalDeductions: summary.totalDeductions,
      totalNetSalary: summary.totalNetSalary,
      departmentCount: Object.keys(summary.byDepartment).length
    });

    res.status(200).json(summary);
  } catch (error) {
    console.error("Error fetching payroll summary:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message
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

    // Import PDF generator
    const { generateSalarySlipPDF } = await import("../utils/salarySlipPdfGenerator.js");

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), "uploads", "salary-slips");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Generate PDF filename
    const filename = `salary-slip-${slip.employee.employeeId}-${slip.month}-${slip.year}.pdf`;
    const filepath = path.join(uploadsDir, filename);

    // Generate PDF
    await generateSalarySlipPDF(slip, filepath);

    // Update slip with PDF URL and download tracking
    slip.pdfUrl = `/uploads/salary-slips/${filename}`;
    slip.pdfGeneratedAt = new Date();
    slip.downloadedAt = new Date();
    slip.downloadCount = (slip.downloadCount || 0) + 1;
    
    if (slip.status === "generated" || slip.status === "sent" || slip.status === "viewed") {
      slip.status = "downloaded";
    }
    
    await slip.save();

    // Check if file exists
    if (!fs.existsSync(filepath)) {
      return res.status(500).json({ message: "PDF generation failed" });
    }

    // Set proper headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    // Send the file
    const fileStream = fs.createReadStream(filepath);
    fileStream.pipe(res);
    
    fileStream.on('error', (error) => {
      console.error("Error reading PDF file:", error);
      if (!res.headersSent) {
        res.status(500).json({ message: "Error reading PDF file" });
      }
    });

  } catch (error) {
    console.error("Error generating PDF:", error);
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

    // Check if PDF exists, if not generate it
    let pdfPath = null;
    if (slip.pdfUrl) {
      pdfPath = path.join(process.cwd(), slip.pdfUrl.replace("/uploads", "uploads"));
      if (!fs.existsSync(pdfPath)) {
        pdfPath = null;
      }
    }

    // Generate PDF if it doesn't exist
    if (!pdfPath) {
      const { generateSalarySlipPDF } = await import("../utils/salarySlipPdfGenerator.js");
      const uploadsDir = path.join(process.cwd(), "uploads", "salary-slips");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const filename = `salary-slip-${slip.employee.employeeId}-${slip.month}-${slip.year}.pdf`;
      pdfPath = path.join(uploadsDir, filename);
      await generateSalarySlipPDF(slip, pdfPath);

      slip.pdfUrl = `/uploads/salary-slips/${filename}`;
      slip.pdfGeneratedAt = new Date();
    }

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
    console.error("Error sending salary slip email:", error);
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

    // Generate PDFs for slips that don't have them
    const { generateSalarySlipPDF } = await import("../utils/salarySlipPdfGenerator.js");
    const uploadsDir = path.join(process.cwd(), "uploads", "salary-slips");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    for (const slip of slips) {
      if (!slip.pdfUrl) {
        const filename = `salary-slip-${slip.employee.employeeId}-${slip.month}-${slip.year}.pdf`;
        const pdfPath = path.join(uploadsDir, filename);
        await generateSalarySlipPDF(slip, pdfPath);
        slip.pdfUrl = `/uploads/salary-slips/${filename}`;
        slip.pdfGeneratedAt = new Date();
        await slip.save();
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
    console.error("Error sending bulk emails:", error);
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
