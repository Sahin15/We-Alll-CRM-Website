import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    recipientType: {
      type: String,
      enum: ["client", "admin", "user", "hr", "employee"],
      default: "user",
    },
    type: {
      type: String,
      enum: [
        "payment_due",
        "payment_overdue",
        "payment_received",
        "payment_submitted",
        "payment_verified",
        "bill_generated",
        "bill_sent",
        "plan_renewal_reminder",
        "plan_expiring",
        "plan_expired",
        "subscription_activated",
        "onboarding_started",
        "onboarding_completed",
        "general",
        "system",
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    link: {
      type: String, // URL to redirect when clicked
    },
    data: {
      type: mongoose.Schema.Types.Mixed, // Additional data (payment ID, bill ID, etc.)
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed, // Additional data (payment ID, bill ID, etc.)
    },
    channels: {
      inApp: { type: Boolean, default: true },
      email: { type: Boolean, default: false },
      sms: { type: Boolean, default: false },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
    },
    icon: {
      type: String, // Icon class or name
    },
    color: {
      type: String, // Color code for notification
    },
    expiresAt: {
      type: Date, // Auto-delete notification after this date
    },
  },
  { timestamps: true }
);

// Mark as read method
notificationSchema.methods.markAsRead = function () {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

// Static method to get unread count
notificationSchema.statics.getUnreadCount = async function (userId) {
  return await this.countDocuments({ recipient: userId, isRead: false });
};

// Static method to create notification
notificationSchema.statics.createNotification = async function (data) {
  return await this.create(data);
};

// Indexes for performance
notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Auto-delete expired

const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;
