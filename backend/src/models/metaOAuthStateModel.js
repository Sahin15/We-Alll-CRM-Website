import mongoose from "mongoose";

const metaOAuthStateSchema = new mongoose.Schema(
  {
    state: { type: String, required: true, unique: true },
    companyScope: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    expiresAt: { type: Date, required: true },
    used: { type: Boolean, default: false },
  },
  { timestamps: true }
);

metaOAuthStateSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const MetaOAuthState = mongoose.model("MetaOAuthState", metaOAuthStateSchema);
export default MetaOAuthState;
