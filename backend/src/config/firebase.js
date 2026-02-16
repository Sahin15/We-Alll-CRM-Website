import admin from 'firebase-admin';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin SDK
const initializeFirebase = async () => {
  try {
    if (!admin.apps.length) {
      let serviceAccount;
      
      // Option 1: Using environment variable (recommended for production)
      if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      } 
      // Option 2: Using individual environment variables
      else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
        serviceAccount = {
          type: "service_account",
          project_id: process.env.FIREBASE_PROJECT_ID,
          private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
          private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          client_email: process.env.FIREBASE_CLIENT_EMAIL,
          client_id: process.env.FIREBASE_CLIENT_ID,
          auth_uri: "https://accounts.google.com/o/oauth2/auth",
          token_uri: "https://oauth2.googleapis.com/token",
          auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
          client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`
        };
      }
      // Option 3: Using service account file (for development)
      else {
        try {
          const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || path.join(__dirname, '../../firebase-service-account.json');
          
          // Read the file using dynamic import for ES modules
          const { readFileSync } = await import('fs');
          const serviceAccountData = readFileSync(serviceAccountPath, 'utf8');
          serviceAccount = JSON.parse(serviceAccountData);
          
          console.log('✅ Firebase service account loaded from file');
        } catch (error) {
          console.log('⚠️ Firebase service account file not found. Notifications will be disabled.');
          console.log('📁 Looking for file at:', process.env.FIREBASE_SERVICE_ACCOUNT_PATH || path.join(__dirname, '../../firebase-service-account.json'));
          console.log('🔍 Error details:', error.message);
          return;
        }
      }

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id
      });

      console.log('✅ Firebase Admin initialized successfully');
    }
  } catch (error) {
    console.error('❌ Firebase Admin initialization failed:', error.message);
    console.log('⚠️ Push notifications will be disabled');
  }
};

// Initialize Firebase
initializeFirebase().catch(console.error);

export default admin;