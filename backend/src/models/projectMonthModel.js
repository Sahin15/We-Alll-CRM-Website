import mongoose from "mongoose";

const projectMonthSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
    },
    year: {
      type: Number,
      required: true,
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    periodIdentifier: {
      type: String,
      required: true, // e.g. "2026-08"
    },
    status: {
      type: String,
      enum: ["draft", "in_progress", "submitted", "reviewed"],
      default: "draft",
    },
    goals: [
      {
        title: { type: String, required: true, trim: true },
        description: { type: String, trim: true },
        owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        status: { type: String, enum: ["planned", "done", "dropped"], default: "planned" },
        relatedDeliverableIds: [{ type: mongoose.Schema.Types.ObjectId }],
      }
    ],
    plannedDeliverableIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
      }
    ],
    nextMonthGoals: [
      {
        title: { type: String, required: true, trim: true },
        description: { type: String, trim: true },
        owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      }
    ],
    issues: [
      {
        title: { type: String, required: true, trim: true },
        description: { type: String, trim: true },
        severity: { type: String, enum: ["low", "medium", "high"], default: "medium" },
        owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        status: { type: String, enum: ["open", "mitigated", "closed"], default: "open" },
        relatedWorkItemId: { type: mongoose.Schema.Types.ObjectId, ref: "WorkItem" },
      }
    ],
    risks: [
      {
        title: { type: String, required: true, trim: true },
        description: { type: String, trim: true },
        likelihood: { type: String, enum: ["low", "medium", "high"], default: "medium" },
        impact: { type: String, enum: ["low", "medium", "high"], default: "medium" },
        mitigation: { type: String, trim: true },
        owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        status: { type: String, enum: ["open", "closed"], default: "open" },
      }
    ],
    clientFeedback: {
      summary: { type: String, trim: true },
      sentiment: { type: String, enum: ["positive", "neutral", "negative", null], default: null },
      recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      recordedAt: { type: Date },
    },
    managementComments: [
      {
        comment: { type: String, required: true, trim: true },
        by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        at: { type: Date, default: Date.now },
      }
    ],
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    reviewedAt: {
      type: Date,
    },
    executiveSummary: {
      type: String,
      trim: true,
    },
    keyAchievements: {
      type: String,
      trim: true,
    },
    autoSnapshot: {
      plannedDeliverables: { type: Number },
      completedDeliverables: { type: Number },
      delayedDeliverables: { type: Number },
      plannedWorkItems: { type: Number },
      completedWorkItems: { type: Number },
      overdueWorkItems: { type: Number },
      achievementPercent: { type: Number },
      executionNote: { type: String },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// Ensure unique year and month per project
projectMonthSchema.index({ project: 1, year: 1, month: 1 }, { unique: true });

const ProjectMonth = mongoose.model("ProjectMonth", projectMonthSchema);
export default ProjectMonth;
