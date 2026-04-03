import { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import notificationService from '../../services/notificationService';

const NotificationInitializer = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Wait 3s after login before prompting — less intrusive
    const timer = setTimeout(async () => {
      try {
        if (!notificationService.isNotificationSupported()) {
          return;
        }

        const permission = notificationService.getPermissionStatus();

        if (permission === 'default') {
          // Ask user to enable push notifications
          await notificationService.showPermissionPrompt();
        } else if (permission === 'granted') {
          if (!notificationService.isServiceInitialized()) {
            // Already granted — silently initialize FCM
            await notificationService.initializeMessaging();
          }
        }
      } catch (err) {
        // Never block the app for notification errors
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [user]);

  return null;
};

export default NotificationInitializer;
