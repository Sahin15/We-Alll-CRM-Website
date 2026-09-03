import mongoose from "mongoose";
import {
  ANNUAL_EARNED_LEAVE_LIMIT,
  MONTHLY_EARNED_LEAVE_RATE,
} from "../constants/leaveCategoryLimits.js";
import {
  ACTIVE_LEAVE_TYPES,
  ALL_STORED_LEAVE_TYPES,
  getLeaveBalanceCategory,
  getLeaveDayCount,
  isPaidLeaveType,
} from "../constants/leaveTypes.js";
import {
  calculateEarnedLeaves as computeEarnedLeaves,
  resolveAccrualDate,
} from "../utils/leaveAccrual.js";

const leaveRequestSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Employee is required"],
    },
    leaveType: {
      type: String,
      enum: ALL_STORED_LEAVE_TYPES,
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
    this.numberOfDays = getLeaveDayCount(this.leaveType, this.startDate, this.endDate);
  }
  next();
});

// Same-day leave allowed for all paid types — no advance notice validation.

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

// Resolve accrual anchor for full-time employees (see leaveAccrual.js)
leaveRequestSchema.statics.getAccrualDate = function (employee) {
  return resolveAccrualDate(employee);
};

leaveRequestSchema.statics.calculateEarnedLeaves = function (
  year = new Date().getFullYear(),
  accrualDate = null
) {
  return computeEarnedLeaves(year, accrualDate);
};

leaveRequestSchema.statics.buildLeaveBalance = function (
  employee,
  approvedLeaves,
  year = new Date().getFullYear()
) {
  const employmentType = employee?.employmentType;
  const isFullTime = this.isFullTimeEmployee(employee);
  const accrualDate = isFullTime ? this.getAccrualDate(employee) : null;

  const usedByCategory = {
    medical: 0,
    casual: 0,
    unpaid: 0,
  };

  let totalPaidLeavesUsed = 0;

  approvedLeaves.forEach((leave) => {
    const days = getLeaveDayCount(leave.leaveType, leave.startDate, leave.endDate);
    const balanceCategory = getLeaveBalanceCategory(leave.leaveType);

    if (balanceCategory) {
      usedByCategory[balanceCategory] += days;
    } else if (leave.leaveType === "unpaid") {
      usedByCategory.unpaid += days;
    }

    if (leave.leaveType !== "unpaid" && isPaidLeaveType(leave.leaveType)) {
      const countsTowardEarned =
        isFullTime &&
        (!accrualDate || new Date(leave.startDate) >= new Date(accrualDate));

      if (countsTowardEarned) {
        totalPaidLeavesUsed += days;
      }
    }
  });

  let earnedLeaves = 0;
  let remainingLeaves = 0;

  if (isFullTime) {
    earnedLeaves = this.calculateEarnedLeaves(year, accrualDate);
    remainingLeaves = Math.max(0, earnedLeaves - totalPaidLeavesUsed);
  }

  return {
    medical: {
      used: usedByCategory.medical,
    },
    casual: {
      used: usedByCategory.casual,
    },
    unpaid: {
      used: usedByCategory.unpaid,
    },
    earned: {
      total: ANNUAL_EARNED_LEAVE_LIMIT,
      earned: earnedLeaves,
      used: isFullTime ? totalPaidLeavesUsed : 0,
      remaining: remainingLeaves,
      monthlyRate: MONTHLY_EARNED_LEAVE_RATE,
      year,
    },
    eligibleForPaidLeave: isFullTime,
    employmentType,
    canApplyLeaveTypes: isFullTime ? ACTIVE_LEAVE_TYPES : ["unpaid"],
  };
};

// Static method to get comprehensive leave balance for an employee
leaveRequestSchema.statics.getLeaveBalance = async function(employeeId, year = new Date().getFullYear()) {
  const User = mongoose.model('User');
  const employee = await User.findById(employeeId).select(
    'joiningDate employmentType fullTimeStartDate internshipDetails createdAt'
  );

  const approvedLeaves = await this.find({
    employee: employeeId,
    status: 'approved',
    leaveYear: year
  });

  return this.buildLeaveBalance(employee, approvedLeaves, year);
};

leaveRequestSchema.statics.getBulkLeaveBalances = async function(
  employeeIds,
  year = new Date().getFullYear()
) {
  const User = mongoose.model("User");
  const uniqueIds = [...new Set(employeeIds.map(String))].filter(Boolean);
  if (!uniqueIds.length) {
    return {};
  }

  const employees = await User.find({ _id: { $in: uniqueIds } })
    .select("joiningDate employmentType fullTimeStartDate internshipDetails createdAt")
    .lean();

  const approvedLeaves = await this.find({
    employee: { $in: uniqueIds },
    status: "approved",
    leaveYear: year,
  }).lean();

  const leavesByEmployee = {};
  for (const leave of approvedLeaves) {
    const empId = leave.employee.toString();
    if (!leavesByEmployee[empId]) {
      leavesByEmployee[empId] = [];
    }
    leavesByEmployee[empId].push(leave);
  }

  const balances = {};
  for (const employee of employees) {
    const empId = employee._id.toString();
    balances[empId] = this.buildLeaveBalance(
      employee,
      leavesByEmployee[empId] || [],
      year
    );
  }

  return balances;
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
    throw new Error(`Insufficient earned leave balance. Available: ${balance.earned.remaining} days, Requested: ${numberOfDays} days. You have earned ${balance.earned.earned} out of ${ANNUAL_EARNED_LEAVE_LIMIT} annual leaves.`);
  }

  return true;
};

const LeaveRequest = mongoose.model("LeaveRequest", leaveRequestSchema);

export default LeaveRequest;
