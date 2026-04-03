import { useState, useEffect } from 'react';
import api from '../services/api';

const NotificationDiagnostics = () => {
  const [diagnostics, setDiagnostics] = useState({
    browserSupport: {},
    serviceWorker: {},
    firebase: {},
    fcmToken: {},
    backendStatus: {},
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const runDiagnostics = async () => {
      const results = {
        browserSupport: {},
        serviceWorker: {},
        firebase: {},
        fcmToken: {},
        backendStatus: {},
      };

      // 1. Browser Support
      results.browserSupport.notificationAPI = 'Notification' in window;
      results.browserSupport.serviceWorkerAPI = 'serviceWorker' in navigator;
      results.browserSupport.pushManager = 'PushManager' in window;
      results.browserSupport.https = window.location.protocol === 'https:' || window.location.hostname === 'localhost';
      results.browserSupport.notificationPermission = Notification.permission;

      // 2. Service Worker
      if ('serviceWorker' in navigator) {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          results.serviceWorker.registered = registrations.length > 0;
          results.serviceWorker.count = registrations.length;
          results.serviceWorker.scopes = registrations.map(r => r.scope);
          
          if (navigator.serviceWorker.controller) {
            results.serviceWorker.controller = 'Active';
          } else {
            results.serviceWorker.controller = 'Not active';
          }
        } catch (err) {
          results.serviceWorker.error = err.message;
        }
      }

      // 3. Firebase
      try {
        const { getMessagingInstance } = await import('../config/firebaseConfig.js');
        const messaging = await getMessagingInstance();
        results.firebase.initialized = !!messaging;
        results.firebase.messaging = messaging ? 'Available' : 'Null';
      } catch (err) {
        results.firebase.error = err.message;
      }

      // 4. FCM Token
      try {
        const token = localStorage.getItem('fcmToken');
        results.fcmToken.stored = !!token;
        results.fcmToken.tokenLength = token ? token.length : 0;
        results.fcmToken.preview = token ? token.substring(0, 50) + '...' : 'None';
      } catch (err) {
        results.fcmToken.error = err.message;
      }

      // 5. Backend Status
      try {
        const response = await api.get('/health');
        results.backendStatus.reachable = true;
        results.backendStatus.status = response.data?.status;
      } catch (err) {
        results.backendStatus.reachable = false;
        results.backendStatus.error = err.message;
      }

      setDiagnostics(results);
      setLoading(false);
    };

    runDiagnostics();
  }, []);

  const sendTestNotification = async () => {
    try {
      // Get user from localStorage (stored as JSON string)
      const userStr = localStorage.getItem('user');
      let userId = null;
      
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          userId = user._id;
        } catch (parseErr) {
          console.error('[Diagnostics] Error parsing user from localStorage:', parseErr);
        }
      }
      
      console.log('[Diagnostics] Sending test notification to user:', userId);
      
      if (!userId) {
        alert('❌ Error: User ID not found. Please log in again.');
        console.error('[Diagnostics] userId is null/undefined');
        return;
      }

      console.log('[Diagnostics] Making API request to /notifications/send');
      const response = await api.post('/notifications/send', {
        recipientId: userId,
        title: 'Test Notification',
        body: 'This is a test notification from diagnostics',
        type: 'general',
      });
      
      console.log('[Diagnostics] ✅ API response received:', response.data);
      alert('✅ Test notification sent! Check your system notifications.');
    } catch (err) {
      console.error('[Diagnostics] ❌ Error sending test notification:', err);
      console.error('[Diagnostics] Error message:', err.message);
      console.error('[Diagnostics] Error response:', err.response?.data);
      alert('❌ Error sending test notification: ' + (err.response?.data?.message || err.message));
    }
  };

  if (loading) return <div>Loading diagnostics...</div>;

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', backgroundColor: '#f5f5f5' }}>
      <h1>🔍 Notification Diagnostics</h1>

      <section style={{ marginBottom: '20px', backgroundColor: 'white', padding: '15px', borderRadius: '5px' }}>
        <h2>Browser Support</h2>
        <pre>{JSON.stringify(diagnostics.browserSupport, null, 2)}</pre>
      </section>

      <section style={{ marginBottom: '20px', backgroundColor: 'white', padding: '15px', borderRadius: '5px' }}>
        <h2>Service Worker</h2>
        <pre>{JSON.stringify(diagnostics.serviceWorker, null, 2)}</pre>
      </section>

      <section style={{ marginBottom: '20px', backgroundColor: 'white', padding: '15px', borderRadius: '5px' }}>
        <h2>Firebase</h2>
        <pre>{JSON.stringify(diagnostics.firebase, null, 2)}</pre>
      </section>

      <section style={{ marginBottom: '20px', backgroundColor: 'white', padding: '15px', borderRadius: '5px' }}>
        <h2>FCM Token</h2>
        <pre>{JSON.stringify(diagnostics.fcmToken, null, 2)}</pre>
      </section>

      <section style={{ marginBottom: '20px', backgroundColor: 'white', padding: '15px', borderRadius: '5px' }}>
        <h2>Backend Status</h2>
        <pre>{JSON.stringify(diagnostics.backendStatus, null, 2)}</pre>
      </section>

      <button 
        onClick={sendTestNotification}
        style={{
          padding: '10px 20px',
          backgroundColor: '#4f46e5',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          fontSize: '16px',
        }}
      >
        📤 Send Test Notification
      </button>

      <div style={{ marginTop: '20px', backgroundColor: '#fff3cd', padding: '15px', borderRadius: '5px' }}>
        <h3>📋 Checklist:</h3>
        <ul>
          <li>✅ Browser Support: All should be true</li>
          <li>✅ Service Worker: Should be registered and active</li>
          <li>✅ Firebase: Should be initialized</li>
          <li>✅ FCM Token: Should be stored</li>
          <li>✅ Backend: Should be reachable</li>
        </ul>
      </div>

      <div style={{ marginTop: '20px', backgroundColor: '#d4edda', padding: '15px', borderRadius: '5px' }}>
        <h3>🔧 Troubleshooting:</h3>
        <ol>
          <li>Open DevTools (F12) → Application → Service Workers</li>
          <li>Check if service worker is registered and active</li>
          <li>Open DevTools → Console and look for [SW] logs</li>
          <li>Check Windows Settings → Notifications → App notifications</li>
          <li>Ensure browser has notification permission</li>
        </ol>
      </div>
    </div>
  );
};

export default NotificationDiagnostics;
