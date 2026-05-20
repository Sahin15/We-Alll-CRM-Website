import mongoose from "mongoose";

const leaveRequestSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Employee is required"],
    },
    leaveType: {
      type: String,
      enum: ["personal", "medical", "vacation", "half_day", "unpaid"],
      required: [true, "Leave type is required"],
    },
    startDate: {
      type: Date,
      required: [true, "Start date is required"],
    },
    endDate: {
      type: Date,
      required: [true, "End date is required"],
    },
    reason: {
      type: String,
      required: [true, "Reason is required"],
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled"],
      default: "pending",
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    approvedDate: {
      type: Date,
    },
    rejectionReason: {
      type: String,
      trim: true,
    },
    numberOfDays: {
      type: Number,
    },
    attachments: [
      {
        type: String, // S3 URL or file path
      },
    ],
    // Leave year for tracking annual limits
    leaveYear: {
      type: Number,
      default: function() {
        return new Date().getFullYear();
      }
    },
    // Application date for advance notice validation
    applicationDate: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true,
  }
);

// Calculate number of days before saving
leaveRequestSchema.pre("save", function (next) {
  if (this.startDate && this.endDate) {
    // Half-day leave is always exactly 0.5 days regardless of date range
    if (this.leaveType === 'half_day') {
      this.numberOfDays = 0.5;
    } else {
      const diffTime = Math.abs(this.endDate - this.startDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      this.numberOfDays = diffDays;
    }
  }
  next();
});

// Validation for advance notice requirements
leaveRequestSchema.pre("save", function (next) {
  if (this.isNew && this.startDate && this.applicationDate) {
    const daysDifference = Math.ceil((this.startDate - this.applicationDate) / (1000 * 60 * 60 * 24));
    
    // Check advance notice requirements
    if (this.leaveType === 'personal' && daysDifference < 3) {
      return next(new Error('Personal leave must be requested at least 3 days in advance'));
    }
    
    if (this.leaveType === 'vacation' && daysDifference < 30) {
      return next(new Error('Vacation leave must be requested at least 30 days in advance'));
    }
    
    // Medical leave can be same day (no restriction)
  }
  next();
});

const PAID_LEAVE_TYPES = ["personal", "medical", "vacation", "half_day"];
const ALL_LEAVE_TYPES = [...PAID_LEAVE_TYPES, "unpaid"];

const NON_FULL_TIME_EMPLOYMENT_TYPES = ["part-time", "intern", "freelancer", "contract"];

const normalizeEmploymentType = (type) => {
  if (!type || typeof type !== "string") return null;
  return type.trim().toLowerCase();
};

// Static helper: only explicit full-time employees earn paid leave
leaveRequestSchema.statics.isFullTimeEmployee = function (employmentTypeOrEmployee) {
  let type = null;
  let employee = null;

  if (employmentTypeOrEmployee && typeof employmentTypeOrEmployee === "object") {
    employee = employmentTypeOrEmployee;
    type = normalizeEmploymentType(employee.employmentType);
  } else {
    type = normalizeEmploymentType(employmentTypeOrEmployee);
  }

  if (type && NON_FULL_TIME_EMPLOYMENT_TYPES.includes(type)) {
    return false;
  }

  // Unset or explicit full-time (Mongoose default for new users is full-time)
  return type === "full-time" || !type;
};

// Resolve accrual anchor for full-time employees
leaveRequestSchema.statics.getAccrualDate = function (employee) {
  if (!employee) return null;
  return employee.fullTimeStartDate || employee.joiningDate || null;
};

// Static method to calculate earned leaves based on current date and joining date
// Rule: Employees earn 2 leaves per month starting from their joining month
// If they join mid-month, they still get the full month's leaves
leaveRequestSchema.statics.calculateEarnedLeaves = function(year = new Date().getFullYear(), joiningDate = null) {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1; // 1-12
  
  // Debug logging
  const debugLog = (message, data = {}) => {
    if (process.env.NODE_ENV !== 'production') {
      
    }
  };
  
  debugLog('Calculating earned leaves', { year, joiningDate, currentYear, currentMonth });
  
  if (year > currentYear) {
    // Future year - no leaves earned yet
    debugLog('Future year - returning 0');
    return 0;
  } else if (year < currentYear) {
    // Past year - check if employee had joined by then
    if (joiningDate) {
      const joiningYear = new Date(joiningDate).getFullYear();
      if (joiningYear > year) {
        // Employee hadn't joined in this past year
        debugLog('Employee not joined in past year - returning 0');
        return 0;
      } else if (joiningYear === year) {
        // Employee joined during this past year - calculate pro-rata
        const joiningMonth = new Date(joiningDate).getMonth() + 1; // 1-12
        // Count from joining month to December
        const monthsWorked = 12 - joiningMonth + 1;
        const earned = Math.min(monthsWorked * 2, 24);
        debugLog('Past year, joined mid-year', { joiningMonth, monthsWorked, earned });
        return earned;
      }
    }
    // Past year and employee had joined - full 24 leaves earned
    debugLog('Past year, full leaves - returning 24');
    return 24;
  } else {
    // Current year - calculate based on months passed
    if (joiningDate) {
      const joiningYear = new Date(joiningDate).getFullYear();
      const joiningMonth = new Date(joiningDate).getMonth() + 1; // 1-12
      const joiningDay = new Date(joiningDate).getDate();
      const currentDay = currentDate.getDate();
      
      debugLog('Has joining date', { joiningYear, joiningMonth, joiningDay, currentDay });
      
      if (joiningYear > currentYear) {
        // Employee hasn't joined yet
        debugLog('Employee not joined yet - returning 0');
        return 0;
      } else if (joiningYear === currentYear) {
        // Employee joined this year
        if (joiningMonth > currentMonth) {
          // Joining month is in the future
          debugLog('Joining month in future - returning 0');
          return 0;
        } else if (joiningMonth === currentMonth && joiningDay > currentDay) {
          // Joining day is in the future (same month)
          debugLog('Joining day in future - returning 0');
          return 0;
        }
        
        // Calculate months from joining month to current month (inclusive)
        const monthsWorked = currentMonth - joiningMonth + 1;
        const earned = Math.min(monthsWorked * 2, 24);
        debugLog('Current year calculation', { joiningMonth, currentMonth, monthsWorked, earned });
        return earned;
      }
    }
    
    // Employee joined before this year OR no joining date - calculate normally
    // Count all months from January to current month
    const earned = Math.min(currentMonth * 2, 24);
    debugLog('No joining date or joined before this year', { currentMonth, earned });
    return earned;
  }
};

// Static method to get comprehensive leave balance for an employee
leaveRequestSchema.statics.getLeaveBalance = async function(employeeId, year = new Date().getFullYear()) {
  const User = mongoose.model('User');
  const employee = await User.findById(employeeId).select(
    'joiningDate employmentType fullTimeStartDate internshipDetails'
  );

  const employmentType = employee?.employmentType;
  const isFullTime = this.isFullTimeEmployee(employee);
  const accrualDate = isFullTime ? this.getAccrualDate(employee) : null;

  const approvedLeaves = await this.find({
    employee: employeeId,
    status: 'approved',
    leaveYear: year
  });

  const usedByCategory = {
    personal: 0,
    medical: 0,
    vacation: 0,
    unpaid: 0,
    half_day: 0
  };

  let totalPaidLeavesUsed = 0;

  approvedLeaves.forEach(leave => {
    const days = leave.leaveType === 'half_day' ? 0.5 : (leave.numberOfDays || 0);
    if (usedByCategory.hasOwnProperty(leave.leaveType)) {
      usedByCategory[leave.leaveType] += days;

      if (leave.leaveType !== 'unpaid') {
        // For full-time: only count paid leaves on/after accrual date
        const countsTowardEarned =
          isFullTime &&
          (!accrualDate || new Date(leave.startDate) >= new Date(accrualDate));

        if (countsTowardEarned) {
          totalPaidLeavesUsed += days;
        }
      }
    }
  });

  let earnedLeaves = 0;
  let remainingLeaves = 0;

  if (isFullTime) {
    earnedLeaves = this.calculateEarnedLeaves(year, accrualDate);
    remainingLeaves = Math.max(0, earnedLeaves - totalPaidLeavesUsed);
  }

  const balance = {
    personal: {
      total: 12,
      used: usedByCategory.personal,
      remaining: isFullTime ? Math.max(0, 12 - usedByCategory.personal) : 0
    },
    medical: {
      total: 6,
      used: usedByCategory.medical,
      remaining: isFullTime ? Math.max(0, 6 - usedByCategory.medical) : 0
    },
    vacation: {
      total: 6,
      used: usedByCategory.vacation,
      remaining: isFullTime ? Math.max(0, 6 - usedByCategory.vacation) : 0
    },
    unpaid: {
      total: 0,
      used: usedByCategory.unpaid,
      remaining: 0
    },
    half_day: {
      total: 0,
      used: usedByCategory.half_day,
      remaining: 0
    },
    earned: {
      total: 24,
      earned: earnedLeaves,
      used: isFullTime ? totalPaidLeavesUsed : 0,
      remaining: remainingLeaves,
      monthlyRate: 2,
      year: year
    },
    eligibleForPaidLeave: isFullTime,
    employmentType,
    canApplyLeaveTypes: isFullTime ? ALL_LEAVE_TYPES : ['unpaid']
  };

  return balance;
};

// Static method to validate leave request against earned balance
leaveRequestSchema.statics.validateLeaveRequest = async function(employeeId, leaveType, numberOfDays, year = new Date().getFullYear()) {
  if (leaveType === 'unpaid') {
    return true;
  }

  const User = mongoose.model('User');
  const employee = await User.findById(employeeId).select('employmentType internshipDetails');

  if (!this.isFullTimeEmployee(employee)) {
    throw new Error(
      'Only unpaid leave is available for your employment type. Earned leave applies to full-time employees only.'
    );
  }

  const balance = await this.getLeaveBalance(employeeId, year);

  if (balance.earned.remaining < numberOfDays) {
    throw new Error(`Insufficient earned leave balance. Available: ${balance.earned.remaining} days, Requested: ${numberOfDays} days. You have earned ${balance.earned.earned} out of 24 annual leaves.`);
  }

  return true;
};

const LeaveRequest = mongoose.model("LeaveRequest", leaveRequestSchema);

export default LeaveRequest;
