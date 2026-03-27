import mongoose from "mongoose";

const callHistorySchema = new mongoose.Schema({
  calledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  calledAt: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ["No Response", "Wrong Number", "Not Interested", "Interested", "Follow-up Needed", "Called"],
    required: true,
  },
  remarks: { type: String, trim: true },
  duration: { type: Number, default: 0 }, // seconds
});

const rawDataSchema = new mongoose.Schema(
  {
    // Contact Info
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    whatsapp: { type: String, trim: true },
    location: { type: String, trim: true },
    category: {
      type: String,
      trim: true,
      enum: ["Makeup Artist", "Salon", "Bridal Clients", "Tattoo Artists", "Nail Art", "Other"],
      default: "Other",
    },

    // Source & Reference
    source: {
      type: String,
      enum: ["Instagram", "Facebook", "Referral", "Manual", "Website", "Justdial", "Event", "Existing Contact", "Other"],
      default: "Manual",
    },
    reference: { type: String, trim: true },
    requirement: { type: String, trim: true },

    // Calling & Status
    status: {
      type: String,
      enum: [
        "New",
        "Pending Call",
        "Called",
        "No Response",
        "Wrong Number",
        "Not Interested",
        "Interested",
        "Follow-up Needed",
        "Converted to Lead",
        "Rejected",
      ],
      default: "New",
    },
    remarks: { type: String, trim: true },
    assignedCaller: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    callAttemptCount: { type: Number, default: 0 },
    lastCallDate: { type: Date, default: null },
    nextCallDate: { type: Date, default: null },

    // Call History
    callHistory: [callHistorySchema],

    // Record Lock
    recordLock: { type: Boolean, default: false },
    lockedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    lockedAt: { type: Date, default: null },
    lockExpiresAt: { type: Date, default: null },

    // Lead Conversion
    convertedToLead: { type: Boolean, default: false },
    convertedLeadId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead", default: null },
    convertedAt: { type: Date, default: null },
    convertedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    // Batch Import
    batchId: { type: String, default: null },

    // Meta
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

// Indexes
rawDataSchema.index({ phone: 1 });
rawDataSchema.index({ status: 1 });
rawDataSchema.index({ assignedCaller: 1 });
rawDataSchema.index({ category: 1 });
rawDataSchema.index({ location: 1 });
rawDataSchema.index({ source: 1 });
rawDataSchema.index({ createdAt: -1 });
rawDataSchema.index({ status: 1, assignedCaller: 1, createdAt: -1 });

const RawData = mongoose.model("RawData", rawDataSchema);
export default RawData;
