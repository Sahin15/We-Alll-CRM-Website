import mongoose from "mongoose";

const salarySlipSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Employee is required"],
    },
    salaryStructure: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SalaryStructure",
      required: [true, "Salary structure is required"],
    },
    
    // Period
    month: {
      type: Number,
      required: [true, "Month is required"],
      min: 1,
      max: 12,
    },
    year: {
      type: Number,
      required: [true, "Year is required"],
    },
    payPeriod: {
      type: String,
      required: true, // e.g., "January 2025"
    },
    paymentDate: {
      type: Date,
    },
    
    // Working Days
    totalWorkingDays: {
      type: Number,
      default: 26,
    },
    daysWorked: {
      type: Number,
      default: 26,
    },
    daysAbsent: {
      type: Number,
      default: 0,
    },
    paidLeaves: {
      type: Number,
      default: 0,
    },
    unpaidLeaves: {
      type: Number,
      default: 0,
    },
    weekends: {
      type: Number,
      default: 0,
    },
    holidays: {
      type: Number,
      default: 0,
    },
    
    // Earnings
    earnings: {
      basicSalary: { type: Number, default: 0 },
      hra: { type: Number, default: 0 },
      specialAllowance: { type: Number, default: 0 },
      transportAllowance: { type: Number, default: 0 },
      medicalAllowance: { type: Number, default: 0 },
      otherAllowances: [
        {
          name: String,
          amount: Number,
        },
      ],
      bonus: { type: Number, default: 0 },
      overtime: { type: Number, default: 0 },
      arrears: { type: Number, default: 0 },
      reimbursements: { type: Number, default: 0 },
      incentives: { type: Number, default: 0 },
    },
    
    // Deductions
    deductions: {
      providentFund: { type: Number, default: 0 },
      professionalTax: { type: Number, default: 0 },
      tds: { type: Number, default: 0 },
      esi: { type: Number, default: 0 },
      lossOfPay: { type: Number, default: 0 },
      advances: { type: Number, default: 0 },
      loans: { type: Number, default: 0 },
      otherDeductions: [
        {
          name: String,
          amount: Number,
        },
      ],
    },
    
    // Totals
    totalEarnings: {
      type: Number,
      default: 0,
    },
    totalDeductions: {
      type: Number,
      default: 0,
    },
    netSalary: {
      type: Number,
      default: 0,
    },
    
    // Year-to-Date
    ytd: {
      grossSalary: { type: Number, default: 0 },
      tds: { type: Number, default: 0 },
      netSalary: { type: Number, default: 0 },
    },
    
    // PDF & Status
    pdfUrl: {
      type: String,
    },
    pdfGeneratedAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["draft", "generated", "sent", "viewed", "downloaded", "paid", "approved", "rejected"],
      default: "draft",
    },
    
    // Employee Actions
    viewedAt: {
      type: Date,
    },
    downloadedAt: {
      type: Date,
    },
    downloadCount: {
      type: Number,
      default: 0,
    },
    
    // Email
    emailSent: {
      type: Boolean,
      default: false,
    },
    emailSentAt: {
      type: Date,
    },
    
    // Approval
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    approvedAt: {
      type: Date,
    },
    
    // Notes
    notes: {
      type: String,
      trim: true,
    },
    
    // Enhanced payroll system fields
    workingDaysCalculation: {
      method: {
        type: String,
        enum: ["dynamic", "fixed"],
        default: "dynamic"
      },
      totalCalendarDays: {
        type: Number,
        default: 0
      },
      weekends: {
        type: Number,
        default: 0
      },
      holidays: {
        type: Number,
        default: 0
      },
      actualWorkingDays: {
        type: Number,
        default: 26
      },
      holidayDates: [{
        type: Date
      }]
    },
    
    leaveImpactDetails: {
      perDaySalary: {
        type: Number,
        default: 0
      },
      leaveBreakdown: [{
        leaveType: String,
        days: Number,
        isPaid: Boolean,
        deductionAmount: Number
      }],
      totalLeaveDeduction: {
        type: Number,
        default: 0
      }
    },
    
    // Preview and approval tracking
    previewId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SalaryPreview",
      default: null
    },
    approvalWorkflowId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ApprovalWorkflow",
      default: null
    },
    
    // Employee acknowledgment
    employeeAcknowledged: {
      type: Boolean,
      default: false
    },
    acknowledgedAt: {
      type: Date
    },
    
    // Template tracking
    generatedFromTemplate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SalaryStructureTemplate",
      default: null
    },
    templateVersion: {
      type: Number,
      default: null
    },
    
    // Additional status fields for enhanced workflow
    rejectedAt: {
      type: Date
    },
    rejectionReason: {
      type: String
    },
  },
  {
    timestamps: true,
  }
);

// Calculate totals before saving
salarySlipSchema.pre("save", function (next) {
  // Calculate total earnings
  let totalEarnings = 
    this.earnings.basicSalary +
    this.earnings.hra +
    this.earnings.specialAllowance +
    this.earnings.transportAllowance +
    this.earnings.medicalAllowance +
    this.earnings.bonus +
    this.earnings.overtime +
    this.earnings.arrears +
    this.earnings.reimbursements +
    this.earnings.incentives;
  
  // Add other allowances
  if (this.earnings.otherAllowances && this.earnings.otherAllowances.length > 0) {
    totalEarnings += this.earnings.otherAllowances.reduce((sum, allowance) => sum + allowance.amount, 0);
  }
  
  this.totalEarnings = totalEarnings;
  
  // Calculate total deductions
  let totalDeductions =
    this.deductions.providentFund +
    this.deductions.professionalTax +
    this.deductions.tds +
    this.deductions.esi +
    this.deductions.lossOfPay +
    this.deductions.advances +
    this.deductions.loans;
  
  // Add other deductions
  if (this.deductions.otherDeductions && this.deductions.otherDeductions.length > 0) {
    totalDeductions += this.deductions.otherDeductions.reduce((sum, deduction) => sum + deduction.amount, 0);
  }
  
  this.totalDeductions = totalDeductions;
  
  // Calculate net salary
  this.netSalary = this.totalEarnings - this.totalDeductions;
  
  next();
});

// Indexes
salarySlipSchema.index({ employee: 1, year: -1, month: -1 });
salarySlipSchema.index({ status: 1 });
salarySlipSchema.index({ paymentDate: -1 });

// Compound unique index to prevent duplicate slips for same employee/month/year
salarySlipSchema.index({ employee: 1, month: 1, year: 1 }, { unique: true });

// Static method to get employee's salary slips
salarySlipSchema.statics.getEmployeeSlips = async function(employeeId, year = null) {
  const query = { employee: employeeId };
  if (year) {
    query.year = year;
  }
  
  return this.find(query)
    .sort({ year: -1, month: -1 })
    .populate("employee", "name email employeeId designation department")
    .populate("salaryStructure");
};

// Static method to calculate YTD
salarySlipSchema.statics.calculateYTD = async function(employeeId, year, upToMonth) {
  const slips = await this.find({
    employee: employeeId,
    year: year,
    month: { $lte: upToMonth },
    status: { $in: ["generated", "sent", "viewed", "downloaded", "paid"] }
  });
  
  const ytd = {
    grossSalary: 0,
    tds: 0,
    netSalary: 0
  };
  
  slips.forEach(slip => {
    ytd.grossSalary += slip.totalEarnings;
    ytd.tds += slip.deductions.tds;
    ytd.netSalary += slip.netSalary;
  });
  
  return ytd;
};

const SalarySlip = mongoose.model("SalarySlip", salarySlipSchema);

export default SalarySlip;
