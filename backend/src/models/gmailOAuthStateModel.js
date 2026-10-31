import mongoose from "mongoose";

const gmailOAuthStateSchema = new mongoose.Schema(
  {
    state: { type: String, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    expiresAt: { type: Date, required: true },
    used: { type: Boolean, default: false },
  },
  { timestamps: true }
);

gmailOAuthStateSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const GmailOAuthState = mongoose.model("GmailOAuthState", gmailOAuthStateSchema);
export default GmailOAuthState;
