import { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import notificationService from '../../services/notificationService';

const NotificationInitializer = () => {
  const { user } = useAuth();

  useEffect(() => {
    // Add delay and safety checks for iOS
    const timer = setTimeout(() => {
      try {
        if (user && notificationService && notificationService.isNotificationSupported()) {
          initializeNotifications();
        }
      } catch (error) {
        console.error('Error in notification initializer:', error);
        // Silently fail - don't block app
      }
    }, 2000); // Wait 2 seconds after user is loaded

    return () => clearTimeout(timer);
  }, [user]);

  const initializeNotifications = async () => {
    try {
      const permission = notificationService.getPermissionStatus();
      
      if (permission === 'default') {
        // Show custom permission prompt after 3 seconds
        setTimeout(() => {
          try {
            notificationService.showPermissionPrompt();
          } catch (error) {
            console.error('Error showing permission prompt:', error);
          }
        }, 3000);
      } else if (permission === 'granted' && !notificationService.isServiceInitialized()) {
        // Initialize messaging if already granted and not initialized
        await notificationService.initializeMessaging();
      }
    } catch (error) {
      console.error('Error initializing notifications:', error);
      // Silently fail - don't block app
    }
  };

  // This component doesn't render anything
  return null;
};

export default NotificationInitializer;