import mongoose from "mongoose";
import { getTodayMidnightIST } from "../utils/timezone.js";

const workLogSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Employee is required"],
      index: true,
    },
    date: {
      type: Date,
      required: [true, "Date is required"],
      index: true,
    },
    workLog: {
      type: String,
      required: function() {
        return this.status === 'submitted' || this.status === 'reviewed';
      },
      trim: true,
      validate: {
        validator: function(value) {
          if (this.status === 'draft') return true;
          if (this.status === 'submitted' || this.status === 'reviewed') {
            return value && value.length >= 50;
          }
          return true;
        },
        message: 'Work log must be at least 50 characters for submitted logs'
      },
      maxlength: [2000, "Work log cannot exceed 2000 characters"],
    },
    status: {
      type: String,
      enum: ["draft", "submitted", "reviewed"],
      default: "submitted",
    },
    submittedAt: {
      type: Date,
    },
    isLateSubmission: {
      type: Boolean,
      default: false,
    },
    lateSubmissionRemark: {
      type: String,
      trim: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    reviewedAt: {
      type: Date,
    },
    reviewNotes: {
      type: String,
      trim: true,
    },
    editHistory: [
      {
        editedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        editedAt: {
          type: Date,
          default: Date.now,
        },
        changes: {
          type: mongoose.Schema.Types.Mixed,
        },
        reason: {
          type: String,
          trim: true,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

workLogSchema.index({ employee: 1, date: 1 }, { unique: true });

workLogSchema.pre("save", function (next) {
  if (this.isNew || this.isModified("date")) {
    const midnight = getTodayMidnightIST(this.date);
    this.date = midnight;
  }
  if (this.status === "submitted" && !this.submittedAt) {
    this.submittedAt = new Date();
  }
  next();
});

workLogSchema.virtual("canEdit").get(function () {
  return this.status !== "reviewed";
});

workLogSchema.methods.canUserEdit = function (userId, userRole) {
  if (["admin", "superadmin", "hr", "manager"].includes(userRole)) {
    return true;
  }
  return this.employee.toString() === userId.toString() && this.status !== "reviewed";
};

workLogSchema.methods.canUserReview = function (userId, userRole) {
  if (!["admin", "superadmin", "hr", "manager"].includes(userRole)) {
    return false;
  }
  return this.employee.toString() !== userId.toString();
};

const WorkLog = mongoose.model("WorkLog", workLogSchema);

export default WorkLog;
