import mongoose from "mongoose";

const salaryPreviewSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  year: {
    type: Number,
    required: true,
    min: 2020,
    max: 2050
  },
  
  // Calculated values
  workingDaysBreakdown: {
    totalDays: {
      type: Number,
      required: true
    },
    weekends: {
      type: Number,
      required: true,
      default: 0
    },
    holidays: {
      type: Number,
      required: true,
      default: 0
    },
    workingDays: {
      type: Number,
      required: true
    },
    holidayDates: [{
      type: Date
    }]
  },
  
  leaveImpact: {
    paidLeaves: {
      type: Number,
      default: 0
    },
    unpaidLeaves: {
      type: Number,
      default: 0
    },
    perDaySalary: {
      type: Number,
      required: true
    },
    deductionAmount: {
      type: Number,
      default: 0
    },
    leaveBreakdown: [{
      leaveType: String,
      days: Number,
      isPaid: Boolean,
      deductionAmount: Number
    }]
  },
  
  salaryBreakdown: {
    earnings: {
      basicSalary: { type: Number, default: 0 },
      hra: { type: Number, default: 0 },
      specialAllowance: { type: Number, default: 0 },
      transportAllowance: { type: Number, default: 0 },
      medicalAllowance: { type: Number, default: 0 },
      otherAllowances: [{
        name: String,
        amount: Number
      }],
      bonus: { type: Number, default: 0 },
      overtime: { type: Number, default: 0 },
      arrears: { type: Number, default: 0 },
      reimbursements: { type: Number, default: 0 },
      incentives: { type: Number, default: 0 }
    },
    deductions: {
      providentFund: { type: Number, default: 0 },
      professionalTax: { type: Number, default: 0 },
      tds: { type: Number, default: 0 },
      esi: { type: Number, default: 0 },
      lossOfPay: { type: Number, default: 0 },
      advances: { type: Number, default: 0 },
      loans: { type: Number, default: 0 },
      otherDeductions: [{
        name: String,
        amount: Number,
        reason: String
      }]
    },
    grossSalary: {
      type: Number,
      required: true
    },
    totalDeductions: {
      type: Number,
      required: true
    },
    netSalary: {
      type: Number,
      required: true
    }
  },
  
  // Employee interaction
  employeeViewed: {
    type: Boolean,
    default: false
  },
  employeeViewedAt: {
    type: Date
  },
  employeeQueries: [{
    query: {
      type: String,
      required: true
    },
    submittedAt: {
      type: Date,
      default: Date.now
    },
    hrResponse: {
      type: String
    },
    respondedAt: {
      type: Date
    },
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    status: {
      type: String,
      enum: ["pending", "responded", "resolved"],
      default: "pending"
    }
  }],
  
  // Status tracking
  status: {
    type: String,
    enum: ["generated", "under_review", "query_raised", "acknowledged", "finalized"],
    default: "generated"
  },
  acknowledgedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  acknowledgedAt: {
    type: Date
  },
  finalizedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  finalizedAt: {
    type: Date
  },
  
  // Deadline tracking
  reviewDeadline: {
    type: Date,
    required: true
  },
  
  // Link to final salary slip
  finalSalarySlip: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SalarySlip"
  }
}, {
  timestamps: true
});

// Compound indexes
salaryPreviewSchema.index({ employee: 1, month: 1, year: 1 }, { unique: true });
salaryPreviewSchema.index({ status: 1, reviewDeadline: 1 });
salaryPreviewSchema.index({ month: 1, year: 1 });

// Virtual for checking if review period is expired
salaryPreviewSchema.virtual("isReviewExpired").get(function() {
  return new Date() > this.reviewDeadline;
});

// Virtual for checking if there are pending queries
salaryPreviewSchema.virtual("hasPendingQueries").get(function() {
  return this.employeeQueries.some(query => query.status === "pending");
});

// Ensure virtuals are included in JSON output
salaryPreviewSchema.set('toJSON', { virtuals: true });
salaryPreviewSchema.set('toObject', { virtuals: true });

// Static method to generate preview for employee
salaryPreviewSchema.statics.generatePreview = async function(employeeId, month, year, additionalData = {}, workingDaysOverride = null) {
  try {
    // Check if preview already exists
    const existingPreview = await this.findOne({
      employee: employeeId,
      month,
      year
    });

    if (existingPreview) {
      throw new Error("Preview already exists for this month");
    }

    const WorkingDaysCalculator = (await import("../services/workingDaysCalculator.js")).default;
    const LeaveImpactCalculator = (await import("../services/leaveImpactCalculator.js")).default;
    
    const workingDaysCalc = new WorkingDaysCalculator();
    const leaveImpactCalc = new LeaveImpactCalculator();

    const User = mongoose.model("User");
    const SalaryStructure = mongoose.model("SalaryStructure");
    
    const employee = await User.findById(employeeId).populate("department");
    if (!employee) {
      throw new Error("Employee not found");
    }

    const salaryStructure = await SalaryStructure.getActiveStructure(employeeId);
    if (!salaryStructure) {
      throw new Error("No active salary structure found");
    }

    // Use override if provided (mid-month generation), otherwise calculate normally
    let workingDaysResult;
    if (workingDaysOverride && workingDaysOverride.workingDays > 0) {
      workingDaysResult = {
        totalDays: workingDaysOverride.totalDays,
        workingDays: workingDaysOverride.workingDays,
        holidays: workingDaysOverride.holidays || 0,
        weekends: workingDaysOverride.totalDays - workingDaysOverride.workingDays - (workingDaysOverride.holidays || 0),
        holidayDates: [],
        isPartialMonth: true
      };
    } else {
      workingDaysResult = await workingDaysCalc.calculateWorkingDays(month, year, employee.department?._id);
    }
    
    // Calculate leave impact
    const leaveImpactResult = await leaveImpactCalc.calculateLeaveDeduction(employeeId, month, year, salaryStructure);

    // Use effectiveWorkingDays so mid-month generation doesn't count future days as absent
    const effectiveWorkingDays = leaveImpactResult.effectiveWorkingDays ?? workingDaysResult.workingDays;
    const effectiveWorkingDaysResult = {
      ...workingDaysResult,
      workingDays: effectiveWorkingDays,
      isPartialMonth: leaveImpactResult.isPartialMonth || false
    };

    // Prepare salary breakdown
    const earnings = {
      basicSalary: salaryStructure.basicSalary,
      hra: salaryStructure.hra,
      specialAllowance: salaryStructure.specialAllowance,
      transportAllowance: salaryStructure.transportAllowance,
      medicalAllowance: salaryStructure.medicalAllowance,
      otherAllowances: salaryStructure.otherAllowances || [],
      bonus: additionalData.bonus || 0,
      overtime: additionalData.overtime || 0,
      arrears: additionalData.arrears || 0,
      reimbursements: additionalData.reimbursements || 0,
      incentives: additionalData.incentives || 0
    };

    const deductions = {
      providentFund: salaryStructure.providentFund,
      professionalTax: salaryStructure.professionalTax,
      tds: salaryStructure.tds,
      esi: salaryStructure.esi,
      lossOfPay: leaveImpactResult.deductionAmount,
      advances: additionalData.advances || 0,
      loans: additionalData.loans || 0,
      otherDeductions: salaryStructure.otherDeductions || []
    };

    // Calculate totals
    const grossSalary = Object.values(earnings).reduce((sum, val) => {
      if (Array.isArray(val)) {
        return sum + val.reduce((arrSum, item) => arrSum + (item.amount || 0), 0);
      }
      return sum + (val || 0);
    }, 0);

    const totalDeductions = Object.values(deductions).reduce((sum, val) => {
      if (Array.isArray(val)) {
        return sum + val.reduce((arrSum, item) => arrSum + (item.amount || 0), 0);
      }
      return sum + (val || 0);
    }, 0);

    const netSalary = grossSalary - totalDeductions;

    // Set review deadline (5 days from generation)
    const reviewDeadline = new Date();
    reviewDeadline.setDate(reviewDeadline.getDate() + 5);

    // Create preview
    const preview = new this({
      employee: employeeId,
      month,
      year,
      workingDaysBreakdown: effectiveWorkingDaysResult,
      leaveImpact: leaveImpactResult,
      salaryBreakdown: {
        earnings,
        deductions,
        grossSalary,
        totalDeductions,
        netSalary
      },
      reviewDeadline
    });

    await preview.save();
    return preview;
  } catch (error) {
    
    throw error;
  }
};

// Instance method to submit employee query
salaryPreviewSchema.methods.submitQuery = async function(query, employeeId) {
  try {
    // Verify employee can submit query
    if (this.employee.toString() !== employeeId.toString()) {
      throw new Error("Unauthorized to submit query for this preview");
    }

    if (this.isReviewExpired) {
      throw new Error("Review period has expired");
    }

    this.employeeQueries.push({
      query,
      submittedAt: new Date()
    });

    this.status = "query_raised";
    await this.save();

    return this;
  } catch (error) {
    
    throw error;
  }
};

// Instance method to respond to employee query
salaryPreviewSchema.methods.respondToQuery = async function(queryIndex, response, hrUserId) {
  try {
    if (queryIndex >= this.employeeQueries.length) {
      throw new Error("Query not found");
    }

    const query = this.employeeQueries[queryIndex];
    query.hrResponse = response;
    query.respondedAt = new Date();
    query.respondedBy = hrUserId;
    query.status = "responded";

    // Check if all queries are responded
    const allResponded = this.employeeQueries.every(q => q.status === "responded");
    if (allResponded) {
      this.status = "under_review";
    }

    await this.save();
    return this;
  } catch (error) {
    
    throw error;
  }
};

// Instance method to acknowledge preview
salaryPreviewSchema.methods.acknowledge = async function(employeeId) {
  try {
    if (this.employee.toString() !== employeeId.toString()) {
      throw new Error("Unauthorized to acknowledge this preview");
    }

    this.acknowledgedBy = employeeId;
    this.acknowledgedAt = new Date();
    this.status = "acknowledged";
    
    await this.save();
    return this;
  } catch (error) {
    
    throw error;
  }
};

// Instance method to finalize preview
salaryPreviewSchema.methods.finalize = async function(hrUserId) {
  try {
    // Check if can be finalized
    if (this.status !== "acknowledged" && !this.isReviewExpired) {
      throw new Error("Preview cannot be finalized yet");
    }

    this.finalizedBy = hrUserId;
    this.finalizedAt = new Date();
    this.status = "finalized";
    
    await this.save();
    return this;
  } catch (error) {
    
    throw error;
  }
};

const SalaryPreview = mongoose.model("SalaryPreview", salaryPreviewSchema);

export default SalaryPreview;