import mongoose from "mongoose";

const workOnLeaveDayRequestSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    leaveRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeaveRequest",
      required: true,
    },
    attendanceRecord: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Attendance",
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    reviewedAt: {
      type: Date,
    },
    rejectionReason: {
      type: String,
      trim: true,
    },
    // Track if leave was cancelled after approval
    leaveCancelled: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
workOnLeaveDayRequestSchema.index({ employee: 1, date: 1 });
workOnLeaveDayRequestSchema.index({ status: 1 });

const WorkOnLeaveDayRequest = mongoose.model("WorkOnLeaveDayRequest", workOnLeaveDayRequestSchema);

export default WorkOnLeaveDayRequest;
