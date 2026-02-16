// Firebase Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Initialize Firebase in the service worker
firebase.initializeApp({
  apiKey: "AIzaSyA10c-WeEJTJNq8eCUgFuw1SVqtadRLP20",
  authDomain: "we-alll-office.firebaseapp.com",
  projectId: "we-alll-office",
  storageBucket: "we-alll-office.firebasestorage.app",
  messagingSenderId: "1039568040557",
  appId: "1:1039568040557:web:da336859b30c4073b78564"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('📱 Received background message:', payload);

  const notificationTitle = payload.notification?.title || 'New Notification';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new notification',
    icon: payload.notification?.icon || '/favicon.ico',
    badge: '/badge-icon.png',
    tag: payload.data?.tag || 'general',
    data: payload.data,
    requireInteraction: payload.data?.requireInteraction === 'true',
    actions: [
      {
        action: 'open',
        title: 'Open App',
        icon: '/icons/open-icon.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icons/dismiss-icon.png'
      }
    ]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Notification clicked:', event);
  
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  // Get click action from notification data
  const clickAction = event.notification.data?.clickAction || '/';
  const fullUrl = self.location.origin + clickAction;
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if app is already open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          // Navigate to the specific page
          client.postMessage({
            type: 'NOTIFICATION_CLICK',
            url: clickAction,
            data: event.notification.data
          });
          return;
        }
      }
      
      // Open new window if app is not open
      if (clients.openWindow) {
        return clients.openWindow(fullUrl);
      }
    })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('🔔 Notification closed:', event.notification.tag);
});