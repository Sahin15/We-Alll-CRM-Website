import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import api from './api';
import toast from '../utils/toast';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyD9_5d29l8tbde_1E4qJ08kwXczHxuS9ak',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'wealll-office.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'wealll-office',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'wealll-office.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '148208749075',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:148208749075:web:6dd10472b2656e03a4cde6',
};

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || '';

let _app = null;
let _messaging = null;
let _initPromise = null;

// Shared AudioContext — created only after a user gesture (browser autoplay policy)
let _audioCtx = null;
let _audioUnlocked = false;

const getAudioCtx = () => {
  if (!_audioUnlocked) return null;
  if (!_audioCtx) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (Ctor) _audioCtx = new Ctor();
  }
  return _audioCtx;
};

// Sound configurations matching NotificationSettings.jsx
const NOTIFICATION_SOUNDS = {
  bell_chime: {
    tones: [
      { freq: 523, duration: 0.25, delay: 0 },
      { freq: 659, duration: 0.25, delay: 0.15 },
    ],
  },
  digital_ping: {
    tones: [
      { freq: 800, duration: 0.15, delay: 0 },
      { freq: 1000, duration: 0.15, delay: 0.1 },
    ],
  },
  soft_chime: {
    tones: [{ freq: 440, duration: 0.4, delay: 0 }],
  },
  ascending_tones: {
    tones: [
      { freq: 440, duration: 0.15, delay: 0 },
      { freq: 523, duration: 0.15, delay: 0.12 },
      { freq: 659, duration: 0.15, delay: 0.24 },
    ],
  },
  melodic_alert: {
    tones: [
      { freq: 659, duration: 0.2, delay: 0 },
      { freq: 523, duration: 0.2, delay: 0.15 },
      { freq: 659, duration: 0.25, delay: 0.3 },
    ],
  },
  bright_ding: {
    tones: [
      { freq: 1046, duration: 0.2, delay: 0 },
      { freq: 784, duration: 0.2, delay: 0.15 },
    ],
  },
  subtle_beep: {
    tones: [{ freq: 600, duration: 0.1, delay: 0 }],
  },
};

// Get user's saved notification settings
const getNotificationSettings = () => {
  const sound = localStorage.getItem('notificationSound') || 'bell_chime';
  const volume = parseFloat(localStorage.getItem('notificationVolume') || '0.3');
  return { sound, volume };
};

// Play notification sound based on user settings.
// Silent no-op until AudioContext is unlocked by a user gesture.
export const playSound = async () => {
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const { sound, volume } = getNotificationSettings();
    const soundConfig = NOTIFICATION_SOUNDS[sound] || NOTIFICATION_SOUNDS.bell_chime;

    const playTone = (freq, startTime, duration, gainValue) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(gainValue, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    soundConfig.tones.forEach((tone) => {
      playTone(tone.freq, now + tone.delay, tone.duration, volume);
    });
  } catch {
    // Sound is optional — never block anything
  }
};

// Unlock AudioContext on first user interaction so sound works later
const unlockAudio = () => {
  try {
    _audioUnlocked = true;
    const ctx = getAudioCtx();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  } catch {
    // ignore
  }
  document.removeEventListener('click', unlockAudio);
  document.removeEventListener('keydown', unlockAudio);
  document.removeEventListener('touchstart', unlockAudio);
};
if (typeof document !== 'undefined') {
  document.addEventListener('click', unlockAudio, { once: true });
  document.addEventListener('keydown', unlockAudio, { once: true });
  document.addEventListener('touchstart', unlockAudio, { once: true });
}

const initializeFirebase = () => {
  if (_initPromise) return _initPromise;

  _initPromise = new Promise((resolve) => {
    const run = () => {
      try {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        const isStandalone = window.navigator.standalone === true;
        if (isIOS && isSafari && !isStandalone) { resolve(false); return; }
        if (typeof window === 'undefined' || !('indexedDB' in window)) { resolve(false); return; }

        _app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
        _messaging = getMessaging(_app);
        resolve(true);
      } catch (err) {
        resolve(false);
      }
    };

    if ('requestIdleCallback' in window) {
      requestIdleCallback(run, { timeout: 2000 });
    } else {
      setTimeout(run, 500);
    }
  });

  return _initPromise;
};

class NotificationService {
  constructor() {
    this.permission = typeof Notification !== 'undefined' ? Notification.permission : 'denied';
    this.fcmToken = null;
    this.isInitialized = false;
    // Set by NotificationContext to get instant bell updates on foreground push
    this.onForegroundMessage = null;
  }

  isNotificationSupported() {
    // iOS Safari (non-PWA) has no push support
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const isStandalone = window.navigator.standalone === true;
    if (isIOS && isSafari && !isStandalone) return false;

    // Check HTTPS (required for service workers on production)
    const host = window.location.hostname;
    const isLocalHost = host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
    const isHTTPS = window.location.protocol === 'https:' || isLocalHost;
    if (!isHTTPS) {
      // Quiet in local HTTP (e.g. 127.0.0.1) — expected; no console spam
      return false;
    }

    return (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      'serviceWorker' in navigator &&
      'PushManager' in window
    );
  }

  async requestPermission() {
    if (!this.isNotificationSupported()) {
      throw new Error('Push notifications are not supported in this browser');
    }
    const permission = await Notification.requestPermission();
    this.permission = permission;
    if (permission === 'granted') {
      await this.initializeMessaging();
      return true;
    } else if (permission === 'denied') {
      toast.error('Notifications blocked. Enable them in browser settings.');
      return false;
    }
    return false;
  }

  async initializeMessaging() {
    try {
      // Early exit if already initialized
      if (this.isInitialized && this.fcmToken) {
        return this.fcmToken;
      }
      
      const ready = await initializeFirebase();
      
      if (!ready || !_messaging) {
        return false;
      }
      
      if (!('serviceWorker' in navigator)) {
        return false;
      }

      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
        scope: '/',
      });

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;

      // Pass VAPID key to service worker
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SET_VAPID_KEY',
          vapidKey: VAPID_KEY,
        });
      }

      // Retry logic for token generation (Windows may need multiple attempts)
      let token = null;
      let retries = 0;
      const maxRetries = 3;

      while (!token && retries < maxRetries) {
        try {
          token = await getToken(_messaging, { vapidKey: VAPID_KEY });
          if (token) {
            break;
          }
        } catch (err) {
          retries++;
          if (retries < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }

      if (token) {
        this.fcmToken = token;
        this.isInitialized = true;
        await this.updateFCMToken(token);
        this.setupForegroundListener();
        this.setupServiceWorkerListener();
        return token;
      } else {
        return null;
      }
    } catch (err) {
      throw err;
    }
  }

  async updateFCMToken(token) {
    try {
      const response = await api.post('/notifications/register-token', {
        token,
        deviceName: navigator.userAgent.split(' ').slice(-1)[0] || 'Web',
        deviceType: 'web',
      });
    } catch (err) {
      throw err;
    }
  }

  setupForegroundListener() {
    if (!_messaging) return;

    onMessage(_messaging, (payload) => {
      // FCM can send notification-only, data-only, or both
      // Always fall back to data fields if notification object is missing
      const title = payload.notification?.title || payload.data?.title || 'New Notification';
      const body = payload.notification?.body || payload.data?.body || '';
      const icon = payload.notification?.icon || payload.data?.icon;
      const actionUrl = payload.data?.actionUrl;

      // Only play sound and show notification if there's actual notification content
      // Skip internal/data-only messages without title or body
      if (!payload.notification && !payload.data?.title && !payload.data?.body) {
        return;
      }

      // Play chime only for actual notifications
      playSound();

      // Show toast (always, even when tab is focused)
      toast.info(`${title}${body ? ': ' + body : ''}`, {
        autoClose: 6000,
        onClick: () => { if (actionUrl) window.location.href = actionUrl; },
      });

      // Also show OS notification when tab is hidden
      if (document.hidden) {
        this.showBrowserNotification(title, body, icon, payload.data);
      }

      // Tell context to refresh bell immediately
      if (typeof this.onForegroundMessage === 'function') {
        this.onForegroundMessage(payload);
      }
    });
  }

  setupServiceWorkerListener() {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'NOTIFICATION_CLICK') {
        const url = event.data.url;
        if (url && url !== window.location.pathname) window.location.href = url;
      }
    });
  }

  showBrowserNotification(title, body, icon, data) {
    if (this.permission !== 'granted') return;
    try {
      const n = new Notification(title, {
        body,
        icon: icon || '/favicon.ico',
        badge: '/favicon.ico',
        tag: data?.type || 'general',
        data,
        requireInteraction: true, // Keep notification visible until user interacts
      });
      n.onclick = () => {
        window.focus();
        if (data?.actionUrl) window.location.href = data.actionUrl;
        n.close();
      };
      // Don't auto-close - let user dismiss it or Windows handle it
    } catch { /* blocked */ }
  }

  async playSound() { await playSound(); }

  getPermissionStatus() {
    return typeof Notification !== 'undefined' ? Notification.permission : 'denied';
  }
  getFCMToken() { return this.fcmToken; }
  isServiceInitialized() { return this.isInitialized; }

  // Helper methods for specific notification types
  async sendFollowUpNotification(followUpType, leadName, scheduledDate) {
    const title = `Follow-up Reminder: ${followUpType}`;
    const body = `Scheduled for ${leadName} on ${new Date(scheduledDate).toLocaleDateString()}`;
    this.showBrowserNotification(title, body, '/favicon.ico', { type: 'follow_up_reminder' });
  }

  async sendCommentNotification(itemTitle, commenterName, commentPreview) {
    const title = `New Comment on ${itemTitle}`;
    const body = `${commenterName}: ${commentPreview.substring(0, 50)}...`;
    this.showBrowserNotification(title, body, '/favicon.ico', { type: 'comment_notification' });
  }

  async sendMentionNotification(itemTitle, mentionerName) {
    const title = `You were mentioned in ${itemTitle}`;
    const body = `${mentionerName} mentioned you in a comment`;
    this.showBrowserNotification(title, body, '/favicon.ico', { type: 'mention_notification' });
  }

  showPermissionPrompt() {
    return new Promise((resolve) => {
      if (this.getPermissionStatus() === 'granted') { resolve(true); return; }

      const overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif';
      overlay.innerHTML = `
        <div style="background:white;padding:2rem;border-radius:12px;max-width:400px;width:90%;text-align:center;box-shadow:0 20px 40px rgba(0,0,0,0.15)">
          <div style="font-size:3rem;margin-bottom:1rem">🔔</div>
          <h3 style="margin:0 0 0.75rem;color:#1a1a2e;font-size:1.25rem">Enable Notifications</h3>
          <p style="color:#666;margin-bottom:1.25rem;line-height:1.5;font-size:0.9rem">Get instant alerts for work assignments, leave updates, meetings and more.</p>
          <div style="display:flex;gap:0.75rem;justify-content:center">
            <button id="notif-allow" style="background:#4f46e5;color:white;border:none;padding:0.65rem 1.5rem;border-radius:8px;cursor:pointer;font-weight:600;font-size:0.95rem">Enable</button>
            <button id="notif-later" style="background:#f3f4f6;color:#374151;border:none;padding:0.65rem 1.5rem;border-radius:8px;cursor:pointer;font-size:0.95rem">Later</button>
          </div>
        </div>`;

      document.body.appendChild(overlay);
      overlay.querySelector('#notif-allow').onclick = async () => {
        document.body.removeChild(overlay);
        resolve(await this.requestPermission());
      };
      overlay.querySelector('#notif-later').onclick = () => {
        document.body.removeChild(overlay);
        resolve(false);
      };
    });
  }
}

export default new NotificationService();
