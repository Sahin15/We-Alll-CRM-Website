import mongoose from "mongoose";
import { POST_STATUSES, SOCIAL_PLATFORMS } from "../services/social/socialRules.js";

const socialPostSchema = new mongoose.Schema(
  {
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
    platforms: [{
      type: String,
      enum: SOCIAL_PLATFORMS.map((item) => item.id),
      required: true,
    }],
    mediaUrl: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },
    status: {
      type: String,
      enum: POST_STATUSES,
      default: "draft",
      index: true,
    },
    scheduledAt: {
      type: Date,
    },
    publishedAt: {
      type: Date,
    },
    approvalNote: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    approvedAt: {
      type: Date,
    },
    metrics: {
      reach: { type: Number, min: 0 },
      clicks: { type: Number, min: 0 },
      engagementRate: { type: Number, min: 0, max: 100 },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

socialPostSchema.index({ status: 1, scheduledAt: 1 });
socialPostSchema.index({ publishedAt: 1 });

const SocialPost = mongoose.model("SocialPost", socialPostSchema);
export default SocialPost;
