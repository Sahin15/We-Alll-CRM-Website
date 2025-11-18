import mongoose from "mongoose";

const addOnSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    company: {
      type: String,
      required: true,
      enum: ["We Alll", "Kolkata Digital"],
    },
    category: {
      type: String,
      required: true,
      trim: true,
      // Examples: "Content", "SEO", "Social Media", "Security"
    },
    description: {
      type: String,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    billingType: {
      type: String,
      required: true,
      enum: ["one-time", "recurring"],
      default: "recurring",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    applicablePlans: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Plan",
      default: [],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// Indexes for faster queries
addOnSchema.index({ company: 1, isActive: 1 });
addOnSchema.index({ category: 1 });

const AddOn = mongoose.model("AddOn", addOnSchema);
export default AddOn;
