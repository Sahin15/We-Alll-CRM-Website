import { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import notificationService from '../../services/notificationService';

const NotificationInitializer = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (user && notificationService.isNotificationSupported()) {
      initializeNotifications();
    }
  }, [user]);

  const initializeNotifications = async () => {
    try {
      const permission = notificationService.getPermissionStatus();
      
      if (permission === 'default') {
        // Show custom permission prompt after 3 seconds
        setTimeout(() => {
          notificationService.showPermissionPrompt();
        }, 3000);
      } else if (permission === 'granted' && !notificationService.isServiceInitialized()) {
        // Initialize messaging if already granted and not initialized
        await notificationService.initializeMessaging();
      }
    } catch (error) {
      console.error('Error initializing notifications:', error);
    }
  };

  // This component doesn't render anything
  return null;
};

export default NotificationInitializer;