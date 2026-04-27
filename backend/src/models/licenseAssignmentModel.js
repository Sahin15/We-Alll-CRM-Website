import mongoose from "mongoose";

const licenseAssignmentSchema = new mongoose.Schema(
  {
    assignmentId: {
      type: String,
      unique: true,
      sparse: true,
    },
    license: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SoftwareLicense",
      required: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignmentDate: {
      type: Date,
      default: Date.now,
    },
    revocationDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["Active", "Revoked", "Expired"],
      default: "Active",
    },
    installationPath: {
      type: String,
      trim: true,
    },
    deviceInfo: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    revocationReason: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// Auto-generate assignmentId before saving
licenseAssignmentSchema.pre("save", async function (next) {
  if (!this.assignmentId) {
    try {
      const lastAssignment = await mongoose
        .model("LicenseAssignment")
        .findOne({}, { assignmentId: 1 }, { sort: { createdAt: -1 } });

      let nextNumber = 1;
      if (lastAssignment && lastAssignment.assignmentId) {
        const match = lastAssignment.assignmentId.match(/LICA(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1]) + 1;
        }
      }

      this.assignmentId = `LICA${String(nextNumber).padStart(4, "0")}`;
    } catch (error) {
      return next(error);
    }
  }
  next();
});

export default mongoose.model("LicenseAssignment", licenseAssignmentSchema);
