import mongoose from "mongoose";

const planSchema = new mongoose.Schema(
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
    description: {
      type: String,
      trim: true,
    },
    planType: {
      type: String,
      enum: ["standard", "premium", "enterprise", "custom"],
      default: "standard",
    },
    includedServices: [
      {
        service: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Service",
          required: true,
        },
        name: String,
        basePrice: Number,
        customPrice: Number,
        features: [String],
      },
    ],
    overridePrice: {
      type: Number,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    discountType: {
      type: String,
      enum: ["fixed", "percentage"],
      default: "fixed",
    },
    additionalFeatures: {
      type: [String],
      default: [],
    },
    allowedBillingCycles: {
      type: [String],
      enum: ["monthly", "quarterly", "half-yearly", "yearly", "one-time"],
      default: [],
    },
    autoCalculatedPrice: {
      type: Number,
      default: 0,
    },
    finalPrice: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isPopular: {
      type: Boolean,
      default: false,
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// Method to calculate allowed billing cycles (intersection of all services)
planSchema.methods.calculateAllowedBillingCycles = async function () {
  if (this.includedServices.length === 0) {
    this.allowedBillingCycles = [];
    return;
  }

  // Populate services if not already populated
  await this.populate("includedServices.service");

  // Get billing cycles from all services
  const serviceCycles = this.includedServices.map((item) => {
    return item.service.allowedBillingCycles || [];
  });

  // Find intersection of all billing cycles
  if (serviceCycles.length === 0) {
    this.allowedBillingCycles = [];
    return;
  }

  const intersection = serviceCycles.reduce((acc, cycles) => {
    return acc.filter((cycle) => cycles.includes(cycle));
  });

  this.allowedBillingCycles = intersection;
};

// Pre-save hook to calculate prices
planSchema.pre("save", async function (next) {
  // Calculate auto price from services
  let autoPrice = 0;
  for (const item of this.includedServices) {
    const price = item.customPrice || item.basePrice || 0;
    autoPrice += price;
  }
  this.autoCalculatedPrice = autoPrice;

  // Calculate final price
  if (this.overridePrice !== undefined && this.overridePrice !== null) {
    this.finalPrice = this.overridePrice;
  } else {
    let finalPrice = autoPrice;

    // Apply discount
    if (this.discount > 0) {
      if (this.discountType === "percentage") {
        finalPrice = finalPrice - (finalPrice * this.discount) / 100;
      } else {
        finalPrice = finalPrice - this.discount;
      }
    }

    this.finalPrice = Math.max(0, finalPrice);
  }

  next();
});

// Indexes for faster queries
planSchema.index({ company: 1, isActive: 1 });
planSchema.index({ planType: 1 });

const Plan = mongoose.model("Plan", planSchema);
export default Plan;
