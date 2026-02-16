import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Employee is required"],
    },
    date: {
      type: Date,
      required: [true, "Date is required"],
      default: Date.now,
    },
    clockIn: {
      type: Date,
      required: [true, "Clock-in time is required"],
    },
    clockOut: {
      type: Date,
    },
    breaks: [
      {
        startTime: {
          type: Date,
          required: true,
        },
        endTime: {
          type: Date,
        },
      },
    ],
    totalBreakTime: {
      type: Number,
      default: 0, // in minutes
    },
    status: {
      type: String,
      enum: ["present", "absent", "half-day", "late", "on-leave"],
      // NO DEFAULT - will be calculated based on clockIn time
    },
    workHours: {
      type: Number,
      default: 0,
    },
    overtime: {
      type: Number,
      default: 0, // Auto-calculated overtime (work hours > 8)
    },
    // Manual overtime entries (work done after clock out)
    overtimeEntries: [
      {
        startTime: {
          type: Date,
          required: true,
        },
        endTime: {
          type: Date,
        },
        duration: {
          type: Number, // in hours
        },
        reason: {
          type: String,
          required: true,
          trim: true,
        },
        taskReference: {
          type: String,
          trim: true,
        },
        proofOfWork: {
          type: String, // URL to uploaded screenshot/photo
        },
        status: {
          type: String,
          enum: ['pending', 'approved', 'rejected'],
          default: 'pending',
        },
        isActive: {
          type: Boolean,
          default: false, // True when timer is running
        },
        approvedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        approvedAt: {
          type: Date,
        },
        rejectionReason: {
          type: String,
          trim: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    totalManualOvertime: {
      type: Number,
      default: 0, // Sum of approved manual overtime entries
    },
    totalWorkHours: {
      type: Number,
      default: 0, // workHours + overtime + totalManualOvertime
    },
    location: {
      latitude: { type: Number },
      longitude: { type: Number },
      address: { type: String },
    },
    notes: {
      type: String,
      trim: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    // Manual override tracking
    isManuallyModified: {
      type: Boolean,
      default: false,
    },
    originalStatus: {
      type: String,
      enum: ["present", "absent", "half-day", "late", "on-leave"],
    },
    originalClockIn: {
      type: Date,
    },
    modificationHistory: [
      {
        modifiedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        modifiedAt: {
          type: Date,
          default: Date.now,
        },
        reason: {
          type: String,
          required: true,
        },
        changes: {
          oldStatus: String,
          newStatus: String,
          oldClockIn: Date,
          newClockIn: Date,
          oldClockOut: Date,
          newClockOut: Date,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Method to calculate total break time in minutes
attendanceSchema.methods.calculateBreakTime = function() {
  if (!this.breaks || this.breaks.length === 0) {
    return 0;
  }
  
  let totalBreakMinutes = 0;
  for (const breakPeriod of this.breaks) {
    if (breakPeriod.startTime && breakPeriod.endTime) {
      const diffTime = Math.abs(breakPeriod.endTime - breakPeriod.startTime);
      const diffMinutes = diffTime / (1000 * 60);
      totalBreakMinutes += diffMinutes;
    }
  }
  
  return parseFloat(totalBreakMinutes.toFixed(2));
};

// Method to check if currently on break
attendanceSchema.methods.isOnBreak = function() {
  if (!this.breaks || this.breaks.length === 0) {
    return false;
  }
  
  // Check if the last break has no end time (still ongoing)
  const lastBreak = this.breaks[this.breaks.length - 1];
  return lastBreak && lastBreak.startTime && !lastBreak.endTime;
};

// Method to calculate total approved manual overtime
attendanceSchema.methods.calculateManualOvertime = function() {
  if (!this.overtimeEntries || this.overtimeEntries.length === 0) {
    return 0;
  }
  
  const approvedEntries = this.overtimeEntries.filter(entry => entry.status === 'approved');
  const totalHours = approvedEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0);
  
  return parseFloat(totalHours.toFixed(2));
};

// Method to calculate total work hours including all overtime
attendanceSchema.methods.calculateTotalWorkHours = function() {
  const regularHours = this.workHours || 0;
  const autoOvertime = this.overtime || 0;
  const manualOvertime = this.calculateManualOvertime();
  
  return parseFloat((regularHours + autoOvertime + manualOvertime).toFixed(2));
};

// Method to add overtime entry
attendanceSchema.methods.addOvertimeEntry = function(overtimeData) {
  const { startTime, endTime, reason, taskReference, proofOfWork } = overtimeData;
  
  // Calculate duration in hours if endTime is provided
  let duration = 0;
  if (endTime) {
    const diffTime = Math.abs(new Date(endTime) - new Date(startTime));
    duration = parseFloat((diffTime / (1000 * 60 * 60)).toFixed(2));
  }
  
  const entry = {
    startTime: new Date(startTime),
    endTime: endTime ? new Date(endTime) : null,
    duration,
    reason,
    taskReference: taskReference || '',
    proofOfWork: proofOfWork || '',
    status: 'pending',
    isActive: !endTime, // Active if no end time (timer running)
    createdAt: new Date(),
  };
  
  this.overtimeEntries.push(entry);
  console.log(`[OVERTIME] Added overtime entry: ${duration || 'Timer started'} hours - ${reason}`);
  
  return entry;
};

// Method to start overtime timer
attendanceSchema.methods.startOvertimeTimer = function(reason, taskReference) {
  // Check if there's already an active timer
  const activeTimer = this.overtimeEntries.find(e => e.isActive);
  if (activeTimer) {
    throw new Error('An overtime timer is already running. Please stop it first.');
  }
  
  const entry = {
    startTime: new Date(),
    endTime: null,
    duration: 0,
    reason,
    taskReference: taskReference || '',
    status: 'pending',
    isActive: true,
    createdAt: new Date(),
  };
  
  this.overtimeEntries.push(entry);
  console.log(`[OVERTIME] Started overtime timer - ${reason}`);
  
  return entry;
};

// Method to stop overtime timer
attendanceSchema.methods.stopOvertimeTimer = function(entryId) {
  const entry = this.overtimeEntries.id(entryId);
  
  if (!entry) {
    throw new Error('Overtime entry not found');
  }
  
  if (!entry.isActive) {
    throw new Error('This overtime timer is not active');
  }
  
  // Set end time and calculate duration
  entry.endTime = new Date();
  const diffTime = Math.abs(entry.endTime - entry.startTime);
  entry.duration = parseFloat((diffTime / (1000 * 60 * 60)).toFixed(2));
  entry.isActive = false;
  
  console.log(`[OVERTIME] Stopped overtime timer: ${entry.duration} hours`);
  
  return entry;
};

// Method to get active overtime timer
attendanceSchema.methods.getActiveOvertimeTimer = function() {
  return this.overtimeEntries.find(e => e.isActive) || null;
};

// Method to approve overtime entry
attendanceSchema.methods.approveOvertimeEntry = function(entryId, approvedBy) {
  const entry = this.overtimeEntries.id(entryId);
  
  if (!entry) {
    throw new Error('Overtime entry not found');
  }
  
  if (entry.status === 'approved') {
    throw new Error('Overtime entry already approved');
  }
  
  entry.status = 'approved';
  entry.approvedBy = approvedBy;
  entry.approvedAt = new Date();
  
  // Recalculate totals
  this.totalManualOvertime = this.calculateManualOvertime();
  this.totalWorkHours = this.calculateTotalWorkHours();
  
  console.log(`[OVERTIME] Approved overtime entry: ${entry.duration} hours`);
  
  return entry;
};

// Method to reject overtime entry
attendanceSchema.methods.rejectOvertimeEntry = function(entryId, rejectionReason, rejectedBy) {
  const entry = this.overtimeEntries.id(entryId);
  
  if (!entry) {
    throw new Error('Overtime entry not found');
  }
  
  if (entry.status === 'rejected') {
    throw new Error('Overtime entry already rejected');
  }
  
  entry.status = 'rejected';
  entry.rejectionReason = rejectionReason;
  entry.approvedBy = rejectedBy; // Track who rejected it
  entry.approvedAt = new Date();
  
  // Recalculate totals
  this.totalManualOvertime = this.calculateManualOvertime();
  this.totalWorkHours = this.calculateTotalWorkHours();
  
  console.log(`[OVERTIME] Rejected overtime entry: ${entry.duration} hours - ${rejectionReason}`);
  
  return entry;
};

// Method to track manual modifications
attendanceSchema.methods.trackManualModification = function(modifiedBy, reason, changes) {
  // Store original values if this is the first modification
  if (!this.isManuallyModified) {
    this.originalStatus = this.status;
    this.originalClockIn = this.clockIn;
    this.isManuallyModified = true;
  }
  
  // Add to modification history
  this.modificationHistory.push({
    modifiedBy,
    modifiedAt: new Date(),
    reason,
    changes,
  });
  
  console.log(`[ATTENDANCE] Manual modification tracked by ${modifiedBy}: ${reason}`);
};

// Method to calculate status based on clock-in time
attendanceSchema.methods.calculateStatus = function() {
  try {
    // Don't override if status is manually set to absent or on-leave
    if (this.status === 'absent' || this.status === 'on-leave') {
      return this.status;
    }
    
    if (!this.clockIn) {
      return 'absent';
    }
    
    const clockInTime = new Date(this.clockIn);
    
    // Validate date
    if (isNaN(clockInTime.getTime())) {
      console.error('[STATUS] Invalid clockIn date:', this.clockIn);
      return 'present';
    }
    
    // Convert to IST time - ALWAYS use Asia/Kolkata timezone
    const istTimeString = clockInTime.toLocaleString('en-IN', { 
      timeZone: 'Asia/Kolkata',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // Parse IST time (format: "HH:MM")
    const [clockInHour, clockInMinute] = istTimeString.split(':').map(Number);
    const totalMinutes = clockInHour * 60 + clockInMinute;
    
    // BUSINESS RULES - CRYSTAL CLEAR (ALL TIMES IN IST):
    // 00:00 to 10:30 (0-630 min) = Present
    // 10:31 to 11:59 (631-719 min) = Late
    // 12:00 to 19:00 (720-1140 min) = Half-day
    // After 19:00 (1140+ min) = Absent (too late)
    
    let calculatedStatus;
    
    if (totalMinutes > 1140) {
      // After 7:00 PM (19:00) - Too late, mark as absent
      calculatedStatus = "absent";
      console.log(`[STATUS] ${clockInHour}:${String(clockInMinute).padStart(2, '0')} IST (${totalMinutes} min) > 19:00 → ABSENT (too late)`);
    } else if (totalMinutes >= 720) {
      // 12:00 PM to 7:00 PM (720-1140 min) - Half day
      calculatedStatus = "half-day";
      console.log(`[STATUS] ${clockInHour}:${String(clockInMinute).padStart(2, '0')} IST (${totalMinutes} min) 12:00-19:00 → HALF-DAY`);
    } else if (totalMinutes > 630) {
      // 10:31 AM to 11:59 AM (631-719 min) - Late
      calculatedStatus = "late";
      console.log(`[STATUS] ${clockInHour}:${String(clockInMinute).padStart(2, '0')} IST (${totalMinutes} min) 10:31-11:59 → LATE`);
    } else {
      // 00:00 to 10:30 AM (0-630 min) - Present
      calculatedStatus = "present";
      console.log(`[STATUS] ${clockInHour}:${String(clockInMinute).padStart(2, '0')} IST (${totalMinutes} min) 00:00-10:30 → PRESENT`);
    }
    
    console.log(`[STATUS] FINAL: Clock-in ${clockInHour}:${String(clockInMinute).padStart(2, '0')} IST = ${calculatedStatus.toUpperCase()}`);
    
    return calculatedStatus;
    
  } catch (error) {
    console.error('[STATUS] Error calculating status:', error);
    return 'present';
  }
};

// PRE-SAVE HOOK: Always calculate status and work hours
attendanceSchema.pre("save", function (next) {
  try {
    console.log(`[ATTENDANCE] PRE-SAVE: Processing attendance record...`);
    console.log(`[ATTENDANCE] PRE-SAVE: Current status: ${this.status}, clockIn: ${this.clockIn}, isManuallyModified: ${this.isManuallyModified}`);
    
    // 1. ALWAYS calculate status based on clockIn time (unless manually set to absent/on-leave)
    if (this.clockIn) {
      // Only skip calculation if manually set to absent or on-leave AND it's manually modified
      const isManualAbsentOrLeave = (this.status === 'absent' || this.status === 'on-leave') && this.isManuallyModified;
      
      if (!isManualAbsentOrLeave) {
        const oldStatus = this.status;
        const newStatus = this.calculateStatus();
        console.log(`[ATTENDANCE] PRE-SAVE: Status calculation: ${oldStatus} → ${newStatus}`);
        
        // FORCE the status to be the calculated one
        this.status = newStatus;
        
        // If this is a new record and status was wrong, log it as a fix
        if (this.isNew && oldStatus && oldStatus !== newStatus) {
          console.log(`[ATTENDANCE] PRE-SAVE: 🔧 NEW RECORD FIX: ${oldStatus} → ${newStatus}`);
        }
      } else {
        console.log(`[ATTENDANCE] PRE-SAVE: ⚠️  Skipping calculation - manually set to ${this.status}`);
      }
    } else {
      console.log(`[ATTENDANCE] PRE-SAVE: ⚠️  No clockIn time found`);
    }
    
    // 2. Calculate work hours when clocking out
    if (this.clockIn && this.clockOut) {
      const diffTime = Math.abs(this.clockOut - this.clockIn);
      const diffHours = diffTime / (1000 * 60 * 60);
      
      // Calculate total break time
      this.totalBreakTime = this.calculateBreakTime();
      
      // Subtract break time from work hours
      const breakHours = this.totalBreakTime / 60;
      this.workHours = parseFloat((diffHours - breakHours).toFixed(2));

      // Calculate auto overtime (assuming 8 hours is standard)
      if (this.workHours > 8) {
        this.overtime = parseFloat((this.workHours - 8).toFixed(2));
      } else {
        this.overtime = 0;
      }
      
      console.log(`[ATTENDANCE] PRE-SAVE: Work hours calculated: ${this.workHours} (Break time: ${this.totalBreakTime} min, Auto overtime: ${this.overtime})`);
    }
    
    // 3. Calculate manual overtime and total work hours
    this.totalManualOvertime = this.calculateManualOvertime();
    this.totalWorkHours = this.calculateTotalWorkHours();
    
    console.log(`[ATTENDANCE] PRE-SAVE: Total work hours: ${this.totalWorkHours} (Regular: ${this.workHours}, Auto OT: ${this.overtime}, Manual OT: ${this.totalManualOvertime})`);
    
    console.log(`[ATTENDANCE] PRE-SAVE: ✅ Final status: ${this.status}`);
    next();
  } catch (error) {
    console.error('[ATTENDANCE] ❌ Error in pre-save hook:', error);
    next(error);
  }
});

// Compound index for employee and date to ensure one record per day
// Add indexes for faster queries
attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: -1 }); // For date range queries
attendanceSchema.index({ employee: 1, status: 1 }); // For filtering by status
attendanceSchema.index({ status: 1, date: -1 }); // For status reports

const Attendance = mongoose.model("Attendance", attendanceSchema);

export default Attendance;
