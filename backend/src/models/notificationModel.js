import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: [
        "payment_due",
        "payment_overdue",
        "payment_received",
        "bill_generated",
        "bill_sent",
        "plan_renewal_reminder",
        "plan_expiring",
        "plan_expired",
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
    metadata: {
      type: mongoose.Schema.Types.Mixed, // Additional data (payment ID, bill ID, etc.)
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

// Indexes for performance
notificationSchema.index({ user: 1, isRead: 1 });
notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Auto-delete expired

const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;
