import Notification from "../models/notificationModel.js";

// Create notification
export const createNotification = async (req, res) => {
  try {
    const {
      recipient,
      recipientType,
      type,
      title,
      message,
      data,
      priority,
      channels,
      expiresAt,
    } = req.body;

    if (!recipient || !type || !title || !message) {
      return res.status(400).json({
        message: "Recipient, type, title, and message are required",
      });
    }

    const notification = await Notification.createNotification({
      recipient,
      recipientType: recipientType || "client",
      type,
      title,
      message,
      data,
      priority: priority || "medium",
      channels: channels || { inApp: true },
      expiresAt,
      createdBy: req.user?.id,
    });

    return res.status(201).json({
      message: "Notification created successfully",
      notification,
    });
  } catch (error) {
    console.error("Error creating notification:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Get user notifications
export const getUserNotifications = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const { isRead, type, priority } = req.query;
    const filter = { recipient: req.user.id };

    if (isRead !== undefined) filter.isRead = isRead === "true";
    if (type) filter.type = type;
    if (priority) filter.priority = priority;

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.getUnreadCount(req.user.id);

    return res.status(200).json({
      notifications,
      unreadCount,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return res.status(500).json({ 
      message: "Server error",
      error: error.message,
    });
  }
};

// Mark notification as read
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findOne({
      _id: id,
      recipient: req.user.id,
    });

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    await notification.markAsRead();

    return res.status(200).json({
      message: "Notification marked as read",
      notification,
    });
  } catch (error) {
    console.error("Error marking notification as read:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Mark all as read
export const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user.id, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    return res.status(200).json({
      message: "All notifications marked as read",
    });
  } catch (error) {
    console.error("Error marking all as read:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Delete notification
export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findOneAndDelete({
      _id: id,
      recipient: req.user.id,
    });

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    return res.status(200).json({
      message: "Notification deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting notification:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Get unread count
export const getUnreadCount = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const count = await Notification.getUnreadCount(req.user.id);

    return res.status(200).json({ count });
  } catch (error) {
    console.error("Error fetching unread count:", error);
    return res.status(500).json({ 
      message: "Server error",
      error: error.message,
    });
  }
};

// Helper: Send payment due notification
export const sendPaymentDueNotification = async (clientId, invoiceData) => {
  try {
    await Notification.createNotification({
      recipient: clientId,
      recipientType: "client",
      type: "payment_due",
      title: "Payment Due",
      message: `Your payment of ₹${invoiceData.totalAmount} is due on ${new Date(
        invoiceData.dueDate
      ).toLocaleDateString()}`,
      data: {
        invoiceId: invoiceData.invoiceId,
        amount: invoiceData.totalAmount,
        dueDate: invoiceData.dueDate,
        company: invoiceData.company,
      },
      priority: "high",
      channels: { inApp: true, email: true },
    });
  } catch (error) {
    console.error("Error sending payment due notification:", error.message);
  }
};

// Helper: Send payment submitted notification
export const sendPaymentSubmittedNotification = async (adminId, paymentData) => {
  try {
    await Notification.createNotification({
      recipient: adminId,
      recipientType: "admin",
      type: "payment_submitted",
      title: "New Payment Submitted",
      message: `${paymentData.clientName} has submitted a payment of ₹${paymentData.amount} for verification`,
      data: {
        paymentId: paymentData.paymentId,
        invoiceId: paymentData.invoiceId,
        amount: paymentData.amount,
        company: paymentData.company,
      },
      priority: "high",
      channels: { inApp: true, email: true },
    });
  } catch (error) {
    console.error("Error sending payment submitted notification:", error.message);
  }
};

// Helper: Send payment verified notification
export const sendPaymentVerifiedNotification = async (clientId, paymentData) => {
  try {
    await Notification.createNotification({
      recipient: clientId,
      recipientType: "client",
      type: "payment_verified",
      title: "Payment Verified",
      message: `Your payment of ₹${paymentData.amount} has been verified and your subscription is now active`,
      data: {
        paymentId: paymentData.paymentId,
        subscriptionId: paymentData.subscriptionId,
        amount: paymentData.amount,
        company: paymentData.company,
      },
      priority: "medium",
      channels: { inApp: true, email: true },
    });
  } catch (error) {
    console.error("Error sending payment verified notification:", error.message);
  }
};

// Helper: Send subscription activated notification
export const sendSubscriptionActivatedNotification = async (
  clientId,
  subscriptionData
) => {
  try {
    await Notification.createNotification({
      recipient: clientId,
      recipientType: "client",
      type: "subscription_activated",
      title: "Subscription Activated",
      message: `Your ${subscriptionData.planName} subscription has been activated`,
      data: {
        subscriptionId: subscriptionData.subscriptionId,
        planId: subscriptionData.planId,
        company: subscriptionData.company,
      },
      priority: "medium",
      channels: { inApp: true, email: true },
    });
  } catch (error) {
    console.error("Error sending subscription activated notification:", error.message);
  }
};
