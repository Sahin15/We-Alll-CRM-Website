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
      default: "present",
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
  },
  {
    timestamps: true,
  }
);

// Calculate work hours when clocking out
attendanceSchema.pre("save", function (next) {
  if (this.clockIn && this.clockOut) {
    const diffTime = Math.abs(this.clockOut - this.clockIn);
    const diffHours = diffTime / (1000 * 60 * 60);
    this.workHours = parseFloat(diffHours.toFixed(2));

    // Calculate overtime (assuming 8 hours is standard)
    if (diffHours > 8) {
      this.overtime = parseFloat((diffHours - 8).toFixed(2));
    }
  }
  next();
});

// Compound index for employee and date to ensure one record per day
attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

const Attendance = mongoose.model("Attendance", attendanceSchema);

export default Attendance;
