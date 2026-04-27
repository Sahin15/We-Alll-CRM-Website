import mongoose from "mongoose";

const softwareLicenseSchema = new mongoose.Schema(
  {
    licenseId: {
      type: String,
      unique: true,
      sparse: true,
    },
    softwareName: {
      type: String,
      required: true,
      trim: true,
    },
    vendor: {
      type: String,
      required: true,
      trim: true,
    },
    licenseType: {
      type: String,
      enum: ["Perpetual", "Subscription", "Trial", "Educational", "Open Source"],
      required: true,
    },
    licenseKey: {
      type: String,
      trim: true,
    },
    purchaseDate: {
      type: Date,
      required: true,
    },
    expiryDate: {
      type: Date,
    },
    cost: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "INR",
    },
    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },
    status: {
      type: String,
      enum: ["Active", "Expired", "Inactive", "Revoked"],
      default: "Active",
    },
    category: {
      type: String,
      enum: ["Development", "Productivity", "Design", "Security", "Utilities", "Other"],
      required: true,
    },
    description: {
      type: String,
      trim: true,
    },
    supportEndDate: {
      type: Date,
    },
    renewalReminder: {
      type: Boolean,
      default: true,
    },
    reminderDaysBefore: {
      type: Number,
      default: 30,
    },
    documentUrl: {
      type: String,
    },
    notes: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// Auto-generate licenseId before saving
softwareLicenseSchema.pre("save", async function (next) {
  if (!this.licenseId) {
    try {
      const lastLicense = await mongoose
        .model("SoftwareLicense")
        .findOne({}, { licenseId: 1 }, { sort: { createdAt: -1 } });

      let nextNumber = 1;
      if (lastLicense && lastLicense.licenseId) {
        const match = lastLicense.licenseId.match(/LIC(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1]) + 1;
        }
      }

      this.licenseId = `LIC${String(nextNumber).padStart(4, "0")}`;
    } catch (error) {
      return next(error);
    }
  }
  next();
});

export default mongoose.model("SoftwareLicense", softwareLicenseSchema);
