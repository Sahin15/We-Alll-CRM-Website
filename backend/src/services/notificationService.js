import admin from '../config/firebase.js';
import User from '../models/userModel.js';

class NotificationService {
  
  // Send notification to a single user
  async sendToUser(userId, notification) {
    try {
      const user = await User.findById(userId);
      if (!user || !user.fcmToken) {
        console.log(`No FCM token found for user: ${userId}`);
        return { success: false, error: 'No FCM token' };
      }

      const message = {
        token: user.fcmToken,
        notification: {
          title: notification.title,
          body: notification.body,
          icon: notification.icon || '/favicon.ico'
        },
        data: {
          ...notification.data,
          clickAction: notification.clickAction || '/',
          timestamp: new Date().toISOString()
        },
        webpush: {
          headers: {
            Urgency: notification.priority || 'normal'
          },
          notification: {
            title: notification.title,
            body: notification.body,
            icon: notification.icon || '/favicon.ico',
            badge: '/badge-icon.png',
            tag: notification.tag || 'general',
            requireInteraction: notification.requireInteraction || false,
            actions: notification.actions || []
          }
        }
      };

      const response = await admin.messaging().send(message);
      console.log('✅ Notification sent successfully:', response);
      
      // Log notification in database (optional)
      await this.logNotification(userId, notification, 'sent');
      
      return { success: true, messageId: response };
    } catch (error) {
      console.error('❌ Error sending notification:', error);
      await this.logNotification(userId, notification, 'failed', error.message);
      return { success: false, error: error.message };
    }
  }

  // Send notification to multiple users
  async sendToMultipleUsers(userIds, notification) {
    try {
      const users = await User.find({ 
        _id: { $in: userIds }, 
        fcmToken: { $exists: true, $ne: null } 
      });

      if (users.length === 0) {
        return { success: false, error: 'No users with FCM tokens found' };
      }

      const tokens = users.map(user => user.fcmToken);
      
      const message = {
        tokens: tokens,
        notification: {
          title: notification.title,
          body: notification.body,
          icon: notification.icon || '/favicon.ico'
        },
        data: {
          ...notification.data,
          clickAction: notification.clickAction || '/',
          timestamp: new Date().toISOString()
        },
        webpush: {
          notification: {
            title: notification.title,
            body: notification.body,
            icon: notification.icon || '/favicon.ico',
            badge: '/badge-icon.png',
            tag: notification.tag || 'general'
          }
        }
      };

      const response = await admin.messaging().sendMulticast(message);
      console.log(`✅ Sent ${response.successCount} notifications, ${response.failureCount} failed`);
      
      // Log notifications
      for (const user of users) {
        await this.logNotification(user._id, notification, 'sent');
      }
      
      return { 
        success: true, 
        successCount: response.successCount,
        failureCount: response.failureCount,
        responses: response.responses
      };
    } catch (error) {
      console.error('❌ Error sending bulk notifications:', error);
      return { success: false, error: error.message };
    }
  }

  // Send notification to users by role
  async sendToRole(roles, notification) {
    try {
      const users = await User.find({ 
        role: { $in: Array.isArray(roles) ? roles : [roles] },
        fcmToken: { $exists: true, $ne: null }
      });

      const userIds = users.map(user => user._id);
      return await this.sendToMultipleUsers(userIds, notification);
    } catch (error) {
      console.error('❌ Error sending role-based notifications:', error);
      return { success: false, error: error.message };
    }
  }

  // Send notification to department
  async sendToDepartment(departmentId, notification) {
    try {
      const users = await User.find({ 
        department: departmentId,
        fcmToken: { $exists: true, $ne: null }
      });

      const userIds = users.map(user => user._id);
      return await this.sendToMultipleUsers(userIds, notification);
    } catch (error) {
      console.error('❌ Error sending department notifications:', error);
      return { success: false, error: error.message };
    }
  }

  // Predefined notification templates
  async sendLeaveRequestNotification(managerId, employeeName, leaveType) {
    return await this.sendToUser(managerId, {
      title: '📋 New Leave Request',
      body: `${employeeName} has requested ${leaveType} leave`,
      icon: '/icons/leave-icon.png',
      tag: 'leave-request',
      clickAction: '/leaves',
      data: {
        type: 'leave_request',
        action: 'view_leaves'
      }
    });
  }

  async sendSalarySlipNotification(userId, month, year) {
    return await this.sendToUser(userId, {
      title: '💰 Salary Slip Generated',
      body: `Your salary slip for ${month}/${year} is ready`,
      icon: '/icons/salary-icon.png',
      tag: 'salary-slip',
      clickAction: '/salary-slips',
      data: {
        type: 'salary_slip',
        month: month.toString(),
        year: year.toString()
      }
    });
  }

  async sendMeetingReminderNotification(userId, meetingTitle, time) {
    return await this.sendToUser(userId, {
      title: '🕐 Meeting Reminder',
      body: `"${meetingTitle}" starts in 15 minutes`,
      icon: '/icons/meeting-icon.png',
      tag: 'meeting-reminder',
      requireInteraction: true,
      clickAction: '/meetings',
      data: {
        type: 'meeting_reminder',
        time: time
      }
    });
  }

  async sendAnnouncementNotification(userIds, title, message) {
    return await this.sendToMultipleUsers(userIds, {
      title: '📢 New Announcement',
      body: message,
      icon: '/icons/announcement-icon.png',
      tag: 'announcement',
      clickAction: '/announcements',
      data: {
        type: 'announcement',
        announcementTitle: title
      }
    });
  }

  // Work item notification templates
  async sendWorkItemAssignedNotification(userId, workItemTitle, assignedBy) {
    return await this.sendToUser(userId, {
      title: '📋 New Work Item Assigned',
      body: `You have been assigned: ${workItemTitle}`,
      icon: '/icons/work-item-icon.png',
      tag: 'work-item-assigned',
      clickAction: '/work-items',
      data: {
        type: 'work_item_assigned',
        workItemTitle: workItemTitle,
        assignedBy: assignedBy
      }
    });
  }

  async sendReviewRequestedNotification(userId, workItemTitle, requestedBy) {
    return await this.sendToUser(userId, {
      title: '👀 Review Requested',
      body: `Review requested for: ${workItemTitle}`,
      icon: '/icons/review-icon.png',
      tag: 'review-requested',
      clickAction: '/work-items',
      requireInteraction: true,
      data: {
        type: 'review_requested',
        workItemTitle: workItemTitle,
        requestedBy: requestedBy
      }
    });
  }

  async sendStatusChangedNotification(userId, workItemTitle, oldStatus, newStatus) {
    return await this.sendToUser(userId, {
      title: '🔄 Status Updated',
      body: `${workItemTitle} changed from ${oldStatus} to ${newStatus}`,
      icon: '/icons/status-icon.png',
      tag: 'status-changed',
      clickAction: '/work-items',
      data: {
        type: 'status_changed',
        workItemTitle: workItemTitle,
        oldStatus: oldStatus,
        newStatus: newStatus
      }
    });
  }

  async sendWorkItemCompletedNotification(userId, workItemTitle, completedBy) {
    return await this.sendToUser(userId, {
      title: '✅ Work Item Completed',
      body: `${workItemTitle} has been completed`,
      icon: '/icons/completed-icon.png',
      tag: 'work-item-completed',
      clickAction: '/work-items',
      data: {
        type: 'work_item_completed',
        workItemTitle: workItemTitle,
        completedBy: completedBy
      }
    });
  }

  async sendWorkItemCommentedNotification(userId, workItemTitle, commenterName, comment) {
    return await this.sendToUser(userId, {
      title: '💬 New Comment',
      body: `${commenterName} commented on ${workItemTitle}`,
      icon: '/icons/comment-icon.png',
      tag: 'work-item-comment',
      clickAction: '/work-items',
      data: {
        type: 'work_item_comment',
        workItemTitle: workItemTitle,
        commenterName: commenterName,
        comment: comment.substring(0, 100)
      }
    });
  }

  // Log notification for audit trail
  async logNotification(userId, notification, status, error = null) {
    try {
      // You can create a NotificationLog model to store this data
      console.log('Notification Log:', {
        userId,
        title: notification.title,
        status,
        timestamp: new Date(),
        error
      });
    } catch (error) {
      console.error('Error logging notification:', error);
    }
  }

  // Subscribe user to topic
  async subscribeToTopic(fcmToken, topic) {
    try {
      await admin.messaging().subscribeToTopic([fcmToken], topic);
      console.log(`✅ Subscribed to topic: ${topic}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Error subscribing to topic:', error);
      return { success: false, error: error.message };
    }
  }

  // Unsubscribe user from topic
  async unsubscribeFromTopic(fcmToken, topic) {
    try {
      await admin.messaging().unsubscribeFromTopic([fcmToken], topic);
      console.log(`✅ Unsubscribed from topic: ${topic}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Error unsubscribing from topic:', error);
      return { success: false, error: error.message };
    }
  }
}

const notificationServiceInstance = new NotificationService();

// Export individual methods for backward compatibility
export const sendToUser = notificationServiceInstance.sendToUser.bind(notificationServiceInstance);
export const sendToMultipleUsers = notificationServiceInstance.sendToMultipleUsers.bind(notificationServiceInstance);
export const sendToRole = notificationServiceInstance.sendToRole.bind(notificationServiceInstance);
export const sendToDepartment = notificationServiceInstance.sendToDepartment.bind(notificationServiceInstance);
export const sendLeaveRequestNotification = notificationServiceInstance.sendLeaveRequestNotification.bind(notificationServiceInstance);
export const sendSalarySlipNotification = notificationServiceInstance.sendSalarySlipNotification.bind(notificationServiceInstance);
export const sendMeetingReminderNotification = notificationServiceInstance.sendMeetingReminderNotification.bind(notificationServiceInstance);
export const sendAnnouncementNotification = notificationServiceInstance.sendAnnouncementNotification.bind(notificationServiceInstance);
export const sendWorkItemAssignedNotification = notificationServiceInstance.sendWorkItemAssignedNotification.bind(notificationServiceInstance);
export const sendReviewRequestedNotification = notificationServiceInstance.sendReviewRequestedNotification.bind(notificationServiceInstance);
export const sendStatusChangedNotification = notificationServiceInstance.sendStatusChangedNotification.bind(notificationServiceInstance);
export const sendWorkItemCompletedNotification = notificationServiceInstance.sendWorkItemCompletedNotification.bind(notificationServiceInstance);
export const sendWorkItemCommentedNotification = notificationServiceInstance.sendWorkItemCommentedNotification.bind(notificationServiceInstance);
export const subscribeToTopic = notificationServiceInstance.subscribeToTopic.bind(notificationServiceInstance);
export const unsubscribeFromTopic = notificationServiceInstance.unsubscribeFromTopic.bind(notificationServiceInstance);

// Alias for backward compatibility
export const notifyReviewRequested = notificationServiceInstance.sendReviewRequestedNotification.bind(notificationServiceInstance);

export default notificationServiceInstance;