import { initializeApp } from 'firebase/app';
import { getMessaging, isSupported } from 'firebase/messaging';

// Firebase configuration
const firebaseConfig = {
  apiKey: 'AIzaSyD9_5d29l8tbde_1E4qJ08kwXczHxuS9ak',
  authDomain: 'wealll-office.firebaseapp.com',
  projectId: 'wealll-office',
  storageBucket: 'wealll-office.firebasestorage.app',
  messagingSenderId: '148208749075',
  appId: '1:148208749075:web:6dd10472b2656e03a4cde6',
  measurementId: 'G-6KXKBSJ9C5',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// messaging is resolved lazily — use getMessagingInstance() instead of importing messaging directly
let _messaging = null;

export const getMessagingInstance = async () => {
  if (_messaging) return _messaging;
  try {
    const supported = await isSupported();
    if (supported) {
      _messaging = getMessaging(app);
      console.log('[FIREBASE] ✅ Cloud Messaging initialized');
    } else {
      console.log('[FIREBASE] ⚠️  Cloud Messaging not supported in this browser');
    }
  } catch (err) {
    console.log('[FIREBASE] ⚠️  Could not initialize Cloud Messaging:', err.message);
  }
  return _messaging;
};

// Keep legacy export for backward compat — will be null until getMessagingInstance() is called
export { app };
export const messaging = null; // deprecated: use getMessagingInstance()
