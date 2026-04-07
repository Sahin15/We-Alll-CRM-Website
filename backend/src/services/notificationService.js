import Notification from '../models/notificationModel.js';
import FCMToken from '../models/fcmTokenModel.js';
import User from '../models/userModel.js';

class NotificationService {
  /**
   * Send notification to a single user
   */
  static async sendToUser(userId, title, body, options = {}) {
    try {
      // Import Firebase dynamically to ensure it's initialized
      const { messaging, firebaseInitialized } = await import('../config/firebaseAdmin.js');
      
      const {
        type = 'general',
        data = {},
        actionUrl = null,
        icon = null,
        badge = null,
        tag = null,
        priority = 'normal',
        senderId = null,
      } = options;

      console.log('[NotificationService] ========== SEND NOTIFICATION START ==========');
      console.log('[NotificationService] Recipient:', userId);
      console.log('[NotificationService] Title:', title);
      console.log('[NotificationService] Body:', body);
      console.log('[NotificationService] Firebase initialized:', firebaseInitialized);
      console.log('[NotificationService] Messaging available:', !!messaging);

      // Get active FCM tokens for user
      const tokens = await FCMToken.getActiveTokens(userId);
      const tokenList = tokens.map(t => t.token);

      console.log('[NotificationService] Found tokens:', tokenList.length);
      if (tokenList.length > 0) {
        console.log('[NotificationService] Token preview:', tokenList[0].substring(0, 50) + '...');
      }

      if (tokenList.length === 0) {
        console.log('[NotificationService] ⚠️  No active tokens for user:', userId);
      } else {
        console.log('[NotificationService] ✅ Found', tokenList.length, 'active tokens for user:', userId);
      }

      // Create notification record in database
      const notification = new Notification({
        recipient: userId,
        sender: senderId,
        title,
        body,
        type,
        data,
        actionUrl,
        icon,
        badge,
        tag,
        priority,
      });

      await notification.save();
      console.log('[NotificationService] ✅ Notification saved to database:', notification._id);

      // Send via Firebase Cloud Messaging if tokens exist
      if (tokenList.length > 0) {
        if (!messaging) {
          console.error('[NotificationService] ❌ Firebase messaging is NULL - notifications will not be sent');
          console.error('[NotificationService] Firebase initialized:', firebaseInitialized);
          console.error('[NotificationService] This means Firebase Admin SDK failed to initialize');
          return notification;
        }

        if (!firebaseInitialized) {
          console.error('[NotificationService] ❌ Firebase not properly initialized (firebaseInitialized = false)');
          return notification;
        }
        
        console.log('[NotificationService] ✅ Firebase messaging is ready, proceeding with FCM send');
        // FCM data payload — ALL values MUST be strings (FCM requirement)
        const rawData = { ...data, notificationId: notification._id.toString(), type };
        if (actionUrl) rawData.actionUrl = actionUrl;
        const fcmData = {};
        for (const [k, v] of Object.entries(rawData)) {
          fcmData[k] = (v === null || v === undefined) ? '' : String(v);
        }

        const message = {
          notification: {
            title,
            body,
            ...(icon && { icon }),
          },
          data: fcmData,
          // webpush — required for Chrome/Edge desktop OS push (Windows/Mac/Linux)
          webpush: {
            headers: {
              'TTL': '86400', // 24 hours
            },
            notification: {
              title,
              body,
              icon: icon || '/favicon.ico',
              badge: '/favicon.ico',
              tag: tag || type || 'notification',
              requireInteraction: true, // Windows: keep notification visible
              vibrate: [200, 100, 200],
              actions: [
                { action: 'open', title: 'Open' },
                { action: 'dismiss', title: 'Dismiss' },
              ],
              timestamp: Date.now(),
              dir: 'auto',
              silent: false,
              sound: '/notification-sound.mp3', // Play notification sound
            },
            fcmOptions: {
              link: actionUrl || '/',
              analyticsLabel: type || 'notification',
            },
            data: fcmData,
          },
          // android — required for Android push notifications
          android: {
            notification: {
              title,
              body,
              icon: 'notification_icon',
              color: '#4f46e5',
              sound: 'default',
              channelId: 'crm_notifications',
              priority: priority === 'high' ? 'high' : 'default',
              clickAction: 'FLUTTER_NOTIFICATION_CLICK',
            },
            priority: priority === 'high' ? 'high' : 'normal',
          },
        };

        try {
          console.log('[NotificationService] Sending FCM message to', tokenList.length, 'tokens');
          console.log('[NotificationService] Message structure:', {
            hasNotification: !!message.notification,
            hasWebpush: !!message.webpush,
            hasAndroid: !!message.android,
            hasApns: !!message.apns,
            dataKeys: Object.keys(fcmData),
          });
          
          console.log('[NotificationService] Calling messaging.sendEachForMulticast()...');
          const response = await messaging.sendEachForMulticast({
            tokens: tokenList,
            ...message,
          });

          console.log('[NotificationService] ✅ FCM response received');
          console.log('[NotificationService] Success:', response.successCount);
          console.log('[NotificationService] Failed:', response.failureCount);
          console.log('[NotificationService] ========== SEND NOTIFICATION END ==========');

          // Handle failed tokens
          if (response.failureCount > 0) {
            console.log('[NotificationService] Processing failed tokens...');
            response.responses.forEach((resp, idx) => {
              if (!resp.success) {
                console.warn('[NotificationService] ⚠️  Token failed:', resp.error?.code, resp.error?.message);
                // Optionally deactivate failed token
                if (resp.error.code === 'messaging/invalid-registration-token' ||
                    resp.error.code === 'messaging/registration-token-not-registered') {
                  FCMToken.updateOne(
                    { token: tokenList[idx] },
                    { isActive: false }
                  ).catch(err => {
                    console.error('[NotificationService] Error deactivating token:', err.message);
                  });
                }
              }
            });
          }
        } catch (error) {
          console.error('[NotificationService] ❌ FCM send error:', error.message);
          console.error('[NotificationService] Error code:', error.code);
          console.error('[NotificationService] Error details:', error);
          console.error('[NotificationService] ========== SEND NOTIFICATION END (ERROR) ==========');
        }
      }

      return notification;
    } catch (error) {
      
      throw error;
    }
  }

  /**
   * Send notification to multiple users
   */
  static async sendToMultiple(userIds, title, body, options = {}) {
    try {
      const results = [];
      for (const userId of userIds) {
        const notification = await this.sendToUser(userId, title, body, options);
        results.push(notification);
      }
      return results;
    } catch (error) {
      
      throw error;
    }
  }

  /**
   * Send notification to all users with a specific role
   */
  static async sendToRole(role, title, body, options = {}) {
    try {
      const users = await User.find({ role }).select('_id');
      const userIds = users.map(u => u._id);
      return this.sendToMultiple(userIds, title, body, options);
    } catch (error) {
      
      throw error;
    }
  }

  /**
   * Send notification to all users
   */
  static async sendToAll(title, body, options = {}) {
    try {
      const users = await User.find().select('_id');
      const userIds = users.map(u => u._id);
      return this.sendToMultiple(userIds, title, body, options);
    } catch (error) {
      
      throw error;
    }
  }

  /**
   * Send notification to department
   */
  static async sendToDepartment(departmentId, title, body, options = {}) {
    try {
      const users = await User.find({ department: departmentId }).select('_id');
      const userIds = users.map(u => u._id);
      return this.sendToMultiple(userIds, title, body, options);
    } catch (error) {
      
      throw error;
    }
  }

  /**
   * Register FCM token for user
   */
  static async registerToken(userId, token, deviceName = 'Unknown Device', deviceType = 'web') {
    try {
      console.log('[NotificationService] Registering token for user:', userId);
      
      // Check if token already exists
      let fcmToken = await FCMToken.findOne({ token });

      if (fcmToken) {
        // Update existing token
        console.log('[NotificationService] Token already exists, updating...');
        fcmToken.user = userId;
        fcmToken.isActive = true;
        fcmToken.lastUsed = new Date();
        fcmToken.deviceName = deviceName;
        fcmToken.deviceType = deviceType;
        await fcmToken.save();
        console.log('[NotificationService] ✅ Token updated');
      } else {
        // Create new token
        console.log('[NotificationService] Creating new token');
        fcmToken = new FCMToken({
          user: userId,
          token,
          deviceName,
          deviceType,
        });
        await fcmToken.save();
        console.log('[NotificationService] ✅ Token created');
      }

      // Deactivate other tokens (keep only latest 5 tokens per user)
      const userTokens = await FCMToken.find({ user: userId, isActive: true })
        .sort({ lastUsed: -1 })
        .limit(5);

      if (userTokens.length > 5) {
        const tokensToDeactivate = userTokens.slice(5).map(t => t._id);
        await FCMToken.updateMany(
          { _id: { $in: tokensToDeactivate } },
          { isActive: false }
        );
        console.log('[NotificationService] Deactivated', tokensToDeactivate.length, 'old tokens');
      }

      return fcmToken;
    } catch (error) {
      console.error('[NotificationService] ❌ Error registering token:', error.message);
      throw error;
    }
  }

  /**
   * Get user notifications
   */
  static async getUserNotifications(userId, limit = 20, skip = 0) {
    try {
      const notifications = await Notification.getUserNotifications(userId, limit, skip);
      const unreadCount = await Notification.getUnreadCount(userId);
      return { notifications, unreadCount };
    } catch (error) {
      
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId, userId) {
    try {
      console.log('[NotificationService] ========== MARK AS READ START ==========');
      console.log('[NotificationService] Notification ID:', notificationId);
      console.log('[NotificationService] User ID:', userId);

      const notification = await Notification.findOne({
        _id: notificationId,
        recipient: userId,
      });

      console.log('[NotificationService] Notification found:', !!notification);

      if (!notification) {
        console.error('[NotificationService] ❌ Notification not found');
        throw new Error('Notification not found');
      }

      console.log('[NotificationService] Current isRead status:', notification.isRead);
      await notification.markAsRead();
      console.log('[NotificationService] ✅ Notification marked as read');
      console.log('[NotificationService] New isRead status:', notification.isRead);
      console.log('[NotificationService] ========== MARK AS READ END ==========');
      
      return notification;
    } catch (error) {
      console.error('[NotificationService] ❌ Error in markAsRead:', error.message);
      console.error('[NotificationService] Error stack:', error.stack);
      throw error;
    }
  }

  /**
   * Mark all notifications as read
   */
  static async markAllAsRead(userId) {
    try {
      const result = await Notification.markAllAsRead(userId);
      return result;
    } catch (error) {
      
      throw error;
    }
  }

  /**
   * Delete notification
   */
  static async deleteNotification(notificationId, userId) {
    try {
      const result = await Notification.deleteOne({
        _id: notificationId,
        recipient: userId,
      });

      if (result.deletedCount === 0) {
        throw new Error('Notification not found');
      }

      return result;
    } catch (error) {
      
      throw error;
    }
  }

  /**
   * Delete all notifications for user
   */
  static async deleteAllNotifications(userId) {
    try {
      const result = await Notification.deleteMany({ recipient: userId });
      return result;
    } catch (error) {
      
      throw error;
    }
  }

  /**
   * Send follow-up reminder notification
   */
  static async sendFollowUpReminder(userId, followUpType, leadName, scheduledDate) {
    try {
      const title = `Follow-up Reminder: ${followUpType}`;
      const body = `Scheduled for ${leadName} on ${new Date(scheduledDate).toLocaleDateString()}`;
      
      return this.sendToUser(userId, title, body, {
        type: 'follow_up_reminder',
        data: { followUpType, leadName, scheduledDate },
        actionUrl: '/leads',
      });
    } catch (error) {
      console.error('[NotificationService] Error sending follow-up reminder:', error.message);
      throw error;
    }
  }

  /**
   * Send work item comment notification
   */
  static async sendWorkItemCommentedNotification(userId, itemTitle, commenterName, commentText) {
    try {
      const title = `New Comment on ${itemTitle}`;
      const body = `${commenterName}: ${commentText.substring(0, 50)}${commentText.length > 50 ? '...' : ''}`;
      
      return this.sendToUser(userId, title, body, {
        type: 'work_commented',
        data: { itemTitle, commenterName },
        actionUrl: '/work-items',
      });
    } catch (error) {
      console.error('[NotificationService] Error sending comment notification:', error.message);
      throw error;
    }
  }

  /**
   * Send mention notification
   */
  static async sendMentionNotification(userId, itemTitle, mentionerName, commentText) {
    try {
      const title = `You were mentioned in ${itemTitle}`;
      const body = `${mentionerName} mentioned you: ${commentText.substring(0, 50)}${commentText.length > 50 ? '...' : ''}`;
      
      return this.sendToUser(userId, title, body, {
        type: 'mention_notification',
        data: { itemTitle, mentionerName },
        actionUrl: '/work-items',
      });
    } catch (error) {
      console.error('[NotificationService] Error sending mention notification:', error.message);
      throw error;
    }
  }
}

export default NotificationService;
