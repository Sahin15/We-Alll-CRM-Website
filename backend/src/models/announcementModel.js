import mongoose from "mongoose";

const announcementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Announcement title is required"],
      trim: true,
    },
    content: {
      type: String,
      required: [true, "Announcement content is required"],
      trim: true,
    },
    type: {
      type: String,
      enum: ["general", "urgent", "event", "policy", "holiday", "important"],
      default: "general",
    },
    priority: {
      type: String,
      enum: ["low", "normal", "high"],
      default: "normal",
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      // If null, announcement is for all departments
    },
    targetRoles: {
      type: [String],
      enum: ["employee", "hod", "hr", "manager", "admin", "superadmin"],
      // If empty, announcement is for all roles
      default: [],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    expiresAt: {
      type: Date,
      // Optional expiration date for the announcement
    },
    attachments: [
      {
        name: String,
        url: String,
        type: String, // 'link', 'file', 'image'
      },
    ],
    readBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        readAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
announcementSchema.index({ createdAt: -1 });
announcementSchema.index({ type: 1 });
announcementSchema.index({ department: 1 });
announcementSchema.index({ isPinned: -1, createdAt: -1 });

// Virtual for checking if announcement is expired
announcementSchema.virtual("isExpired").get(function () {
  return this.expiresAt && this.expiresAt < new Date();
});

// Method to mark announcement as read by a user
announcementSchema.methods.markAsRead = function (userId) {
  const alreadyRead = this.readBy.some(
    (read) => read.user.toString() === userId.toString()
  );
  
  if (!alreadyRead) {
    this.readBy.push({ user: userId, readAt: new Date() });
    return this.save();
  }
  
  return Promise.resolve(this);
};

// Method to check if user has read the announcement
announcementSchema.methods.isReadBy = function (userId) {
  return this.readBy.some(
    (read) => read.user.toString() === userId.toString()
  );
};

const Announcement = mongoose.model("Announcement", announcementSchema);

export default Announcement;
