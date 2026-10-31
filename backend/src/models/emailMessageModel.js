import mongoose from "mongoose";

const addressSchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    email: { type: String, default: "" },
  },
  { _id: false }
);

const emailMessageSchema = new mongoose.Schema(
  {
    emailAccount: { type: mongoose.Schema.Types.ObjectId, ref: "EmailAccount", required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    gmailMessageId: { type: String, required: true },
    threadId: { type: String, default: "" },
    from: { type: addressSchema, default: () => ({}) },
    to: { type: [addressSchema], default: [] },
    cc: { type: [addressSchema], default: [] },
    subject: { type: String, default: "" },
    snippet: { type: String, default: "" },
    receivedAt: { type: Date, required: true },
    isRead: { type: Boolean, default: false },
    labels: { type: [String], default: [] },
    syncedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

emailMessageSchema.index({ emailAccount: 1, gmailMessageId: 1 }, { unique: true });
emailMessageSchema.index({ user: 1, receivedAt: -1 });
emailMessageSchema.index({ user: 1, threadId: 1 });

const EmailMessage = mongoose.model("EmailMessage", emailMessageSchema);
export default EmailMessage;
