/**
 * Notification Service for Work Items
 * Handles creation and sending of notifications for work item events
 */

import Notification from "../models/notificationModel.js";
import WorkItem from "../models/workItemModel.js";
import User from "../models/userModel.js";
import Project from "../models/projectModel.js";

/**
 * Create a notification
 * @param {Object} data - Notification data
 * @returns {Promise<Object>} - Created notification
 */
const createNotification = async (data) => {
  try {
    const notification = await Notification.create(data);
    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
};

/**
 * Send work item assignment notification
 * @param {Object} workItem - Work item object
 * @param {Object} assignedBy - User who assigned the work item
 */
export const notifyWorkItemAssigned = async (workItem, assignedBy) => {
  try {
    await workItem.populate("project", "name");
    await workItem.populate("assignedTo", "name email");
    
    const notification = {
      recipient: workItem.assignedTo._id,
      recipientType: "user",
      type: "work_item_assigned",
      title: "New Work Item Assigned",
      message: `You have been assigned "${workItem.title}" in project ${workItem.project.name}`,
      link: `/employee/my-work`, // Updated to existing route
      data: {
        workItemId: workItem._id,
        projectId: workItem.project._id,
        assignedBy: assignedBy._id,
      },
      createdBy: assignedBy._id,
      priority: workItem.priority === "urgent" ? "high" : "medium",
      icon: "assignment",
      color: "#3B82F6",
    };
    
    await createNotification(notification);
  } catch (error) {
    console.error("Error sending assignment notification:", error);
    // Don't throw - notifications are non-critical
  }
};

/**
 * Send due soon notification (24 hours before due date)
 * @param {Object} workItem - Work item object
 */
export const notifyWorkItemDueSoon = async (workItem) => {
  try {
    await workItem.populate("project", "name");
    await workItem.populate("assignedTo", "name email");
    
    const dueDate = new Date(workItem.dueDate);
    const formattedDate = dueDate.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    
    const notification = {
      recipient: workItem.assignedTo._id,
      recipientType: "user",
      type: "work_item_due_soon",
      title: "Work Item Due Soon",
      message: `"${workItem.title}" is due tomorrow (${formattedDate})`,
      link: `/employee/my-work`, // Updated to existing route
      data: {
        workItemId: workItem._id,
        projectId: workItem.project._id,
        dueDate: workItem.dueDate,
      },
      priority: "high",
      icon: "schedule",
      color: "#F59E0B",
    };
    
    await createNotification(notification);
  } catch (error) {
    console.error("Error sending due soon notification:", error);
  }
};

/**
 * Send overdue notification
 * @param {Object} workItem - Work item object
 */
export const notifyWorkItemOverdue = async (workItem) => {
  try {
    await workItem.populate("project", "name");
    await workItem.populate("assignedTo", "name email");
    
    const notification = {
      recipient: workItem.assignedTo._id,
      recipientType: "user",
      type: "work_item_overdue",
      title: "Work Item Overdue",
      message: `"${workItem.title}" is overdue! Please update the status.`,
      link: `/employee/my-work`, // Updated to existing route
      data: {
        workItemId: workItem._id,
        projectId: workItem.project._id,
        dueDate: workItem.dueDate,
      },
      priority: "urgent",
      icon: "warning",
      color: "#EF4444",
    };
    
    await createNotification(notification);
  } catch (error) {
    console.error("Error sending overdue notification:", error);
  }
};

/**
 * Send review requested notification (when status changes to "Review")
 * @param {Object} workItem - Work item object
 * @param {Object} changedBy - User who changed the status
 */
export const notifyReviewRequested = async (workItem, changedBy) => {
  try {
    await workItem.populate("project", "name");
    await workItem.populate("assignedTo", "name email");
    
    // Get project to find project head
    const project = await Project.findById(workItem.project._id).populate("projectHead", "name email");
    
    if (!project.projectHead) {
      return; // No project head to notify
    }
    
    const notification = {
      recipient: project.projectHead._id,
      recipientType: "user",
      type: "work_item_review_requested",
      title: "Review Requested",
      message: `${changedBy.name} has submitted "${workItem.title}" for review`,
      link: `/employee/my-work`, // Updated to existing route
      data: {
        workItemId: workItem._id,
        projectId: workItem.project._id,
        submittedBy: changedBy._id,
      },
      createdBy: changedBy._id,
      priority: "high",
      icon: "rate_review",
      color: "#8B5CF6",
    };
    
    await createNotification(notification);
  } catch (error) {
    console.error("Error sending review notification:", error);
  }
};

/**
 * Send status change notification
 * @param {Object} workItem - Work item object
 * @param {string} oldStatus - Previous status
 * @param {string} newStatus - New status
 * @param {Object} changedBy - User who changed the status
 */
export const notifyStatusChanged = async (workItem, oldStatus, newStatus, changedBy) => {
  try {
    await workItem.populate("project", "name");
    await workItem.populate("assignedTo", "name email");
    
    // Don't notify if the assignee changed their own status
    if (workItem.assignedTo._id.toString() === changedBy._id.toString()) {
      return;
    }
    
    const notification = {
      recipient: workItem.assignedTo._id,
      recipientType: "user",
      type: "work_item_status_changed",
      title: "Work Item Status Updated",
      message: `${changedBy.name} changed "${workItem.title}" status from "${oldStatus}" to "${newStatus}"`,
      link: `/employee/my-work`, // Updated to existing route
      data: {
        workItemId: workItem._id,
        projectId: workItem.project._id,
        oldStatus,
        newStatus,
        changedBy: changedBy._id,
      },
      createdBy: changedBy._id,
      priority: "medium",
      icon: "update",
      color: "#3B82F6",
    };
    
    await createNotification(notification);
  } catch (error) {
    console.error("Error sending status change notification:", error);
  }
};

/**
 * Send work item completed notification
 * @param {Object} workItem - Work item object
 */
export const notifyWorkItemCompleted = async (workItem) => {
  try {
    await workItem.populate("project", "name");
    await workItem.populate("assignedTo", "name email");
    await workItem.populate("createdBy", "name email");
    
    // Notify the creator if different from assignee
    if (workItem.createdBy._id.toString() !== workItem.assignedTo._id.toString()) {
      const notification = {
        recipient: workItem.createdBy._id,
        recipientType: "user",
        type: "work_item_completed",
        title: "Work Item Completed",
        message: `${workItem.assignedTo.name} completed "${workItem.title}"`,
        link: `/employee/my-work`, // Updated to existing route
        data: {
          workItemId: workItem._id,
          projectId: workItem.project._id,
          completedBy: workItem.assignedTo._id,
        },
        priority: "low",
        icon: "check_circle",
        color: "#10B981",
      };
      
      await createNotification(notification);
    }
  } catch (error) {
    console.error("Error sending completion notification:", error);
  }
};

/**
 * Send client won notification
 * @param {Object} client - Client object
 * @param {Object} wonBy - User who won the client
 * @param {Object} projectDetails - Project details
 */
export const notifyClientWon = async (client, wonBy, projectDetails = {}) => {
  try {
    // Notify all HR, Admin, and SuperAdmin users
    const recipients = await User.find({
      role: { $in: ['hr', 'admin', 'superadmin'] }
    });

    const notifications = recipients.map(recipient => ({
      recipient: recipient._id,
      recipientType: "user",
      type: "client_won",
      title: "🎉 New Client Won!",
      message: `${wonBy.name} successfully won ${client.name}${projectDetails.value ? ` worth ₹${projectDetails.value}` : ''}`,
      link: `/clients`, // Updated to existing route
      data: {
        clientId: client._id,
        wonBy: wonBy._id,
        projectValue: projectDetails.value,
        projectName: projectDetails.name,
      },
      createdBy: wonBy._id,
      priority: "high",
      icon: "celebration",
      color: "#10B981",
    }));

    // Create all notifications
    await Promise.all(notifications.map(notif => createNotification(notif)));
  } catch (error) {
    console.error("Error sending client won notification:", error);
  }
};

/**
 * Send new project notification
 * @param {Object} project - Project object
 * @param {Object} createdBy - User who created the project
 */
export const notifyNewProject = async (project, createdBy) => {
  try {
    await project.populate("client", "name");
    await project.populate("projectHead", "name email");
    await project.populate("teamMembers", "name email");

    const notifications = [];

    // Notify project head if different from creator
    if (project.projectHead && project.projectHead._id.toString() !== createdBy._id.toString()) {
      notifications.push({
        recipient: project.projectHead._id,
        recipientType: "user",
        type: "new_project",
        title: "New Project Assignment",
        message: `You've been assigned as project head for "${project.name}" (${project.client.name})`,
        link: `/projects/${project._id}`,
        data: {
          projectId: project._id,
          clientId: project.client._id,
          assignedBy: createdBy._id,
        },
        createdBy: createdBy._id,
        priority: "high",
        icon: "rocket_launch",
        color: "#3B82F6",
      });
    }

    // Notify team members
    if (project.teamMembers && project.teamMembers.length > 0) {
      project.teamMembers.forEach(member => {
        if (member._id.toString() !== createdBy._id.toString()) {
          notifications.push({
            recipient: member._id,
            recipientType: "user",
            type: "new_project",
            title: "Added to New Project",
            message: `You've been added to project "${project.name}" (${project.client.name})`,
            link: `/projects/${project._id}`,
            data: {
              projectId: project._id,
              clientId: project.client._id,
              assignedBy: createdBy._id,
            },
            createdBy: createdBy._id,
            priority: "medium",
            icon: "group_add",
            color: "#8B5CF6",
          });
        }
      });
    }

    // Create all notifications
    await Promise.all(notifications.map(notif => createNotification(notif)));
  } catch (error) {
    console.error("Error sending new project notification:", error);
  }
};

/**
 * Send payment received notification
 * @param {Object} payment - Payment object
 * @param {Object} client - Client object
 */
export const notifyPaymentReceived = async (payment, client) => {
  try {
    // Notify accounts and admin users
    const recipients = await User.find({
      role: { $in: ['accounts', 'admin', 'superadmin'] }
    });

    const notifications = recipients.map(recipient => ({
      recipient: recipient._id,
      recipientType: "user",
      type: "payment_received",
      title: "💰 Payment Received",
      message: `Payment of ₹${payment.amount} received from ${client.name}`,
      link: `/admin/payments/${payment._id}`,
      data: {
        paymentId: payment._id,
        clientId: client._id,
        amount: payment.amount,
      },
      priority: "medium",
      icon: "payments",
      color: "#10B981",
    }));

    await Promise.all(notifications.map(notif => createNotification(notif)));
  } catch (error) {
    console.error("Error sending payment received notification:", error);
  }
};

/**
 * Send leave approved notification
 * @param {Object} leave - Leave object
 * @param {Object} approvedBy - User who approved the leave
 */
export const notifyLeaveApproved = async (leave, approvedBy) => {
  try {
    await leave.populate("employee", "name email");

    const notification = {
      recipient: leave.employee._id,
      recipientType: "user",
      type: "leave_approved",
      title: "✅ Leave Approved",
      message: `Your ${leave.leaveType} leave from ${new Date(leave.startDate).toLocaleDateString()} to ${new Date(leave.endDate).toLocaleDateString()} has been approved`,
      link: `/employee/leaves`,
      data: {
        leaveId: leave._id,
        approvedBy: approvedBy._id,
        startDate: leave.startDate,
        endDate: leave.endDate,
      },
      createdBy: approvedBy._id,
      priority: "medium",
      icon: "check_circle",
      color: "#10B981",
    };

    await createNotification(notification);
  } catch (error) {
    console.error("Error sending leave approved notification:", error);
  }
};

/**
 * Send leave rejected notification
 * @param {Object} leave - Leave object
 * @param {Object} rejectedBy - User who rejected the leave
 * @param {string} reason - Rejection reason
 */
export const notifyLeaveRejected = async (leave, rejectedBy, reason = '') => {
  try {
    await leave.populate("employee", "name email");

    const notification = {
      recipient: leave.employee._id,
      recipientType: "user",
      type: "leave_rejected",
      title: "❌ Leave Rejected",
      message: `Your ${leave.leaveType} leave request has been rejected${reason ? `: ${reason}` : ''}`,
      link: `/employee/leaves`,
      data: {
        leaveId: leave._id,
        rejectedBy: rejectedBy._id,
        reason: reason,
      },
      createdBy: rejectedBy._id,
      priority: "high",
      icon: "cancel",
      color: "#EF4444",
    };

    await createNotification(notification);
  } catch (error) {
    console.error("Error sending leave rejected notification:", error);
  }
};

/**
 * Send comment notification
 * @param {Object} workItem - Work item object
 * @param {Object} comment - Comment object
 * @param {Object} commentedBy - User who commented
 */
export const notifyWorkItemCommented = async (workItem, comment, commentedBy) => {
  try {
    await workItem.populate("project", "name");
    await workItem.populate("assignedTo", "name email");
    
    // Notify assignee if they didn't comment
    if (workItem.assignedTo._id.toString() !== commentedBy._id.toString()) {
      const notification = {
        recipient: workItem.assignedTo._id,
        recipientType: "user",
        type: "work_item_commented",
        title: "New Comment",
        message: `${commentedBy.name} commented on "${workItem.title}"`,
        link: `/employee/my-work`, // Updated to existing route
        data: {
          workItemId: workItem._id,
          projectId: workItem.project._id,
          commentId: comment._id,
          commentedBy: commentedBy._id,
        },
        createdBy: commentedBy._id,
        priority: "low",
        icon: "comment",
        color: "#6B7280",
      };
      
      await createNotification(notification);
    }
  } catch (error) {
    console.error("Error sending comment notification:", error);
  }
};

/**
 * Batch check for due soon work items (run daily via cron)
 */
export const checkDueSoonWorkItems = async () => {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
    
    // Find work items due tomorrow that are not done
    const dueSoonItems = await WorkItem.find({
      status: { $ne: "Done" },
      dueDate: {
        $gte: tomorrow,
        $lt: dayAfterTomorrow,
      },
    });
    
    console.log(`Found ${dueSoonItems.length} work items due soon`);
    
    // Send notifications
    for (const item of dueSoonItems) {
      await notifyWorkItemDueSoon(item);
    }
    
    return dueSoonItems.length;
  } catch (error) {
    console.error("Error checking due soon work items:", error);
    throw error;
  }
};

/**
 * Batch check for overdue work items (run daily via cron)
 */
export const checkOverdueWorkItems = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Find work items that are overdue and not done
    const overdueItems = await WorkItem.find({
      status: { $ne: "Done" },
      dueDate: { $lt: today },
    });
    
    console.log(`Found ${overdueItems.length} overdue work items`);
    
    // Send notifications
    for (const item of overdueItems) {
      await notifyWorkItemOverdue(item);
    }
    
    return overdueItems.length;
  } catch (error) {
    console.error("Error checking overdue work items:", error);
    throw error;
  }
};

export default {
  notifyWorkItemAssigned,
  notifyWorkItemDueSoon,
  notifyWorkItemOverdue,
  notifyReviewRequested,
  notifyStatusChanged,
  notifyWorkItemCompleted,
  notifyWorkItemCommented,
  notifyClientWon,
  notifyNewProject,
  notifyPaymentReceived,
  notifyLeaveApproved,
  notifyLeaveRejected,
  checkDueSoonWorkItems,
  checkOverdueWorkItems,
};
