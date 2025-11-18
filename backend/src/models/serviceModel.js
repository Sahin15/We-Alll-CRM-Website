import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema(
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
    },
    description: {
      type: String,
      trim: true,
    },
    basePrice: {
      type: Number,
      required: true,
      min: 0,
    },
    allowedBillingCycles: {
      type: [String],
      enum: ["monthly", "quarterly", "half-yearly", "yearly", "one-time"],
      default: ["monthly"],
    },
    features: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
    specifications: {
      deliveryTime: String,
      revisions: Number,
      supportType: String,
      teamSize: String,
    },
    tags: [String],
    isPopular: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

serviceSchema.index({ company: 1, category: 1, isActive: 1 });
serviceSchema.index({ category: 1 });
serviceSchema.index({ isPopular: -1, displayOrder: 1 });
serviceSchema.index({ name: "text", description: "text" });

serviceSchema.virtual("formattedPrice").get(function () {
  return `₹${this.basePrice.toLocaleString("en-IN")}`;
});

serviceSchema.methods.supportsBillingCycle = function (cycle) {
  return this.allowedBillingCycles.includes(cycle);
};

const Service = mongoose.model("Service", serviceSchema);
export default Service;
