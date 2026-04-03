import mongoose from "mongoose";

const wfhRequestSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
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
      index: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    approvedAt: {
      type: Date,
    },
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    rejectedAt: {
      type: Date,
    },
    rejectionReason: {
      type: String,
    },
    // Track if employee actually worked from home (clocked in)
    actuallyWorked: {
      type: Boolean,
      default: false,
    },
    attendanceRecord: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Attendance",
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries and prevent duplicates
wfhRequestSchema.index({ employee: 1, date: 1 }, { unique: true });
wfhRequestSchema.index({ status: 1, date: 1 });

const WFHRequest = mongoose.model("WFHRequest", wfhRequestSchema);

export default WFHRequest;
