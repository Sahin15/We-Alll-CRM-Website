import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import api from './api';
import toast from '../utils/toast';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA10c-WeEJTJNq8eCUgFuw1SVqtadRLP20",
  authDomain: "we-alll-office.firebaseapp.com",
  projectId: "we-alll-office",
  storageBucket: "we-alll-office.firebasestorage.app",
  messagingSenderId: "1039568040557",
  appId: "1:1039568040557:web:da336859b30c4073b78564",
  measurementId: "G-6120L1866E"
};

// VAPID Key for push notifications
const VAPID_KEY = "BMs-lW78BILD1_zH8LnF3Ka3RQyQZr-89U8HphMqdBGPcLBekJ66LQvPYQMRRvQnQSrisJ2P2KfCydvWfB7a9Ps";

// Initialize Firebase - wrapped to prevent blocking on iOS
let app, messaging;
let firebaseInitialized = false;

try {
  // Check if Firebase is supported (iOS Safari has limited support)
  if (typeof window !== 'undefined' && 'indexedDB' in window) {
    app = initializeApp(firebaseConfig);
    messaging = getMessaging(app);
    firebaseInitialized = true;
    console.log('✅ Firebase initialized successfully');
  } else {
    console.warn('⚠️ Firebase not supported in this browser');
  }
} catch (error) {
  console.error('❌ Firebase initialization failed:', error);
  // Don't throw - allow app to continue without Firebase
  firebaseInitialized = false;
}

class NotificationService {
  constructor() {
    this.isSupported = firebaseInitialized && 'serviceWorker' in navigator && 'Notification' in window && messaging;
    this.permission = typeof Notification !== 'undefined' ? Notification.permission : 'denied';
    this.fcmToken = null;
    this.isInitialized = false;
  }

  // Check if notifications are supported
  isNotificationSupported() {
    return this.isSupported;
  }

  // Request notification permission
  async requestPermission() {
    if (!this.isSupported) {
      throw new Error('Notifications are not supported in this browser');
    }

    const permission = await Notification.requestPermission();
    this.permission = permission;
    
    if (permission === 'granted') {
      await this.initializeMessaging();
      return true;
    } else if (permission === 'denied') {
      toast.error('Notifications are disabled. Enable them in browser settings for better experience.');
      return false;
    } else {
      return false;
    }
  }

  // Initialize Firebase messaging
  async initializeMessaging() {
    try {
      if (!firebaseInitialized || !messaging) {
        console.warn('Firebase not initialized, skipping messaging setup');
        return false;
      }

      // Check if service worker is supported (iOS Safari has limited support)
      if (!('serviceWorker' in navigator)) {
        console.warn('Service Worker not supported');
        return false;
      }

      // Prevent multiple initializations
      if (this.isInitialized && this.fcmToken) {
        return this.fcmToken;
      }

      // Register service worker
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        
        // Wait for service worker to be ready
        await navigator.serviceWorker.ready;
      }

      // Get FCM token
      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY
      });

      if (token) {
        this.fcmToken = token;
        this.isInitialized = true;
        await this.updateFCMToken(token);
        this.setupForegroundListener();
        this.setupServiceWorkerListener();
        return token;
      } else {
        console.warn('No FCM registration token available');
        return null;
      }
    } catch (error) {
      console.error('❌ Error initializing messaging:', error);
      throw error;
    }
  }

  // Update FCM token on server
  async updateFCMToken(token) {
    try {
      await api.post('/notifications/fcm-token', { fcmToken: token });
    } catch (error) {
      console.error('❌ Error updating FCM token:', error);
    }
  }

  // Setup foreground message listener
  setupForegroundListener() {
    onMessage(messaging, (payload) => {
      const { title, body, icon } = payload.notification || {};
      
      // Show custom toast notification
      toast.info(`${title}: ${body}`, {
        autoClose: 5000,
        onClick: () => {
          if (payload.data?.clickAction) {
            window.location.href = payload.data.clickAction;
          }
        }
      });

      // Show browser notification if page is not focused
      if (document.hidden) {
        this.showBrowserNotification(title, body, icon, payload.data);
      }
    });
  }

  // Setup service worker message listener
  setupServiceWorkerListener() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'NOTIFICATION_CLICK') {
          // Handle notification click navigation
          const url = event.data.url;
          if (url && url !== window.location.pathname) {
            window.location.href = url;
          }
        }
      });
    }
  }

  // Show browser notification
  showBrowserNotification(title, body, icon, data) {
    if (this.permission === 'granted') {
      const notification = new Notification(title, {
        body,
        icon: icon || '/favicon.ico',
        badge: '/badge-icon.png',
        tag: data?.tag || 'general',
        data: data
      });

      notification.onclick = () => {
        window.focus();
        if (data?.clickAction) {
          window.location.href = data.clickAction;
        }
        notification.close();
      };

      // Auto close after 5 seconds
      setTimeout(() => notification.close(), 5000);
    }
  }

  // Send test notification (Admin only)
  async sendTestNotification(userId, title, body) {
    try {
      const response = await api.post('/notifications/test', {
        userId,
        title,
        body
      });
      return response.data;
    } catch (error) {
      console.error('Error sending test notification:', error);
      throw error;
    }
  }

  // Update notification preferences
  async updatePreferences(preferences) {
    try {
      await api.put('/notifications/preferences', {
        notificationPreferences: preferences
      });
      toast.success('Notification preferences updated');
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast.error('Failed to update notification preferences');
      throw error;
    }
  }

  // Get notification preferences
  async getPreferences() {
    try {
      const response = await api.get('/notifications/preferences');
      return response.data;
    } catch (error) {
      console.error('Error fetching preferences:', error);
      throw error;
    }
  }

  // Check permission status
  getPermissionStatus() {
    return this.permission;
  }

  // Get current FCM token
  getFCMToken() {
    return this.fcmToken;
  }

  // Check if service is initialized
  isServiceInitialized() {
    return this.isInitialized;
  }

  // Show permission prompt with custom UI
  showPermissionPrompt() {
    return new Promise((resolve) => {
      // Check if already granted
      if (this.permission === 'granted') {
        resolve(true);
        return;
      }

      const modal = document.createElement('div');
      modal.innerHTML = `
        <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <div style="background: white; padding: 2rem; border-radius: 12px; max-width: 400px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.1);">
            <div style="font-size: 3rem; margin-bottom: 1rem;">🔔</div>
            <h3 style="margin: 0 0 1rem 0; color: #333;">Enable Notifications</h3>
            <p style="color: #666; margin-bottom: 1.5rem; line-height: 1.5;">Get instant updates about:</p>
            <div style="text-align: left; margin-bottom: 1.5rem;">
              <div style="margin-bottom: 0.5rem;">📋 Leave request updates</div>
              <div style="margin-bottom: 0.5rem;">💰 Salary slip notifications</div>
              <div style="margin-bottom: 0.5rem;">📢 Important announcements</div>
              <div style="margin-bottom: 0.5rem;">🕐 Meeting reminders</div>
            </div>
            <div style="margin-top: 1.5rem;">
              <button id="enable-notifications" style="background: #007bff; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 6px; margin-right: 0.5rem; cursor: pointer; font-weight: 600;">Enable Notifications</button>
              <button id="maybe-later" style="background: #6c757d; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 6px; cursor: pointer;">Maybe Later</button>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      document.getElementById('enable-notifications').onclick = async () => {
        document.body.removeChild(modal);
        const granted = await this.requestPermission();
        resolve(granted);
      };

      document.getElementById('maybe-later').onclick = () => {
        document.body.removeChild(modal);
        resolve(false);
      };
    });
  }
}

export default new NotificationService();