import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let messaging = null;
let firebaseInitialized = false;

// Guard: only initialize once
if (!admin.apps.length) {
  try {
    // Accept any of these filenames — newest key takes priority
    const candidatePaths = [
      path.join(__dirname, '../../firebase-service-account.json'),
      path.join(__dirname, '../../wealll-office-firebase-adminsdk-fbsvc-0ab1fbd631.json'),
    ];

    const serviceAccountPath = candidatePaths.find(p => fs.existsSync(p));

    if (serviceAccountPath) {
      console.log('[Firebase] Loading service account from:', serviceAccountPath);
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL || undefined,
      });

      firebaseInitialized = true;
      console.log('[Firebase] ✅ Firebase Admin initialized with service account');
    } else {
      // Fallback: env vars (only if all required vars are present and look valid)
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

      if (projectId && clientEmail && privateKey && privateKey.includes('BEGIN PRIVATE KEY')) {
        console.log('[Firebase] Loading service account from environment variables');
        admin.initializeApp({
          credential: admin.credential.cert({
            type: 'service_account',
            project_id: projectId,
            private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
            private_key: privateKey,
            client_email: clientEmail,
            client_id: process.env.FIREBASE_CLIENT_ID,
            auth_uri: 'https://accounts.google.com/o/oauth2/auth',
            token_uri: 'https://oauth2.googleapis.com/token',
            auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
          }),
          databaseURL: process.env.FIREBASE_DATABASE_URL || undefined,
        });

        firebaseInitialized = true;
        console.log('[Firebase] ✅ Firebase Admin initialized with environment variables');
      } else {
        console.error('[Firebase] ❌ Firebase initialization failed: No service account file and incomplete env vars');
        console.error('[Firebase] Missing:', {
          serviceAccountFile: !serviceAccountPath,
          projectId: !projectId,
          clientEmail: !clientEmail,
          privateKey: !privateKey,
        });
      }
    }
  } catch (error) {
    console.error('[Firebase] ❌ Firebase initialization error:', error.message);
  }
}

// Get messaging instance after initialization
if (firebaseInitialized && admin.apps.length > 0) {
  try {
    messaging = admin.messaging();
  } catch (error) {
    console.error('[Firebase] ❌ Error getting messaging instance:', error.message);
  }
}

// Safe wrapper for messaging that prevents "app does not exist" errors
const getMessaging = () => {
  if (!firebaseInitialized || !admin.apps.length) {
    console.warn('[Firebase] ⚠️  Firebase not initialized, returning null for messaging');
    return null;
  }
  try {
    return admin.messaging();
  } catch (error) {
    console.error('[Firebase] ❌ Error getting messaging instance:', error.message);
    return null;
  }
};

export { messaging, admin, firebaseInitialized, getMessaging };
