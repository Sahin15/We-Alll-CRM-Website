import mongoose from "mongoose";

const targetSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  expectedValue: {
    type: String,
    required: true,
  },
  achievedValue: {
    type: String,
    default: "0",
  },
  pendingValue: {
    type: String,
    default: "0",
  },
  weekNumber: {
    type: Number,
    required: true,
  },
});

const noticeSchema = new mongoose.Schema({
  stage: {
    type: String,
    enum: ["concern", "improvement", "critical"],
    required: true,
  },
  problemCategories: {
    type: [String],
    enum: [
      "attendance",
      "productivity",
      "quality",
      "communication",
      "deadline management",
      "task ownership",
    ],
    default: undefined,
  },
  /** @deprecated Legacy single category — kept for older documents; synced from problemCategories */
  problemCategory: {
    type: String,
    enum: [
      "attendance",
      "productivity",
      "quality",
      "communication",
      "deadline management",
      "task ownership",
    ],
  },
  description: {
    type: String,
    required: true,
  },
  deadline: {
    type: Date,
    required: true,
  },
  issuedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  issuedAt: {
    type: Date,
    default: Date.now,
  },
  acknowledged: {
    type: Boolean,
    default: false,
  },
  acknowledgedAt: {
    type: Date,
  },
});

noticeSchema.pre("validate", function syncProblemCategories() {
  if ((!this.problemCategories || this.problemCategories.length === 0) && this.problemCategory) {
    this.problemCategories = [this.problemCategory];
  }
  if (this.problemCategories?.length) {
    this.problemCategory = this.problemCategories[0];
  }
});

noticeSchema.path("problemCategories").validate(function validateCategories(arr) {
  return Array.isArray(arr) && arr.length > 0;
}, "At least one problem category is required");

const reviewMeetingSchema = new mongoose.Schema({
  reviewDate: {
    type: Date,
    required: true,
  },
  notes: {
    type: String,
    required: true,
  },
  progressStatus: {
    type: String,
    enum: ["improved", "partially improved", "no improvement"],
    required: true,
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
});

const growthTrackSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    stage: {
      type: String,
      enum: ["concern", "improvement", "critical"],
      default: "concern",
    },
    status: {
      type: String,
      enum: ["active", "completed", "extended", "hr_action"],
      default: "active",
    },
    notices: [noticeSchema],
    weeklyTargets: [targetSchema],
    reviewMeetings: [reviewMeetingSchema],
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
    },
    history: [
      {
        stage: String,
        status: String,
        changedAt: { type: Date, default: Date.now },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        note: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes for query performance
growthTrackSchema.index({ employee: 1, status: 1 });
growthTrackSchema.index({ manager: 1 });
growthTrackSchema.index({ stage: 1 });

const GrowthTrack = mongoose.model("GrowthTrack", growthTrackSchema);
export default GrowthTrack;
