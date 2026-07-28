import mongoose from "mongoose";

/**
 * Creative revision — one immutable attempt at a Graphic/Video deliverable.
 * Never owns a slot; slots stay on the Main Task (WorkItem).
 * @see docs/WORKFLOW/CREATIVE_REVISION_MODEL.md
 */
const creativeRevisionAttachmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["image", "video", "document", "code", "design", "other"],
      default: "other",
    },
    size: Number,
    storageKey: { type: String, trim: true },
    category: {
      type: String,
      enum: ["source", "preview", "export", "thumbnail", "project-file", "other"],
      default: "other",
    },
    notes: { type: String, trim: true, maxlength: 1000 },
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    softDeprecated: { type: Boolean, default: false },
  },
  { _id: true }
);

const creativeRevisionSchema = new mongoose.Schema(
  {
    workItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WorkItem",
      required: true,
      index: true,
    },
    revisionNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    parentRevision: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CreativeRevision",
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    reason: {
      type: String,
      trim: true,
      maxlength: [1000, "Reason cannot exceed 1000 characters"],
      default: "Initial draft",
    },
    feedback: {
      type: String,
      trim: true,
      maxlength: [4000, "Feedback cannot exceed 4000 characters"],
      default: "",
    },
    attachments: [creativeRevisionAttachmentSchema],
    estimatedHours: { type: Number, min: 0, default: 0 },
    actualHours: { type: Number, min: 0, default: 0 },
    status: {
      type: String,
      enum: [
        "draft",
        "submitted",
        "changes_requested",
        "rejected",
        "approved",
        "superseded",
        "delivered",
      ],
      default: "draft",
      index: true,
    },
    reviewNotes: {
      type: String,
      trim: true,
      maxlength: [4000, "Review notes cannot exceed 4000 characters"],
      default: "",
    },
    approvalNotes: {
      type: String,
      trim: true,
      maxlength: [4000, "Approval notes cannot exceed 4000 characters"],
      default: "",
    },
    lastDecision: {
      type: String,
      enum: ["none", "approve", "reject", "minor", "major", "send_back"],
      default: "none",
    },
    decisionSeverity: {
      type: String,
      enum: ["none", "minor", "major", "reject"],
      default: "none",
    },
    isCurrentTip: { type: Boolean, default: true, index: true },
    isDeliveredRevision: { type: Boolean, default: false },
    softArchived: { type: Boolean, default: false },
    submittedAt: Date,
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: Date,
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedAt: Date,
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

creativeRevisionSchema.index(
  { workItem: 1, revisionNumber: 1 },
  { unique: true }
);

creativeRevisionSchema.pre("validate", function (next) {
  // Guard: revisions must never carry slot assignment fields
  if (this.slotAssignment || this.assignedSlot) {
    return next(new Error("Creative revisions cannot own slots"));
  }
  next();
});

const CreativeRevision = mongoose.model(
  "CreativeRevision",
  creativeRevisionSchema
);

export default CreativeRevision;
export { creativeRevisionAttachmentSchema };
