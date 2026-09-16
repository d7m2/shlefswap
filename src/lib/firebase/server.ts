// src/lib/firebase/server.ts
import admin from 'firebase-admin';
import { getApps, App as AdminApp } from 'firebase-admin/app'; // Import App type for clarity

const serviceAccountJsonString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

let adminApp: AdminApp | null = null;
let dbAdmin: admin.firestore.Firestore | null = null;
let authAdmin: admin.auth.Auth | null = null;
let storageAdmin: admin.storage.Storage | null = null;

if (serviceAccountJsonString) {
  try {
    const serviceAccount = JSON.parse(serviceAccountJsonString) as admin.ServiceAccount;
    adminApp = getApps()[0] ?? admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    dbAdmin = admin.firestore(adminApp);
    authAdmin = admin.auth(adminApp);
    storageAdmin = admin.storage(adminApp);
    console.log('Firebase Admin SDK initialized successfully via server.ts.');
  } catch (error) {
    console.error(
      'Failed to initialize Firebase Admin SDK from FIREBASE_SERVICE_ACCOUNT_KEY:',
      error instanceof Error ? error.message : String(error)
    );
  }
} else {
  console.warn(
    'FIREBASE_SERVICE_ACCOUNT_KEY is not set. Admin SDK is disabled; ' +
      '/api routes will use fallback/sample data.'
  );
}

export { dbAdmin, authAdmin, storageAdmin, admin };