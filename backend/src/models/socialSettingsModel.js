import mongoose from "mongoose";

const socialSettingsSchema = new mongoose.Schema(
  {
    companyScope: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    timezone: {
      type: String,
      default: "Asia/Kolkata",
      maxlength: 64,
    },
    contentQueue: {
      type: String,
      enum: ["general", "client", "campaign"],
      default: "general",
    },
    autoHashtags: {
      type: Boolean,
      default: false,
    },
    defaultPostType: {
      type: String,
      enum: ["image", "video", "carousel", "text"],
      default: "image",
    },
    workflow: {
      type: String,
      enum: ["internal", "client_approval"],
      default: "internal",
    },
  },
  { timestamps: true }
);

const SocialSettings = mongoose.model("SocialSettings", socialSettingsSchema);
export default SocialSettings;
