import mongoose from "mongoose";

const emailAccountSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    provider: { type: String, enum: ["gmail"], required: true, default: "gmail" },
    email: { type: String, required: true, trim: true, lowercase: true },
    displayName: { type: String, default: "", trim: true },
    encryptedAccessToken: { type: String, default: "", select: false },
    encryptedRefreshToken: { type: String, default: "", select: false },
    tokenExpiry: { type: Date },
    scopes: { type: [String], default: [] },
    syncStatus: { type: String, enum: ["idle", "syncing", "error"], default: "idle" },
    lastSyncedAt: { type: Date },
    lastSyncError: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

emailAccountSchema.index({ user: 1, provider: 1 }, { unique: true });

const EmailAccount = mongoose.model("EmailAccount", emailAccountSchema);
export default EmailAccount;
