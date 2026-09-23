import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: [
        // Leave
        'leave_approval',
        'leave_rejection',
        'leave_request',
        // Meeting
        'meeting_scheduled',
        'meeting_updated',
        'meeting_cancelled',
        'meeting_reminder_15min',
        'meeting_reminder_1hour',
        // Task / Work
        'task_assigned',
        'work_assigned',
        'work_reassigned',
        'work_reassigned_from',
        'work_reassigned_project',
        'work_updated',
        'work_updated_project',
        'work_status_changed',
        'work_completed',
        'review_requested',
        // Expense
        'expense_approval',
        'expense_rejection',
        'expense_submitted',
        'expense_reimbursed',
        // Invoice
        'invoice_generated',
        'invoice_sent',
        'invoice_paid',
        'invoice_overdue',
        // Client
        'client_created',
        'client_status_changed',
        // Project
        'project_created',
        'project_status_changed',
        'project_deadline_7days',
        'project_deadline_3days',
        // WFH
        'wfh_request_submitted',
        'wfh_request_approved',
        'wfh_request_rejected',
        // Payment / Billing
        'payment_processed',
        'payment_due',
        'payment_overdue',
        // Plan
        'plan_renewal_reminder',
        'plan_expiring',
        'plan_expired',
        // Attendance
        'attendance_alert',
        'attendance_auto_clockout',
        // Other
        'work_log_reminder',
        'work_log_concern',
        'announcement',
        'general',
        // Procurement
        'procurement_pr_submitted',
        'procurement_pr_hod_approved',
        'procurement_pr_approved',
        'procurement_pr_rejected',
        'procurement_po_issued',
        'procurement_gr_recorded',
        'procurement_invoice_due',
        // Hiring
        'hiring_request',
        'hiring_offer',
        'hiring_application',
        'hiring_interview',
        // Payroll / Salary
        'salary_slip',
        'salary_slip_generated',
        'salary_slip_sent',
        // Growth Track
        'growth_track',
      ],
      default: 'general',
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
    },
    actionUrl: {
      type: String,
    },
    icon: {
      type: String,
    },
    badge: {
      type: String,
    },
    tag: {
      type: String,
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high'],
      default: 'normal',
    },
    expiresAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 }); // Composite index for unread notifications
notificationSchema.index({ type: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index
notificationSchema.index({ recipient: 1, readAt: 1 }); // For cleanup queries

// Method to mark as read
notificationSchema.methods.markAsRead = function() {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

// Static method to get unread count
notificationSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({
    recipient: userId,
    isRead: false,
  });
};

// Static method to get user notifications
notificationSchema.statics.getUserNotifications = function(userId, limit = 20, skip = 0) {
  return this.find({ recipient: userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .populate('sender', 'name email');
};

// Static method to get ONLY unread notifications (for login/refresh)
notificationSchema.statics.getUnreadNotifications = function(userId, limit = 50) {
  return this.find({ recipient: userId, isRead: false })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('sender', 'name email');
};

// Static method to get read notifications for cleanup (older than 30 days)
notificationSchema.statics.getOldReadNotifications = function(daysOld = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  return this.find({
    isRead: true,
    readAt: { $lt: cutoffDate }
  });
};

// Static method to mark all as read
notificationSchema.statics.markAllAsRead = function(userId) {
  return this.updateMany(
    {
      recipient: userId,
      isRead: false,
    },
    {
      isRead: true,
      readAt: new Date(),
    }
  );
};

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
