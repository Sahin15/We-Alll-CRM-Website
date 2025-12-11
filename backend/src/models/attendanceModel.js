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
      default: 0,
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
      return 'present'; // Default to present if date is invalid
    }
    
    const clockInHour = clockInTime.getHours();
    const clockInMinute = clockInTime.getMinutes();
    
    // Convert to total minutes for easier comparison
    const totalMinutes = clockInHour * 60 + clockInMinute;
    
    // FIXED BUSINESS RULES (NO EXCEPTIONS FOR ANY ROLE):
    // - 00:00 to 10:30 (0-630 minutes) = Present
    // - 10:31 to 11:59 (631-719 minutes) = Late  
    // - 12:00 onwards (720+ minutes) = Half-day
    
    let calculatedStatus;
    if (totalMinutes >= 720) {
      // 12:00 PM (720 minutes) or later = Half day
      calculatedStatus = "half-day";
    } else if (totalMinutes > 630) {
      // 10:31 AM (631 minutes) to 11:59 AM (719 minutes) = Late
      calculatedStatus = "late";
    } else {
      // 00:00 to 10:30 AM (0-630 minutes) = Present
      calculatedStatus = "present";
    }
    
    console.log(`[STATUS] Clock-in: ${clockInHour}:${String(clockInMinute).padStart(2, '0')} (${totalMinutes} min) = ${calculatedStatus.toUpperCase()}`);
    return calculatedStatus;
    
  } catch (error) {
    console.error('[STATUS] Error calculating status:', error);
    return 'present'; // Default to present on error
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
      this.workHours = parseFloat(diffHours.toFixed(2));

      // Calculate overtime (assuming 8 hours is standard)
      if (diffHours > 8) {
        this.overtime = parseFloat((diffHours - 8).toFixed(2));
      }
      
      console.log(`[ATTENDANCE] PRE-SAVE: Work hours calculated: ${this.workHours}`);
    }
    
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
