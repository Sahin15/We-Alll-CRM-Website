// Firebase Cloud Messaging Service Worker
// Uses compat SDK — must match the Firebase project config exactly
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyD9_5d29l8tbde_1E4qJ08kwXczHxuS9ak',
  authDomain: 'wealll-office.firebaseapp.com',
  projectId: 'wealll-office',
  storageBucket: 'wealll-office.firebasestorage.app',
  messagingSenderId: '148208749075',
  appId: '1:148208749075:web:6dd10472b2656e03a4cde6',
  measurementId: 'G-6KXKBSJ9C5',
});

const messaging = firebase.messaging();
let vapidKey = null;

// Receive VAPID key from main app; support skipWaiting for deploy updates
self.addEventListener('message', (event) => {
  if (!event.data) return;
  if (event.data.type === 'SET_VAPID_KEY') {
    vapidKey = event.data.vapidKey;
  }
  if (event.data.type === 'SKIP_WAITING' && self.skipWaiting) {
    self.skipWaiting();
  }
});

// Background message handler — fires when app is closed or tab is not focused
messaging.onBackgroundMessage((payload) => {
  const show = async () => {
    if (!self.registration) return;

    const title = payload.notification?.title || payload.data?.title || 'New Notification';
    const body = payload.notification?.body || payload.data?.body || '';
    const icon = payload.notification?.icon || payload.data?.icon || '/favicon.ico';
    const badge = payload.notification?.badge || payload.data?.badge || '/favicon.ico';
    const actionUrl = payload.data?.actionUrl || '/';
    const tag = payload.data?.type || 'crm-notification';

    const notificationOptions = {
      body,
      icon,
      badge,
      tag,
      data: { ...payload.data, actionUrl },
      requireInteraction: true,
      vibrate: [200, 100, 200],
      actions: [
        { action: 'open', title: 'Open' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
      silent: false,
      timestamp: Date.now(),
      dir: 'auto',
    };

    try {
      await self.registration.showNotification(title, notificationOptions);
    } catch {
      await self.registration.showNotification(title, {
        body,
        icon,
        badge,
        tag,
        data: { ...payload.data, actionUrl },
        requireInteraction: true,
      });
    }
  };

  // Never reject — Chrome treats a rejected SW message as an uncaught promise
  return Promise.resolve(show()).catch(() => undefined);
});

// Notification click — open or focus the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  if (action === 'dismiss') {
    return;
  }

  const urlToOpen = event.notification.data?.actionUrl || '/';
  const notificationId = event.notification.data?.notificationId;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If app is already open, focus it and navigate
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          // Post message to app to navigate and mark as read
          client.postMessage({ 
            type: 'NOTIFICATION_CLICK', 
            url: urlToOpen,
            notificationId: notificationId,
          });
          return;
        }
      }
      // App not open — open a new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Notification close event
self.addEventListener('notificationclose', (event) => {
  // Handle notification close if needed
});

// Service worker activation
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Service worker installation
self.addEventListener('install', (event) => {
  // Installation handler
});
