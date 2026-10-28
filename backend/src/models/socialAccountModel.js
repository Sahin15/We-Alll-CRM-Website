import mongoose from "mongoose";
import { SOCIAL_PLATFORMS } from "../services/social/socialRules.js";

const socialAccountSchema = new mongoose.Schema(
  {
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
      index: true,
    },
    platform: {
      type: String,
      enum: SOCIAL_PLATFORMS.map((item) => item.id),
      required: true,
    },
    accountName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    handle: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    profileUrl: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },
    status: {
      type: String,
      enum: ["connected", "disconnected"],
      default: "connected",
    },
    followers: {
      type: Number,
      min: 0,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
    connectedAt: {
      type: Date,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

socialAccountSchema.index({ client: 1, platform: 1, handle: 1 }, { unique: true });

const SocialAccount = mongoose.model("SocialAccount", socialAccountSchema);
export default SocialAccount;
