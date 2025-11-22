import mongoose from "mongoose";

const policySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Policy title is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Policy description is required"],
      trim: true,
    },
    content: {
      type: String,
      required: [true, "Policy content is required"],
    },
    category: {
      type: String,
      enum: [
        "hr",
        "it",
        "finance",
        "security",
        "health-safety",
        "code-of-conduct",
        "leave",
        "attendance",
        "general",
        "other"
      ],
      default: "general",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    status: {
      type: String,
      enum: ["draft", "active", "archived"],
      default: "draft",
    },
    effectiveDate: {
      type: Date,
      default: Date.now,
    },
    expiryDate: {
      type: Date,
    },
    version: {
      type: String,
      default: "1.0",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    tags: [String],
    isPublic: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

policySchema.index({ title: "text", description: "text", content: "text" });
policySchema.index({ category: 1, status: 1 });

const Policy = mongoose.model("Policy", policySchema);

export default Policy;
