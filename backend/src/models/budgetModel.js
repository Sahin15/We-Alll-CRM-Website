import mongoose from "mongoose";

const budgetSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: ["travel", "food", "accommodation", "office_supplies", "client_meeting", "training", "other"],
      required: true,
    },
    financialYear: {
      type: String,
      required: true,
      // Format: "2024-2025" (April 2024 to March 2025)
    },
    limit: {
      type: Number,
      required: true,
      min: 0,
    },
    description: {
      type: String,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// Compound unique index for category and financial year
budgetSchema.index({ category: 1, financialYear: 1 }, { unique: true });

export default mongoose.model("Budget", budgetSchema);
